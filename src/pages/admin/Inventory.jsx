import { useState, useEffect, useContext } from 'react';
import api from '../../services/api';
import { unwrapApiList } from '../../utils/apiResponse';
import { createIdempotencyKey, withIdempotencyKey } from '../../services/idempotency';
import { formatCurrency } from '../../utils/formatCurrency';
import { AlertTriangle, ArrowUp, RefreshCw, Search } from 'lucide-react';
import { showModal, showPrompt } from '../../services/ui/modal';
import { AuthContext } from '../../context/AuthContext';

const LOW_STOCK_THRESHOLD = 100;

export const Inventory = () => {
  const { user } = useContext(AuthContext);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchInventory = async () => {
    setRefreshing(true);
    try {
      const res = await api.get('/api/products?limit=200');
      const items = unwrapApiList(res);
      const normalized = (Array.isArray(items) ? items : []).map(p => ({
        ...p,
        id: p._id || p.id,
        cartonPrice: p.wholesalePrice || p.price || 0,
        stock: p.stock ?? p.inventoryCount ?? 0,
        unitStock: p.unitStock ?? 0
      }));
      setProducts(normalized);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInventory();

    // Poll every 15 seconds when tab is visible
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') fetchInventory();
    }, 15000);

    // Refresh immediately whenever the tab becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') fetchInventory();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', fetchInventory);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', fetchInventory);
    };
  }, []);

  const handleRestock = async (product, field, label, defaultAmount = "50") => {
    const amount = await showPrompt({
      title: `Restock ${label}`,
      message: `Add ${label} to ${product.name}.`,
      inputLabel: `Number of ${label}`,
      inputType: "number",
      defaultValue: defaultAmount,
      okText: "Add Stock",
      validate: (value) => {
        const parsedValue = Number(value);
        if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
          return "Enter a whole number greater than zero.";
        }
        return "";
      },
    });
    if (amount === null) return;

    const parsedAmount = Number(amount);
    const newCount = (Number(product[field]) || 0) + parsedAmount;

    try {
      await api.patch(
        `/api/products/${product.id || product._id}`,
        { [field]: newCount },
        withIdempotencyKey(createIdempotencyKey(`restock-${product.id || product._id}-${field}`)),
      );

      // Record explicit restock movement in localStorage for Inventory History
      try {
        const existingRestocks = JSON.parse(localStorage.getItem('vinoff_restock_history') || '[]');
        const newLogItem = {
          id: createIdempotencyKey('restock-log'),
          timestamp: new Date().toISOString(),
          productName: product.name,
          category: product.category || 'General',
          type: 'restock',
          change: parsedAmount, // Exact amount added (e.g. 70)
          unitType: label === 'cartons' || field === 'stock' ? 'cartons' : 'loose units',
          actorName: user?.name || 'System Administrator',
          orderRef: 'N/A (Stock Restock)',
          orderId: null,
          notes: `Restocked +${parsedAmount} ${label} (was ${Number(product[field]) || 0}, now ${newCount})`,
          previousStock: Number(product[field]) || 0,
          newStock: newCount
        };
        existingRestocks.unshift(newLogItem);
        localStorage.setItem('vinoff_restock_history', JSON.stringify(existingRestocks));
      } catch (err) {
        console.error('Failed to record restock log:', err);
      }

      await fetchInventory();
    } catch (err) {
      await showModal({
        title: "Restock Error",
        message: "Restock error: " + (err.response?.data?.message || err.message),
        tone: "danger",
      });
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Wholesale Inventory Logistics</h2>
          <p className="text-xs text-slate-500 font-medium">Live product stock refreshes every 15 seconds and on tab focus. Orders reduce stock automatically.</p>
        </div>

        <div className="flex w-full sm:w-auto items-center gap-2">
          <button
            type="button"
            onClick={fetchInventory}
            disabled={refreshing}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-brand-green-600 ${refreshing ? 'animate-spin' : ''}`} />
            Sync
          </button>
          <div className="relative min-w-0 flex-1 sm:w-72">
            <input
              type="text"
              placeholder="Search stock catalog..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold focus:ring-2 focus:ring-brand-green-500 outline-none"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-500 animate-pulse text-xs font-semibold">Syncing inventory counts...</p>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 font-extrabold border-b border-slate-100 bg-slate-50">
                  <th className="py-3.5 px-4">Item Catalog Detail</th>
                  <th className="py-3.5 px-4">Warehouse Category</th>
                  <th className="py-3.5 px-4 text-right">Carton pricing</th>
                  <th className="py-3.5 px-4 text-center">Stack Level (Cartons)</th>
                  <th className="py-3.5 px-4 text-center">Loose Units</th>
                  <th className="py-3.5 px-4 text-center">Stock status</th>
                  <th className="py-3.5 px-4 text-center">Restock Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {filteredProducts.map(p => {
                  const isLowCartons = Number(p.stock) < LOW_STOCK_THRESHOLD;
                  const tracksLooseUnits = Boolean(p.trackUnitStock) || Number(p.unitStock) > 0;
                  const isLowUnits = tracksLooseUnits && Number(p.unitStock) < LOW_STOCK_THRESHOLD;
                  const isLow = isLowCartons || isLowUnits;
                  
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="py-4 px-4 font-bold text-slate-800">
                        {p.name}
                        {p.updatedByAdmin && (
                          <p className="text-[9px] text-slate-400 font-medium mt-0.5">
                            Last restocked by: <span className="font-bold text-slate-500">{p.updatedByAdmin}</span>
                          </p>
                        )}
                        {!p.updatedByAdmin && p.createdByAdmin && (
                          <p className="text-[9px] text-slate-400 font-medium mt-0.5">
                            Added by: <span className="font-bold text-slate-500">{p.createdByAdmin}</span>
                          </p>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-[10px] bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-full text-slate-600 font-semibold uppercase">
                          {p.category}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right text-slate-900 font-bold">{formatCurrency(p.cartonPrice)}</td>
                      <td className={`py-4 px-4 text-center font-mono font-bold text-sm ${isLowCartons ? 'text-amber-600' : 'text-slate-900'}`}>
                        {p.stock} ctns
                      </td>
                      <td className={`py-4 px-4 text-center font-mono font-bold text-sm ${isLowUnits ? 'text-amber-600' : 'text-slate-900'}`}>
                        {p.unitStock || 0} units
                      </td>
                      <td className="py-4 px-4 text-center">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-full text-[9px] font-bold">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                            {isLowCartons && isLowUnits ? 'Low Cartons & Units' : isLowCartons ? 'Low Cartons' : 'Low Units'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full text-[9px] font-bold">
                            Stock OK
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="inline-flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleRestock(p, 'stock', 'cartons')}
                            className="inline-flex items-center gap-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-brand-green-700 px-2.5 py-1.5 rounded-xl transition text-[10px] font-bold"
                          >
                            <ArrowUp className="w-3.5 h-3.5 text-brand-green-600" />
                            Cartons
                          </button>
                          <button
                            onClick={() => handleRestock(p, 'unitStock', 'loose units')}
                            className="inline-flex items-center gap-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-brand-green-700 px-2.5 py-1.5 rounded-xl transition text-[10px] font-bold"
                          >
                            <ArrowUp className="w-3.5 h-3.5 text-brand-green-600" />
                            Units
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};

export default Inventory;
