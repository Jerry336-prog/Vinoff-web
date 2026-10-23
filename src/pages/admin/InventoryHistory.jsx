import React, { useState, useEffect, useMemo, useContext, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { unwrapApiList } from '../../utils/apiResponse';
import ExportButton from '../../components/exports/ExportButton';
import { AuthContext } from '../../context/AuthContext';
import {
  History,
  Search,
  Filter,
  ArrowDownRight,
  ArrowUpRight,
  Package,
  Calendar,
  User,
  RefreshCw,
  ExternalLink,
  ArrowRight,
} from 'lucide-react';
import Button from '../../components/ui/Button';

export const InventoryHistory = () => {
  const { user } = useContext(AuthContext);
  const adminName =
    user?.name ||
    (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'System Administrator');
  const [historyItems, setHistoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'deduction', 'restock'

  const fetchHistory = useCallback(async (isInitial = false) => {
    if (isInitial) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const [ordersRes, invoicesRes, productsRes, activityRes] = await Promise.all([
        api.get('/api/orders?limit=100').catch(() => ({ data: [] })),
        api.get('/api/invoices?limit=100').catch(() => ({ data: [] })),
        api.get('/api/products?limit=100').catch(() => ({ data: [] })),
        api.get('/api/admin/activity?targetType=Product&limit=100').catch(() => ({ data: [] })),
      ]);

      const rawOrders = unwrapApiList(ordersRes);
      const rawInvoices = unwrapApiList(invoicesRes);
      const rawProducts = unwrapApiList(productsRes);
      const rawActivities = unwrapApiList(activityRes);

      // Map products by ID and normalized name for stock lookup
      const itemsMap = new Map();
      const itemsByNameMap = new Map();
      (Array.isArray(rawProducts) ? rawProducts : []).forEach((p) => {
        const id = p._id || p.id;
        if (id) itemsMap.set(String(id), p);
        if (p.name) itemsByNameMap.set(p.name.trim().toLowerCase(), p);
      });

      // Map Order ID / Order Number -> Invoice for direct invoice navigation
      const orderToInvoiceMap = new Map();
      (Array.isArray(rawInvoices) ? rawInvoices : []).forEach((inv) => {
        const linkedOrderId = inv.order?._id || inv.order?.id || inv.order;
        const linkedOrderNumber = inv.order?.orderNumber;
        if (linkedOrderId) {
          orderToInvoiceMap.set(String(linkedOrderId), inv);
        }
        if (linkedOrderNumber) {
          orderToInvoiceMap.set(String(linkedOrderNumber), inv);
        }
      });

      const movements = [];

      // Helper to normalize product name (strip trailing (CTN)/(Pieces))
      const cleanProductName = (rawName = '') =>
        String(rawName).replace(/\s*\((CTN|Pieces|ctn|pieces|Units|units)\)\s*$/i, '').trim();

      // Helper to determine if an item is loose units vs cartons
      const isLooseUnitItem = (item) =>
        item.isCarton === false ||
        item.unitType === 'pieces' ||
        item.unitType === 'units' ||
        item.unitType === 'loose units' ||
        item.unit === 'pieces' ||
        item.unit === 'units' ||
        /\((pieces|units)\)/i.test(item.name || item.description || '');

      // 1. Process Customer Orders -> Stock Deductions
      (Array.isArray(rawOrders) ? rawOrders : []).forEach((order) => {
        // Cancelled orders do not represent active stock deductions if cancelled
        const orderMongoId = String(order._id || order.id || '');
        const orderRef = order.orderNumber || orderMongoId;
        const linkedInvoice =
          orderToInvoiceMap.get(orderMongoId) || orderToInvoiceMap.get(String(orderRef));
        const targetInvoiceId =
          linkedInvoice?._id || linkedInvoice?.id || order.invoiceId || orderMongoId || orderRef;
        const invoiceNumber = linkedInvoice?.invoiceNumber || null;

        const customerName =
          order.customerName ||
          (order.customer?.firstName
            ? `${order.customer.firstName} ${order.customer.lastName || ''}`.trim()
            : order.customer?.name) ||
          'Commercial Buyer';
        const date = order.createdAt || order.date || new Date().toISOString();

        if (Array.isArray(order.items)) {
          order.items.forEach((item, idx) => {
            const rawProdId = item.product?._id || item.product?.id || item.product || item.productId;
            const cleanedName = cleanProductName(item.name || item.description || '');
            const prod =
              (rawProdId && itemsMap.get(String(rawProdId))) ||
              itemsByNameMap.get(cleanedName.toLowerCase());
            const resolvedProductId = String(prod?._id || prod?.id || rawProdId || cleanedName);

            const isUnits = isLooseUnitItem(item);
            const qty = Math.abs(Number(item.quantity) || 1);

            movements.push({
              id: `deduction-order-${orderMongoId || orderRef}-${item._id || idx}`,
              timestamp: date,
              productId: resolvedProductId,
              productName: cleanedName || prod?.name || 'Commercial Product',
              category: prod?.category || item.category || 'General',
              type: 'deduction',
              change: -qty,
              unitType: isUnits ? 'units' : 'cartons',
              actorName: customerName,
              orderRef: String(orderRef),
              orderId: orderMongoId,
              invoiceId: String(targetInvoiceId),
              invoiceNumber,
              previousStock: item.previousStock != null ? Number(item.previousStock) : null,
              newStock: item.newStock != null ? Number(item.newStock) : null,
              notes: `Order #${orderRef}${invoiceNumber ? ` (Invoice #${invoiceNumber})` : ''} placed by ${customerName}`,
            });
          });
        }
      });

      // 2. Process Standalone Custom Invoices (not linked to an order) that deducted product stock
      (Array.isArray(rawInvoices) ? rawInvoices : []).forEach((inv) => {
        if (inv.order) return; // Already accounted for via order
        const invMongoId = String(inv._id || inv.id || '');
        const invNumber = inv.invoiceNumber || invMongoId;
        const customerName =
          inv.customer?.firstName
            ? `${inv.customer.firstName} ${inv.customer.lastName || ''}`.trim()
            : inv.customer?.name || 'Commercial Buyer';
        const date = inv.createdAt || new Date().toISOString();

        if (Array.isArray(inv.items)) {
          inv.items.forEach((item, idx) => {
            const rawProdId = item.product?._id || item.product?.id || item.product || item.productId;
            const cleanedName = cleanProductName(item.description || item.name || '');
            const prod =
              (rawProdId && itemsMap.get(String(rawProdId))) ||
              itemsByNameMap.get(cleanedName.toLowerCase());

            if (!prod && !rawProdId) return;

            const resolvedProductId = String(prod?._id || prod?.id || rawProdId || cleanedName);
            const isUnits = isLooseUnitItem(item);
            const qty = Math.abs(Number(item.quantity) || 1);

            movements.push({
              id: `deduction-inv-${invMongoId}-${item._id || idx}`,
              timestamp: date,
              productId: resolvedProductId,
              productName: prod?.name || cleanedName || 'Commercial Product',
              category: prod?.category || 'General',
              type: 'deduction',
              change: -qty,
              unitType: isUnits ? 'units' : 'cartons',
              actorName: customerName,
              orderRef: String(invNumber),
              orderId: null,
              invoiceId: invMongoId,
              invoiceNumber: String(invNumber),
              previousStock: item.previousStock != null ? Number(item.previousStock) : null,
              newStock: item.newStock != null ? Number(item.newStock) : null,
              notes: `Invoice #${invNumber} issued to ${customerName}`,
            });
          });
        }
      });

      // 3. Process Restock Activity from localStorage & Backend ActivityLog
      let localRestocks = [];
      try {
        localRestocks = JSON.parse(localStorage.getItem('vinoff_restock_history') || '[]');
      } catch (e) {
        console.error(e);
      }

      const seenRestockKeys = new Set();

      if (Array.isArray(localRestocks) && localRestocks.length > 0) {
        localRestocks.forEach((r) => {
          const cleanedName = cleanProductName(r.productName || '');
          const prod = itemsByNameMap.get(cleanedName.toLowerCase());
          const resolvedProductId = String(prod?._id || prod?.id || cleanedName);
          const isUnits =
            r.unitType === 'loose units' || r.unitType === 'units' || r.unitType === 'pieces';
          const changeAmt = Number(r.change) || 0;
          if (changeAmt === 0) return;

          const dedupKey = `${resolvedProductId}:${isUnits ? 'units' : 'cartons'}:${changeAmt}:${Math.floor(
            new Date(r.timestamp || Date.now()).getTime() / 60000
          )}`;
          seenRestockKeys.add(dedupKey);

          movements.push({
            id: r.id || `restock-${Math.random()}`,
            timestamp: r.timestamp || new Date().toISOString(),
            productId: resolvedProductId,
            productName: prod?.name || r.productName || 'Catalog Product',
            category: prod?.category || r.category || 'General',
            type: changeAmt > 0 ? 'restock' : 'deduction',
            change: changeAmt,
            unitType: isUnits ? 'units' : 'cartons',
            actorName: r.actorName || adminName,
            orderRef: 'Restock Allocation',
            orderId: null,
            invoiceId: null,
            invoiceNumber: null,
            previousStock: r.previousStock != null ? Number(r.previousStock) : null,
            newStock: r.newStock != null ? Number(r.newStock) : null,
            notes: r.notes || 'Inventory restock addition',
          });
        });
      }

      // Also include backend ActivityLog stock adjustments (if any)
      (Array.isArray(rawActivities) ? rawActivities : []).forEach((act) => {
        const meta = act.metadata || {};
        const prodId = String(meta.productId || act.targetId || '');
        const prod = itemsMap.get(prodId);
        const actor =
          act.actor?.firstName
            ? `${act.actor.firstName} ${act.actor.lastName || ''}`.trim()
            : adminName;

        if (Number(meta.stockDelta) && Number(meta.stockDelta) !== 0) {
          const delta = Number(meta.stockDelta);
          const dedupKey = `${prodId}:cartons:${delta}:${Math.floor(
            new Date(act.createdAt || Date.now()).getTime() / 60000
          )}`;
          if (!seenRestockKeys.has(dedupKey)) {
            seenRestockKeys.add(dedupKey);
            movements.push({
              id: `activity-stock-${act._id}`,
              timestamp: act.createdAt || new Date().toISOString(),
              productId: prodId,
              productName: meta.productName || prod?.name || 'Catalog Product',
              category: meta.category || prod?.category || 'General',
              type: delta > 0 ? 'restock' : 'deduction',
              change: delta,
              unitType: 'cartons',
              actorName: actor,
              orderRef: 'Restock Allocation',
              orderId: null,
              invoiceId: null,
              invoiceNumber: null,
              previousStock: meta.previousStock != null ? Number(meta.previousStock) : null,
              newStock: meta.newStock != null ? Number(meta.newStock) : null,
              notes: act.description || 'Admin stock adjustment',
            });
          }
        }

        if (Number(meta.unitStockDelta) && Number(meta.unitStockDelta) !== 0) {
          const delta = Number(meta.unitStockDelta);
          const dedupKey = `${prodId}:units:${delta}:${Math.floor(
            new Date(act.createdAt || Date.now()).getTime() / 60000
          )}`;
          if (!seenRestockKeys.has(dedupKey)) {
            seenRestockKeys.add(dedupKey);
            movements.push({
              id: `activity-unitstock-${act._id}`,
              timestamp: act.createdAt || new Date().toISOString(),
              productId: prodId,
              productName: meta.productName || prod?.name || 'Catalog Product',
              category: meta.category || prod?.category || 'General',
              type: delta > 0 ? 'restock' : 'deduction',
              change: delta,
              unitType: 'units',
              actorName: actor,
              orderRef: 'Restock Allocation',
              orderId: null,
              invoiceId: null,
              invoiceNumber: null,
              previousStock: meta.previousUnitStock != null ? Number(meta.previousUnitStock) : null,
              newStock: meta.newUnitStock != null ? Number(meta.newUnitStock) : null,
              notes: act.description || 'Admin unit stock adjustment',
            });
          }
        }
      });

      // Sort newest first
      movements.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Compute running Before -> After stock balances anchored to current live product stock
      const runningStockTracker = new Map();
      movements.forEach((m) => {
        const prod =
          itemsMap.get(String(m.productId)) ||
          itemsByNameMap.get(String(m.productName || '').trim().toLowerCase());
        const isUnits = m.unitType === 'units';
        const liveStock = prod
          ? Number(isUnits ? prod.unitStock ?? 0 : prod.stock ?? prod.inventoryCount ?? 0)
          : null;
        m.currentLiveStock = liveStock;

        const key = `${m.productId || m.productName}:${m.unitType}`;
        if (!runningStockTracker.has(key) && liveStock !== null) {
          runningStockTracker.set(key, liveStock);
        }

        if (m.previousStock != null && m.newStock != null) {
          // Movement already has exact recorded snapshots; sync tracker to previousStock for older entries
          runningStockTracker.set(key, Number(m.previousStock));
        } else if (runningStockTracker.has(key)) {
          const afterStock = runningStockTracker.get(key);
          const beforeStock = Math.max(0, afterStock - Number(m.change || 0));
          m.newStock = afterStock;
          m.previousStock = beforeStock;
          runningStockTracker.set(key, beforeStock);
        }
      });

      setHistoryItems(movements);
    } catch (e) {
      console.error('Failed to fetch inventory history:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [adminName]);

  useEffect(() => {
    fetchHistory(true);

    // Live poll every 15 seconds while tab is visible so new orders appear automatically
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchHistory(false);
      }
    }, 15000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchHistory(false);
      }
    };

    const handleWindowFocus = () => fetchHistory(false);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [fetchHistory]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return historyItems.filter((item) => {
      const matchesSearch =
        !q ||
        item.productName.toLowerCase().includes(q) ||
        item.actorName.toLowerCase().includes(q) ||
        String(item.orderRef).toLowerCase().includes(q) ||
        String(item.invoiceNumber || '').toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);

      const matchesType = filterType === 'all' || item.type === filterType;

      return matchesSearch && matchesType;
    });
  }, [historyItems, searchQuery, filterType]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
            <History className="w-5 h-5 sm:w-6 sm:h-6 text-brand-green-700 shrink-0" />
            <span className="truncate">Inventory Stock Movement Log</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Live audit trail of stock reductions and restock allocations. Click an order reference to open its invoice.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchHistory(false)}
            disabled={refreshing}
            className="rounded-xl border-slate-200 text-xs px-3 py-1.5 whitespace-nowrap shrink-0"
            icon={RefreshCw}
          >
            {refreshing ? 'Syncing...' : 'Refresh'}
          </Button>
          <ExportButton kind="inventory-history" label="Export CSV" defaultFormat="csv" />
          <ExportButton kind="inventory-history" label="Export PDF" defaultFormat="pdf" />
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Search product, customer, Order # or Invoice #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-green-500 outline-none transition"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-xs text-slate-500 font-semibold shrink-0">Type:</span>
          <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                filterType === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All Logs
            </button>
            <button
              onClick={() => setFilterType('deduction')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                filterType === 'deduction'
                  ? 'bg-red-50 text-red-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Deductions
            </button>
            <button
              onClick={() => setFilterType('restock')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                filterType === 'restock'
                  ? 'bg-emerald-50 text-emerald-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Restocks
            </button>
          </div>
        </div>
      </div>

      {/* History Table */}
      {loading ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-3xl">
          <div className="w-8 h-8 border-4 border-brand-green-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 text-xs font-semibold mt-3">Compiling inventory audit logs...</p>
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 font-extrabold border-b border-slate-100 bg-slate-50 uppercase text-[10px] tracking-wider whitespace-nowrap">
                  <th className="py-3 px-3.5 whitespace-nowrap">Date &amp; Time</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Product Catalog Item</th>
                  <th className="py-3 px-3.5 text-center whitespace-nowrap">Movement Type</th>
                  <th className="py-3 px-3.5 text-center whitespace-nowrap">Quantity Change</th>
                  <th className="py-3 px-3.5 text-center whitespace-nowrap">Stock Level Update</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Customer / Admin Actor</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Order Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {filteredItems.map((item) => {
                  const isDeduction = item.type === 'deduction';
                  const targetInvoiceLinkId = item.invoiceId || item.orderId;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3.5 whitespace-nowrap text-slate-500">
                        <div className="flex items-center gap-2 font-mono text-[11px]">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <div className="flex flex-col leading-tight">
                            <span className="font-semibold text-slate-700">
                              {new Date(item.timestamp).toLocaleDateString()}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(item.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3.5 whitespace-nowrap font-bold text-slate-800">
                        <div className="text-xs leading-snug">{item.productName}</div>
                        <span className="text-[9px] bg-slate-100 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-semibold uppercase mt-0.5 inline-block whitespace-nowrap">
                          {item.category}
                        </span>
                      </td>

                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        {isDeduction ? (
                          <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap">
                            <ArrowDownRight className="w-3 h-3 text-red-600 shrink-0" />
                            Order Deduction
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap">
                            <ArrowUpRight className="w-3 h-3 text-emerald-600 shrink-0" />
                            Restock Addition
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3.5 text-center font-mono font-bold text-xs whitespace-nowrap">
                        <span className={isDeduction ? 'text-red-600' : 'text-emerald-600'}>
                          {item.change > 0 ? `+${item.change}` : item.change} {item.unitType}
                        </span>
                      </td>

                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        {item.previousStock != null && item.newStock != null ? (
                          <div className="inline-flex items-center justify-center">
                            <div className="inline-flex items-center gap-1 font-mono text-[11px] bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md whitespace-nowrap">
                              <span className="text-slate-500">{item.previousStock}</span>
                              <ArrowRight className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                              <span className="font-black text-slate-900">{item.newStock}</span>
                              <span className="text-[9px] text-slate-500 font-semibold">{item.unitType}</span>
                            </div>
                          </div>
                        ) : item.currentLiveStock != null ? (
                          <span className="font-mono text-[11px] text-slate-600 whitespace-nowrap">
                            {item.currentLiveStock} {item.unitType} remaining
                          </span>
                        ) : (
                          <span className="text-slate-400 whitespace-nowrap">—</span>
                        )}
                      </td>

                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs whitespace-nowrap">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{item.actorName}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {targetInvoiceLinkId ? (
                          <Link
                            to={`/admin/invoices/${targetInvoiceLinkId}`}
                            title={`Open invoice for ${item.orderRef}`}
                            className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-brand-green-700 hover:text-brand-green-900 bg-brand-green-50/70 hover:bg-brand-green-100/80 border border-brand-green-200 px-2 py-1 rounded-lg transition underline-offset-2 hover:underline whitespace-nowrap"
                          >
                            <span>{item.orderRef}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </Link>
                        ) : (
                          <span className="font-mono text-[11px] font-semibold text-slate-400 whitespace-nowrap">
                            {item.orderRef}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-3xl">
          <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700">No inventory history logs found</h3>
          <p className="text-xs text-slate-400 mt-1">
            Movement logs recorded when customers order or admins restock will appear here.
          </p>
        </div>
      )}
    </div>
  );
};

export default InventoryHistory;
