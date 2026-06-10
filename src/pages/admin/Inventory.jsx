import { useState, useEffect } from 'react';
import { dbGetProducts, dbUpdateProduct } from '../../services/firebase/db';
import { formatCurrency } from '../../utils/formatCurrency';
import { AlertTriangle, ArrowUp, Search } from 'lucide-react';
import { showModal, showPrompt } from '../../services/ui/modal';

export const Inventory = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchInventory = async () => {
    try {
      const data = await dbGetProducts();
      setProducts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
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

    try {
      await dbUpdateProduct(product.id, {
        [field]: (Number(product[field]) || 0) + parsedAmount,
      });
      await fetchInventory();
    } catch (err) {
      await showModal({
        title: "Restock Error",
        message: "Restock error: " + err.message,
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
          <p className="text-xs text-slate-500 font-medium">Verify carton stack volumes and trigger quick restocking adjustments.</p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
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
                  const isLow = p.stock < 100;
                  
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="py-4 px-4 font-bold text-slate-800">{p.name}</td>
                      <td className="py-4 px-4">
                        <span className="text-[10px] bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-full text-slate-600 font-semibold uppercase">
                          {p.category}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right text-slate-900 font-bold">{formatCurrency(p.cartonPrice)}</td>
                      <td className={`py-4 px-4 text-center font-mono font-bold text-sm ${isLow ? 'text-amber-600' : 'text-slate-900'}`}>
                        {p.stock} ctns
                      </td>
                      <td className="py-4 px-4 text-center font-mono font-bold text-sm text-slate-900">
                        {p.unitStock || 0} units
                      </td>
                      <td className="py-4 px-4 text-center">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-full text-[9px] font-bold">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                            Low Stock
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
