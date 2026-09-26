import React, { useState, useEffect, useMemo, useContext } from 'react';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { unwrapApiList } from '../../utils/apiResponse';
import { exportHistoryCSV, exportHistoryPDF } from '../../utils/exportHistory';
import {
  ShieldAlert,
  Download,
  Search,
  Filter,
  Calendar,
  User,
  FileSpreadsheet,
  RefreshCw,
  Sliders,
  PackageCheck,
  FileText,
  UserCheck,
  Settings,
} from 'lucide-react';
import Button from '../../components/ui/Button';

export const AdminActivityHistory = () => {
  const { user } = useContext(AuthContext);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const fetchActivities = async () => {
    setLoading(true);
    try {
      // Fetch products, orders, and local activity log
      const [productsRes, ordersRes] = await Promise.all([
        api.get('/api/products?limit=200').catch(() => ({ data: [] })),
        api.get('/api/orders?limit=200').catch(() => ({ data: [] })),
      ]);

      const rawProducts = unwrapApiList(productsRes);
      const rawOrders = unwrapApiList(ordersRes);

      const logs = [];

      // 1. Local Restock Logs
      try {
        const localRestocks = JSON.parse(localStorage.getItem('vinoff_restock_history') || '[]');
        localRestocks.forEach((r) => {
          logs.push({
            id: r.id || `act-restock-${Math.random()}`,
            timestamp: r.timestamp || new Date().toISOString(),
            adminName: r.actorName || user?.name || 'Jerry Admin',
            category: 'Inventory Restock',
            action: `Restocked Product: ${r.productName}`,
            details: r.notes || `Added +${r.change} ${r.unitType || 'cartons'} to warehouse stock.`,
            severity: 'info',
          });
        });
      } catch (e) {
        console.error(e);
      }

      // 2. Product Catalog Log Entries
      (Array.isArray(rawProducts) ? rawProducts : []).forEach((prod) => {
        if (prod.createdAt) {
          logs.push({
            id: `act-prod-created-${prod._id || prod.id}`,
            timestamp: prod.createdAt,
            adminName: prod.createdByAdmin || user?.name || 'Jerry Admin',
            category: 'Product Catalog',
            action: `Catalog Entry Created: ${prod.name}`,
            details: `Created product under '${prod.category || 'General'}' category.`,
            severity: 'success',
          });
        }
      });

      // 3. Invoice & Status Update Log Entries from Orders
      (Array.isArray(rawOrders) ? rawOrders : []).forEach((ord) => {
        const orderRef = ord.orderNumber || ord._id || ord.id;
        if (ord.updatedAt && ord.status !== 'pending') {
          logs.push({
            id: `act-order-status-${ord._id || ord.id}`,
            timestamp: ord.updatedAt,
            adminName: ord.processedBy || user?.name || 'Jerry Admin',
            category: 'Order Status & Invoice',
            action: `Order Status Updated: #${orderRef}`,
            details: `Order status set to '${ord.status}'. Invoice generated & logged.`,
            severity: 'info',
          });
        }
      });

      // Sort newest first
      logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setActivities(logs);
    } catch (e) {
      console.error('Failed to fetch admin activity history:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      const matchesSearch =
        act.adminName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        act.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        act.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
        act.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat =
        categoryFilter === 'all' ||
        act.category.toLowerCase().includes(categoryFilter.toLowerCase());

      return matchesSearch && matchesCat;
    });
  }, [activities, searchQuery, categoryFilter]);

  const handleExportCSV = () => {
    if (filteredActivities.length === 0) return;

    const headers = [
      'Date & Time',
      'Admin / Actor',
      'Category',
      'Action Description',
      'Details & Notes',
    ];

    const rows = filteredActivities.map((act) => [
      new Date(act.timestamp).toLocaleString(),
      act.adminName,
      act.category,
      act.action,
      act.details,
    ]);

    exportHistoryCSV(
      `vinoff_admin_activity_log_${new Date().toISOString().slice(0, 10)}`,
      headers,
      rows
    );
  };

  const handleExportPDF = () => {
    if (filteredActivities.length === 0) return;

    const headers = [
      'Date & Time',
      'Administrator',
      'Category',
      'Action Executed',
      'Log Details',
    ];

    const rows = filteredActivities.map((act) => [
      new Date(act.timestamp).toLocaleString(),
      act.adminName,
      act.category,
      act.action,
      act.details,
    ]);

    exportHistoryPDF(
      'Admin Activity & Audit Trail Log',
      `vinoff_admin_activity_log_${new Date().toISOString().slice(0, 10)}`,
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
            <ShieldAlert className="w-6 h-6 text-brand-green-700" />
            Admin Activity &amp; Audit Log History
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Security audit trail recording administrative logins, inventory restocks, price changes, and order status updates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchActivities}
            className="rounded-xl border-slate-200"
            icon={RefreshCw}
          >
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={filteredActivities.length === 0}
            className="rounded-xl border-slate-200 text-slate-700"
            icon={FileSpreadsheet}
          >
            Download CSV
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleExportPDF}
            disabled={filteredActivities.length === 0}
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
            placeholder="Search admin name, action, or details..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-green-500 outline-none transition"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-xs text-slate-500 font-semibold shrink-0">Category:</span>
          <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto text-[11px]">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1 rounded-lg font-bold transition ${
                categoryFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All Logs
            </button>
            <button
              onClick={() => setCategoryFilter('restock')}
              className={`px-3 py-1 rounded-lg font-bold transition ${
                categoryFilter === 'restock'
                  ? 'bg-emerald-50 text-emerald-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Restocks
            </button>
            <button
              onClick={() => setCategoryFilter('catalog')}
              className={`px-3 py-1 rounded-lg font-bold transition ${
                categoryFilter === 'catalog'
                  ? 'bg-blue-50 text-blue-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Catalog
            </button>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      {loading ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-3xl">
          <div className="w-8 h-8 border-4 border-brand-green-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 text-xs font-semibold mt-3">Compiling administrative audit trail...</p>
        </div>
      ) : filteredActivities.length > 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 font-extrabold border-b border-slate-100 bg-slate-50 uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">Admin User</th>
                  <th className="py-3.5 px-4">Audit Category</th>
                  <th className="py-3.5 px-4">Action Summary</th>
                  <th className="py-3.5 px-4">Event Details &amp; Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {filteredActivities.map((act) => (
                  <tr key={act.id} className="hover:bg-slate-50/50">
                    <td className="py-4 px-4 whitespace-nowrap text-slate-500">
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {new Date(act.timestamp).toLocaleString()}
                      </div>
                    </td>

                    <td className="py-4 px-4 font-bold text-slate-800">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {act.adminName}
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-full font-bold uppercase">
                        {act.category}
                      </span>
                    </td>

                    <td className="py-4 px-4 font-bold text-slate-900">
                      {act.action}
                    </td>

                    <td className="py-4 px-4 text-slate-600 text-[11px]">
                      {act.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-3xl">
          <ShieldAlert className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700">No activity logs recorded</h3>
          <p className="text-xs text-slate-400 mt-1">Actions performed by administrators will automatically be logged here.</p>
        </div>
      )}
    </div>
  );
};

export default AdminActivityHistory;
