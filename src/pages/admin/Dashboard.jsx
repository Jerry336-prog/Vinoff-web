import React, { useState, useEffect, useContext } from 'react';
import api from '../../services/api';
import { createIdempotencyKey, withIdempotencyKey } from '../../services/idempotency';
import { formatCurrency } from '../../utils/formatCurrency';
import StatCard from '../../components/dashboard/StatCard';
import ExportButton from '../../components/exports/ExportButton';
import Badge from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import { Link, useNavigate } from 'react-router-dom';
import { unwrapApiList } from '../../utils/apiResponse';
import { getAvatarUrl, getInitials } from '../../utils/avatar';
import { downloadInvoicePDF } from '../../utils/generatePDF';
import { AuthContext } from '../../context/AuthContext';
import { toast } from '../../context/ToastContext';
import { 
  ClipboardList, MessageSquare, AlertTriangle, ArrowRight,
  Users, Package, Layers, FileText, CheckCircle2, Download, Eye
} from 'lucide-react';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('overview');
  const [orders, setOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [chats, setChats] = useState([]);
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settlingId, setSettlingId] = useState(null);

  const fetchDashboardData = () => {
    Promise.all([
      api.get('/api/orders'),
      api.get('/api/invoices').catch(() => ({ data: [] })),
      api.get('/api/chats'),
      api.get('/api/products'),
      api.get('/api/admin/customers')
    ])
      .then(([ordersRes, invoicesRes, chatsRes, productsRes, usersRes]) => {
        const ordersData = unwrapApiList(ordersRes);
        const invoicesData = unwrapApiList(invoicesRes);
        const chatsData = unwrapApiList(chatsRes);
        const productsData = unwrapApiList(productsRes);
        const usersData = unwrapApiList(usersRes);

        setOrders(Array.isArray(ordersData) ? ordersData : []);
        setInvoices(Array.isArray(invoicesData) ? invoicesData : []);
        setChats(Array.isArray(chatsData) ? chatsData : []);
        setProducts(Array.isArray(productsData) ? productsData : []);
        setUsers(Array.isArray(usersData) ? usersData : []);
      })
      .catch((err) => {
        console.error("Dashboard metrics sync error:", err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleSettleCreditInvoice = async (e, inv) => {
    e.stopPropagation();
    const invoiceId = inv._id || inv.id;
    setSettlingId(invoiceId);
    try {
      await api.patch(
        `/api/invoices/${invoiceId}`,
        { status: "Paid" },
        withIdempotencyKey(createIdempotencyKey(`dash-settle-${invoiceId}`)),
      );
      toast.success(
        `Credit Invoice ${inv.invoiceNumber} settled & deducted from customer's credit balance!`,
        "Credit Settled"
      );
      fetchDashboardData();
    } catch (err) {
      toast.error(err.message || "Failed to settle credit invoice", "Update Failed");
    } finally {
      setSettlingId(null);
    }
  };

  if (loading) {
    return <p className="text-slate-500 font-semibold animate-pulse p-6">Syncing metrics dashboard...</p>;
  }

  // Calculate store metrics
  const totalOrders = orders.length;
  const customerCount = users.filter(u => u.role === 'customer').length || users.length;
  const totalStock = products.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);
  const totalUnitStock = products.reduce((sum, p) => sum + (Number(p.unitStock) || 0), 0);
  const isChatResolved = (c) => {
    const s = String(c?.status || "").toLowerCase().trim();
    return s === "closed" || s === "resolved";
  };
  const unresolvedChatsCount = chats.filter(c => !isChatResolved(c)).length;
  const totalProducts = products.length;
  const lowStockAlerts = products.filter(p => (Number(p.stock) || 0) < 100).length;

  // Credit metrics
  const creditInvoices = invoices.filter((inv) => inv.isCredit || inv.status === "On Credit");
  const activeCreditInvoices = creditInvoices.filter((inv) => inv.status !== "Paid" && inv.status !== "Cancelled");
  const totalOutstandingCredit = activeCreditInvoices.reduce(
    (sum, inv) => sum + Number(inv.total ?? inv.totalAmount ?? 0),
    0
  );
  const vipCustomers = users.filter((u) => u.isVipCreditPartner || Number(u.outstandingCredit || 0) > 0);
  const owingCustomersCount = users.filter((u) => Number(u.outstandingCredit || 0) > 0 || u.isOwingCredit).length;

  return (
    <div className="space-y-6">
      {/* Top Portal View Tabs: Store Operations vs Credit Invoices */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-2 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-brand-green-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Operations Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('credit-invoices')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'credit-invoices'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-rose-900 bg-rose-50/70 hover:bg-rose-100/80 border border-rose-200/70'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${activeCreditInvoices.length > 0 ? 'bg-red-500 animate-pulse' : 'bg-amber-400'}`} />
            <span>Credit Invoices &amp; VIP Partners</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
              activeTab === 'credit-invoices'
                ? 'bg-white/20 text-white'
                : 'bg-rose-200/80 text-rose-950'
            }`}>
              {activeCreditInvoices.length} Unpaid &bull; {formatCurrency(totalOutstandingCredit)}
            </span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ExportButton kind="invoices" label="Export Invoices" defaultFormat="zip" />
          <ExportButton kind="orders" label="Export Orders" />
          <Link
            to="/admin/customers"
            className="text-xs font-bold text-brand-green-800 hover:underline px-3 py-1.5 flex items-center gap-1"
          >
            Manage VIP Credit Partners ({vipCustomers.length})
          </Link>
        </div>
      </div>

      {activeTab === 'credit-invoices' ? (
        <div className="space-y-6">
          {/* Credit Summary Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-600" />
                Total Unpaid VIP Credit (NGN)
              </span>
              <p className="text-2xl sm:text-3xl font-black font-mono text-slate-900">
                {formatCurrency(totalOutstandingCredit)}
              </p>
              <p className="text-[11px] text-slate-500">
                Across {activeCreditInvoices.length} active credit invoice(s)
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                VIP Credit Partners Owing
              </span>
              <p className="text-2xl sm:text-3xl font-black font-mono text-slate-900">
                {owingCustomersCount} <span className="text-sm font-bold text-slate-400">/ {vipCustomers.length} Partners</span>
              </p>
              <p className="text-[11px] text-slate-500">
                Partners with red dot (●) have unsettled credit
              </p>
            </div>

            <div className="flex flex-col justify-center md:items-end gap-2">
              <Link
                to="/admin/invoices"
                className="inline-flex items-center gap-2 bg-slate-900 text-white hover:bg-slate-800 px-4 py-2.5 rounded-xl text-xs font-extrabold transition shadow-xs"
              >
                <FileText className="w-4 h-4 text-white" />
                Open Full Invoicing Desk
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Credit Invoices Table */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm tracking-wide uppercase flex items-center gap-2">
                    <FileText className="w-4 h-4 text-rose-600" />
                    VIP Credit Invoices Ledger ({creditInvoices.length})
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Customers settle credit invoices through Paystack. Verified payments automatically update their outstanding balance.
                  </p>
                </div>
              </div>

              {creditInvoices.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  No credit invoices have been issued yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-slate-400 font-extrabold border-b border-slate-100 bg-slate-50">
                        <th className="py-2.5 px-3">Invoice #</th>
                        <th className="py-2.5 px-3">VIP Partner</th>
                        <th className="py-2.5 px-3 text-right">Amount (NGN)</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {creditInvoices.map((inv) => {
                        const invId = inv._id || inv.id;
                        const isUnpaid = inv.status !== "Paid" && inv.status !== "Cancelled";
                        return (
                          <tr
                            key={invId}
                            onClick={() => navigate(`/admin/invoices/${invId}`)}
                            className="hover:bg-slate-50/70 transition cursor-pointer"
                          >
                            <td className="py-3 px-3 font-mono font-black text-slate-900">
                              {inv.invoiceNumber}
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-slate-900">
                                  {inv.customer?.firstName} {inv.customer?.lastName}
                                </span>
                                {isUnpaid && (
                                  <span
                                    className="inline-block w-2 h-2 rounded-full bg-red-600 shrink-0"
                                    title="Owing VIP Credit"
                                  />
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 uppercase">
                                {inv.customer?.profile?.companyName || "VIP Partner"}
                              </p>
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-black text-slate-900">
                              {formatCurrency(inv.total ?? inv.totalAmount)}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <Badge status={inv.status} className="text-[9px]" />
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {isUnpaid && (
                                  <button
                                    onClick={(e) => handleSettleCreditInvoice(e, inv)}
                                    disabled={settlingId === invId}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold transition flex items-center gap-1"
                                    title="Mark Paid & Deduct from Credit Balance"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    Settle
                                  </button>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    downloadInvoicePDF(invId, { requireStamp: false });
                                  }}
                                  className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-brand-green-700 rounded-lg transition"
                                  title="Download PDF"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* VIP Credit Partners Status List */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-800 text-sm tracking-wide uppercase flex items-center gap-1.5">
                  VIP Credit Partners
                </h3>
                <Link to="/admin/customers" className="text-xs font-bold text-brand-green-700 hover:underline">
                  All Users
                </Link>
              </div>

              {vipCustomers.length === 0 ? (
                <p className="py-6 text-center text-slate-400 text-xs">
                  No customers have been upgraded to VIP Credit Partner yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {vipCustomers.map((c) => {
                    const owing = Number(c.outstandingCredit || 0);
                    const isOwing = owing > 0 || Boolean(c.isOwingCredit);
                    return (
                      <div
                        key={c._id}
                        onClick={() => navigate(`/admin/customers/${c._id}`)}
                        className="flex items-center justify-between border border-slate-100 p-3 rounded-2xl hover:bg-slate-50 transition cursor-pointer text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative shrink-0">
                            <Avatar
                              src={getAvatarUrl(c)}
                              alt={`${c.firstName || ''} ${c.lastName || ''}`}
                              size={36}
                              fallback={getInitials(c, 'V')}
                              className="rounded-xl bg-brand-green-100 text-brand-green-900 border border-brand-green-200"
                            />
                            {isOwing && (
                              <span
                                className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-600 border-2 border-white shadow-xs"
                                title={`Owing Credit: ${formatCurrency(owing)}`}
                              />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-extrabold text-slate-900 truncate flex items-center gap-1.5">
                              <span>{c.firstName} {c.lastName}</span>
                              {isOwing && (
                                <span className="inline-block w-2 h-2 rounded-full bg-red-600 shrink-0" />
                              )}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate uppercase font-bold">
                              {c.profile?.companyName || c.email}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0 pl-2">
                          <p className={`font-mono font-black ${isOwing ? 'text-red-600' : 'text-emerald-700'}`}>
                            {formatCurrency(owing)}
                          </p>
                          <span className="text-[9px] uppercase font-bold text-slate-400">
                            {isOwing ? 'Owing Credit' : 'Cleared'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* 6 Store Operations Dashboard Widgets Row */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-6">
            <StatCard 
              title="Total Orders" 
              value={totalOrders} 
              icon={ClipboardList} 
              trend={`${totalOrders} requests`} 
              trendLabel="all orders logged"
              variant="blue" 
            />
            <StatCard 
              title="Active Customers" 
              value={customerCount} 
              icon={Users} 
              trend={`${vipCustomers.length} VIP partners`}
              trendLabel="approved outlets"
              variant="green" 
            />
            <StatCard 
              title="Carton Stock" 
              value={totalStock} 
              icon={Package} 
              trend={`${totalUnitStock} loose units`}
              trendLabel="all brand cartons"
              variant="yellow" 
            />
            <StatCard 
              title="Product Brands" 
              value={totalProducts} 
              icon={Layers} 
              trend={`${totalProducts} items`} 
              trendLabel="active catalog"
              variant="slate" 
            />
            <StatCard 
              title="Support Rooms" 
              value={chats.length} 
              icon={MessageSquare} 
              trend={`${unresolvedChatsCount} unresolved`} 
              trendLabel={unresolvedChatsCount === 0 ? "all chats resolved" : "awaiting reply"}
              variant={unresolvedChatsCount > 0 ? "yellow" : "slate"} 
            />
            <StatCard 
              title="Restock Alerts" 
              value={lowStockAlerts} 
              icon={AlertTriangle} 
              trend={`${lowStockAlerts} brands low`} 
              trendLabel="stock under 100 ctns"
              variant="red" 
            />
          </div>

          {/* Main Grid Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Recent Orders Table */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-800 text-sm tracking-wide uppercase">Recent Bulk Requests</h3>
                <Link to="/admin/orders" className="text-xs font-bold text-brand-green-700 hover:underline flex items-center gap-0.5">
                  Manage Orders
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-400 font-extrabold border-b border-slate-100 bg-slate-50">
                      <th className="py-2.5 px-3">Order ID</th>
                      <th className="py-2.5 px-3">Client Outlet</th>
                      <th className="py-2.5 px-3 text-right">Invoice Total</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="py-6 text-center text-slate-400 font-medium">
                          No bulk requests recorded yet.
                        </td>
                      </tr>
                    ) : (
                      orders.slice(0, 5).map(o => {
                        const id = o.orderNumber || o._id || o.id;
                        const custName = o.customer?.name || o.customerName || (o.customer?.firstName ? `${o.customer.firstName} ${o.customer.lastName}` : 'Wholesale Buyer');
                        const bizName = o.customer?.companyName || o.customer?.businessName || o.businessName || 'Verified Outlet';
                        const amount = o.pricing?.total ?? o.total ?? o.totalAmount ?? 0;
                        const isOwing =
                          Number(o.customer?.outstandingCredit || 0) > 0 ||
                          Boolean(o.customer?.isOwingCredit) ||
                          o.paymentStatus === "On Credit";
                        return (
                          <tr key={o._id || o.id} className="hover:bg-slate-50/50">
                            <td className="py-3 px-3 font-mono text-slate-900">{id}</td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-1.5">
                                <p className="font-extrabold text-slate-800 leading-tight">{custName}</p>
                                {isOwing && (
                                  <span
                                    className="inline-block w-2 h-2 rounded-full bg-red-600 shrink-0"
                                    title="VIP Partner Owing Credit"
                                  />
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 uppercase">{bizName}</p>
                            </td>
                            <td className="py-3 px-3 text-right text-slate-900 font-bold">{formatCurrency(amount)}</td>
                            <td className="py-3 px-3 text-center">
                              <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full uppercase border ${
                                o.status === 'Completed' || o.status === 'Paid' || o.status === 'Payment Confirmed'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                                {o.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Low Stock Restock Panel */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-800 text-sm tracking-wide uppercase">Stock Restock Alerts</h3>
                <Link to="/admin/inventory" className="text-xs font-bold text-brand-green-700 hover:underline">
                  Inventory
                </Link>
              </div>

              <div className="space-y-3">
                {products.filter(p => (Number(p.stock) || 0) < 100).length === 0 ? (
                  <p className="py-6 text-center text-slate-400 text-xs font-medium">All stock levels are optimal.</p>
                ) : (
                  products.filter(p => (Number(p.stock) || 0) < 100).slice(0, 4).map(p => (
                    <div key={p._id || p.id} className="flex items-center justify-between border border-slate-100 p-3 rounded-xl bg-slate-50/50 text-xs">
                      <div className="min-w-0 pr-2">
                        <p className="font-extrabold text-slate-800 truncate">{p.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium">Category: {p.category}</p>
                      </div>
                      <div className="text-right flex-shrink-0 flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2 py-1 rounded-lg font-bold">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                        <span>{p.stock} ctns / {p.unitStock || 0} units</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </>
      )}

    </div>
  );
};

export default Dashboard;
