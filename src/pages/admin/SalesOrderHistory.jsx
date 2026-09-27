import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import { formatCurrency } from '../../utils/formatCurrency';
import { unwrapApiList } from '../../utils/apiResponse';
import { exportHistoryCSV, exportHistoryPDF } from '../../utils/exportHistory';
import {
  ShoppingBag,
  Download,
  Search,
  Filter,
  Calendar,
  User,
  FileSpreadsheet,
  RefreshCw,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  Truck,
} from 'lucide-react';
import Button from '../../components/ui/Button';

export const SalesOrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/orders?limit=300').catch(() => ({ data: [] }));
      const list = unwrapApiList(res);
      setOrders(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error('Failed to fetch sales order history:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      const customerName =
        ord.customerName ||
        (ord.customer?.firstName
          ? `${ord.customer.firstName} ${ord.customer.lastName || ''}`.trim()
          : ord.customer?.name) ||
        'Commercial Customer';
      const orderRef = String(ord.orderNumber || ord._id || ord.id || '');
      const status = String(ord.status || 'pending').toLowerCase();

      const matchesSearch =
        customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        orderRef.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ord.paymentMethod || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' || status === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [orders, searchQuery, statusFilter]);

  const totals = useMemo(() => {
    const rev = filteredOrders.reduce((sum, o) => sum + (o.totalAmount || o.total || 0), 0);
    const cartons = filteredOrders.reduce((sum, o) => {
      if (Array.isArray(o.items)) {
        return sum + o.items.reduce((iSum, item) => iSum + (item.quantity || 1), 0);
      }
      return sum;
    }, 0);
    return { count: filteredOrders.length, revenue: rev, cartons };
  }, [filteredOrders]);

  const handleExportCSV = () => {
    if (filteredOrders.length === 0) return;

    const headers = [
      'Order Reference',
      'Date & Time',
      'Customer Name',
      'Items Count',
      'Total Amount (NGN)',
      'Payment Method',
      'Order Status',
    ];

    const rows = filteredOrders.map((ord) => {
      const customerName =
        ord.customerName ||
        (ord.customer?.firstName
          ? `${ord.customer.firstName} ${ord.customer.lastName || ''}`.trim()
          : ord.customer?.name) ||
        'Commercial Customer';
      const itemCount = Array.isArray(ord.items) ? ord.items.length : 1;

      return [
        ord.orderNumber || ord._id || ord.id,
        new Date(ord.createdAt || ord.date || Date.now()).toLocaleString(),
        customerName,
        itemCount,
        ord.totalAmount || ord.total || 0,
        ord.paymentMethod || 'Bank Transfer',
        ord.status || 'Pending',
      ];
    });

    exportHistoryCSV(
      `vinoff_sales_order_history_${new Date().toISOString().slice(0, 10)}`,
      headers,
      rows
    );
  };

  const handleExportPDF = () => {
    if (filteredOrders.length === 0) return;

    const headers = [
      'Order Ref',
      'Date & Time',
      'Customer',
      'Items',
      'Total Amount',
      'Payment Method',
      'Status',
    ];

    const rows = filteredOrders.map((ord) => {
      const customerName =
        ord.customerName ||
        (ord.customer?.firstName
          ? `${ord.customer.firstName} ${ord.customer.lastName || ''}`.trim()
          : ord.customer?.name) ||
        'Commercial Customer';
      const itemCount = Array.isArray(ord.items) ? ord.items.length : 1;

      return [
        ord.orderNumber || ord._id || ord.id,
        new Date(ord.createdAt || ord.date || Date.now()).toLocaleString(),
        customerName,
        `${itemCount} item(s)`,
        formatCurrency(ord.totalAmount || ord.total || 0),
        ord.paymentMethod || 'Bank Transfer',
        ord.status || 'Pending',
      ];
    });

    exportHistoryPDF(
      'Sales & Order History Log',
      `vinoff_sales_order_history_${new Date().toISOString().slice(0, 10)}`,
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
            <ShoppingBag className="w-6 h-6 text-brand-green-700" />
            Sales &amp; Order History Log
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Complete transaction record of all commercial customer purchases, order fulfillments, and revenue metrics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchOrders}
            className="rounded-xl border-slate-200"
            icon={RefreshCw}
          >
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={filteredOrders.length === 0}
            className="rounded-xl border-slate-200 text-slate-700"
            icon={FileSpreadsheet}
          >
            Download CSV
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleExportPDF}
            disabled={filteredOrders.length === 0}
            className="rounded-xl shadow-sm"
            icon={Download}
          >
            Download PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Sales Revenue</p>
          <p className="text-2xl font-black text-brand-green-700 mt-1">{formatCurrency(totals.revenue)}</p>
          <p className="text-[10px] text-slate-400 font-medium mt-1">Sum of filtered orders</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Orders Processed</p>
          <p className="text-2xl font-black text-slate-800 mt-1">{totals.count} Orders</p>
          <p className="text-[10px] text-slate-400 font-medium mt-1">Recorded commercial orders</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Carton Units Dispatched</p>
          <p className="text-2xl font-black text-amber-600 mt-1">{totals.cartons} Cartons</p>
          <p className="text-[10px] text-slate-400 font-medium mt-1">Total cartons ordered</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Search Order # or customer name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-green-500 outline-none transition"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-xs text-slate-500 font-semibold shrink-0">Status:</span>
          <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto text-[11px]">
            {['all', 'pending', 'processing', 'completed'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg font-bold transition capitalize ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders Table */}
      {loading ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-3xl">
          <div className="w-8 h-8 border-4 border-brand-green-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 text-xs font-semibold mt-3">Compiling sales &amp; order history...</p>
        </div>
      ) : filteredOrders.length > 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 font-extrabold border-b border-slate-100 bg-slate-50 uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-4">Order Reference</th>
                  <th className="py-3.5 px-4">Date &amp; Time</th>
                  <th className="py-3.5 px-4">Customer Name</th>
                  <th className="py-3.5 px-4 text-center">Purchased Items</th>
                  <th className="py-3.5 px-4 text-right">Total Amount</th>
                  <th className="py-3.5 px-4 text-center">Payment Method</th>
                  <th className="py-3.5 px-4 text-center">Fulfillment Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {filteredOrders.map((ord) => {
                  const customerName =
                    ord.customerName ||
                    (ord.customer?.firstName
                      ? `${ord.customer.firstName} ${ord.customer.lastName || ''}`.trim()
                      : ord.customer?.name) ||
                    'Commercial Customer';
                  const orderRef = ord.orderNumber || ord._id || ord.id;
                  const status = (ord.status || 'pending').toLowerCase();

                  return (
                    <tr key={ord._id || ord.id} className="hover:bg-slate-50/50">
                      <td className="py-4 px-4 font-mono font-bold text-brand-green-800">
                        #{orderRef}
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap text-slate-500">
                        <div className="flex items-center gap-1.5 font-mono text-[11px]">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {ord.createdAt || ord.date
                            ? new Date(ord.createdAt || ord.date).toLocaleString()
                            : 'Date unavailable'}
                        </div>
                      </td>

                      <td className="py-4 px-4 font-bold text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {customerName}
                        </div>
                      </td>

                      <td className="py-4 px-4 text-center">
                        <span className="bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full text-slate-700 font-bold text-[11px]">
                          {Array.isArray(ord.items) ? ord.items.length : 1} item(s)
                        </span>
                      </td>

                      <td className="py-4 px-4 text-right font-bold text-slate-900 font-mono">
                        {formatCurrency(ord.totalAmount || ord.total || 0)}
                      </td>

                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl text-[10px] font-bold text-slate-600">
                          <CreditCard className="w-3 h-3 text-slate-400" />
                          {ord.paymentMethod || 'Bank Transfer'}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-center">
                        {status === 'completed' || status === 'delivered' ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full text-[10px] font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Completed
                          </span>
                        ) : status === 'processing' || status === 'shipped' ? (
                          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-full text-[10px] font-bold">
                            <Truck className="w-3.5 h-3.5 text-blue-600" />
                            Processing
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-full text-[10px] font-bold">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            Pending
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
          <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700">No sales order records found</h3>
          <p className="text-xs text-slate-400 mt-1">Orders placed by customers will automatically appear in this audit log.</p>
        </div>
      )}
    </div>
  );
};

export default SalesOrderHistory;
