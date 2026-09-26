import React, { useState, useEffect, useMemo, useContext } from 'react';
import api from '../../services/api';
import { formatCurrency } from '../../utils/formatCurrency';
import { unwrapApiList } from '../../utils/apiResponse';
import { exportHistoryCSV, exportHistoryPDF } from '../../utils/exportHistory';
import { AuthContext } from '../../context/AuthContext';
import {
  History,
  Download,
  Search,
  Filter,
  ArrowDownRight,
  ArrowUpRight,
  Package,
  Calendar,
  User,
  FileSpreadsheet,
  RefreshCw,
  FileText,
} from 'lucide-react';
import Button from '../../components/ui/Button';

export const InventoryHistory = () => {
  const { user } = useContext(AuthContext);
  const adminName = user?.name || 'Jerry Admin';
  const [historyItems, setHistoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'deduction', 'restock'

  const fetchHistory = async () => {
    setLoading(true);
    try {
      // Fetch both orders (which deduce stock) and products/activities
      const [ordersRes, productsRes] = await Promise.all([
        api.get('/api/orders?limit=200').catch(() => ({ data: [] })),
        api.get('/api/products?limit=200').catch(() => ({ data: [] })),
      ]);

      const rawOrders = unwrapApiList(ordersRes);
      const rawProducts = unwrapApiList(productsRes);

      const itemsMap = new Map();
      (Array.isArray(rawProducts) ? rawProducts : []).forEach((p) => {
        const id = p._id || p.id;
        if (id) itemsMap.set(String(id), p);
      });

      const movements = [];

      // 1. Process Orders -> Deductions
      (Array.isArray(rawOrders) ? rawOrders : []).forEach((order) => {
        const orderId = order.orderNumber || order._id || order.id;
        const customerName =
          order.customerName ||
          (order.customer?.firstName
            ? `${order.customer.firstName} ${order.customer.lastName || ''}`.trim()
            : order.customer?.name) ||
          'Commercial Buyer';
        const date = order.createdAt || order.date || new Date().toISOString();

        if (Array.isArray(order.items)) {
          order.items.forEach((item) => {
            const prod = itemsMap.get(String(item.product?._id || item.product || item.productId));
            movements.push({
              id: `deduction-${orderId}-${item._id || item.name || Math.random()}`,
              timestamp: date,
              productName: item.name || prod?.name || 'Commercial Product',
              category: prod?.category || item.category || 'General',
              type: 'deduction',
              change: -(item.quantity || 1),
              unitType: item.isCarton === false ? 'units' : 'cartons',
              actorName: customerName,
              orderRef: orderId,
              orderId: order._id || order.id,
              notes: `Order #${orderId} created by ${customerName}`,
            });
          });
        }
      });

      // 2. Process Restock Activity / Product updates with explicit added amounts
      let localRestocks = [];
      try {
        localRestocks = JSON.parse(localStorage.getItem('vinoff_restock_history') || '[]');
      } catch (e) {
        console.error(e);
      }

      if (localRestocks.length > 0) {
        localRestocks.forEach((r) => {
          movements.push({
            id: r.id || `restock-${Math.random()}`,
            timestamp: r.timestamp || new Date().toISOString(),
            productName: r.productName || 'Catalog Product',
            category: r.category || 'General',
            type: 'restock',
            change: Number(r.change) || 0, // Amount added!
            unitType: r.unitType || 'cartons',
            actorName: r.actorName || adminName,
            orderRef: r.orderRef || 'N/A (Stock Restock)',
            orderId: null,
            notes: r.notes || `Inventory restock addition`,
          });
        });
      } else {
        (Array.isArray(rawProducts) ? rawProducts : []).forEach((prod) => {
          if (prod.updatedAt && prod.stock > 0) {
            movements.push({
              id: `restock-${prod._id || prod.id}`,
              timestamp: prod.updatedAt,
              productName: prod.name,
              category: prod.category || 'General',
              type: 'restock',
              change: prod.stock,
              unitType: 'cartons',
              actorName: prod.updatedByAdmin || prod.createdByAdmin || adminName,
              orderRef: 'N/A (Stock Restock)',
              orderId: null,
              notes: `Inventory restock allocation`,
            });
          }
        });
      }

      // Sort newest first
      movements.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setHistoryItems(movements);
    } catch (e) {
      console.error('Failed to fetch inventory history:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const filteredItems = useMemo(() => {
    return historyItems.filter((item) => {
      const matchesSearch =
        item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.actorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(item.orderRef).toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType =
        filterType === 'all' || item.type === filterType;

      return matchesSearch && matchesType;
    });
  }, [historyItems, searchQuery, filterType]);

  // Export CSV Report
  const handleExportCSV = () => {
    if (filteredItems.length === 0) return;

    const headers = [
      'Date & Time',
      'Product Name',
      'Category',
      'Movement Type',
      'Stock Change',
      'Unit Type',
      'Actor / Customer',
      'Order Reference',
      'Notes',
    ];

    const rows = filteredItems.map((item) => [
      new Date(item.timestamp).toLocaleString(),
      item.productName,
      item.category,
      item.type === 'deduction' ? 'Stock Deduction (Order)' : 'Restock Addition',
      item.change > 0 ? `+${item.change}` : item.change,
      item.unitType,
      item.actorName,
      item.orderRef,
      item.notes,
    ]);

    exportHistoryCSV(
      `vinoff_inventory_history_${new Date().toISOString().slice(0, 10)}`,
      headers,
      rows
    );
  };

  // Export PDF Report
  const handleExportPDF = () => {
    if (filteredItems.length === 0) return;

    const headers = [
      'Date & Time',
      'Product',
      'Category',
      'Type',
      'Change',
      'Actor / Customer',
      'Order Ref',
    ];

    const rows = filteredItems.map((item) => [
      new Date(item.timestamp).toLocaleString(),
      item.productName,
      item.category,
      item.type === 'deduction' ? 'Deduction' : 'Restock',
      `${item.change > 0 ? '+' : ''}${item.change} ${item.unitType}`,
      item.actorName,
      item.orderRef,
    ]);

    exportHistoryPDF(
      'Inventory Stock Movement Audit Log',
      `vinoff_inventory_history_${new Date().toISOString().slice(0, 10)}`,
      headers,
      rows
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
            <History className="w-6 h-6 text-brand-green-700" />
            Inventory Stock Movement Log
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Complete audit trail showing which customer orders reduced stock, who ordered, and restock records.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchHistory}
            className="rounded-xl border-slate-200"
            icon={RefreshCw}
          >
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={filteredItems.length === 0}
            className="rounded-xl border-slate-200 text-slate-700"
            icon={FileSpreadsheet}
          >
            Download CSV
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleExportPDF}
            disabled={filteredItems.length === 0}
            className="rounded-xl shadow-sm"
            icon={Download}
          >
            Download PDF
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Search product, customer, or Order #..."
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
                <tr className="text-slate-400 font-extrabold border-b border-slate-100 bg-slate-50 uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-4">Date &amp; Time</th>
                  <th className="py-3.5 px-4">Product Catalog Item</th>
                  <th className="py-3.5 px-4 text-center">Movement Type</th>
                  <th className="py-3.5 px-4 text-center">Quantity Change</th>
                  <th className="py-3.5 px-4">Customer / Admin Actor</th>
                  <th className="py-3.5 px-4">Order Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {filteredItems.map((item) => {
                  const isDeduction = item.type === 'deduction';
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="py-4 px-4 whitespace-nowrap text-slate-500">
                        <div className="flex items-center gap-1.5 font-mono text-[11px]">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {new Date(item.timestamp).toLocaleString()}
                        </div>
                      </td>

                      <td className="py-4 px-4 font-bold text-slate-800">
                        <div>{item.productName}</div>
                        <span className="text-[9px] bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded-md font-semibold uppercase mt-0.5 inline-block">
                          {item.category}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-center">
                        {isDeduction ? (
                          <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-full text-[10px] font-bold">
                            <ArrowDownRight className="w-3.5 h-3.5 text-red-600" />
                            Order Deduction
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full text-[10px] font-bold">
                            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                            Restock Addition
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-center font-mono font-bold text-sm">
                        <span className={isDeduction ? 'text-red-600' : 'text-emerald-600'}>
                          {item.change > 0 ? `+${item.change}` : item.change} {item.unitType}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {item.actorName}
                        </div>
                      </td>

                      <td className="py-4 px-4 font-mono text-xs font-bold text-brand-green-800">
                        {item.orderRef}
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
          <p className="text-xs text-slate-400 mt-1">Movement logs recorded when customers order or admins restock will appear here.</p>
        </div>
      )}
    </div>
  );
};

export default InventoryHistory;
