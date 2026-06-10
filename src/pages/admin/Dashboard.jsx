import React, { useState, useEffect } from 'react';
import { dbGetOrders, dbGetChats, dbGetProducts, dbGetAllUsers } from '../../services/firebase/db';
import { formatCurrency } from '../../utils/formatCurrency';
import StatCard from '../../components/dashboard/StatCard';
import { Link } from 'react-router-dom';
import { 
  ClipboardList, CreditCard, DollarSign, MessageSquare, 
  TrendingUp, Clock, AlertTriangle, ArrowRight, UserCheck,
  FileText, Sparkles, AlertCircle, FileCheck, Users, Package, Layers
} from 'lucide-react';

export const Dashboard = () => {
  const [orders, setOrders] = useState([]);
  const [chats, setChats] = useState([]);
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      dbGetOrders(), 
      dbGetChats(), 
      dbGetProducts(),
      dbGetAllUsers()
    ])
      .then(([ordersData, chatsData, productsData, usersData]) => {
        setOrders(ordersData);
        setChats(chatsData);
        setProducts(productsData);
        setUsers(usersData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-slate-500 font-semibold animate-pulse p-6">Syncing metrics dashboard...</p>;
  }

  // Calculate store metrics
  const totalOrders = orders.length;
  const customerCount = users.filter(u => u.role === 'customer').length;
  const totalStock = products.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);
  const totalUnitStock = products.reduce((sum, p) => sum + (Number(p.unitStock) || 0), 0);
  const activeChats = chats.filter(c => c.status !== 'Resolved').length;
  const totalProducts = products.length;
  const lowStockAlerts = products.filter(p => p.stock < 100).length;

  return (
    <div className="space-y-8">
      
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
          trend={`${customerCount} stores`}
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
          value={activeChats} 
          icon={MessageSquare} 
          trend={`${activeChats} unresolved`} 
          trendLabel="awaiting reply"
          variant="slate" 
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
                {orders.slice(0, 5).map(o => (
                  <tr key={o.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-mono text-slate-900">{o.id}</td>
                    <td className="py-3 px-3">
                      <p className="font-extrabold text-slate-800 leading-tight">{o.customerName}</p>
                      <p className="text-[10px] text-slate-400 uppercase">{o.businessName}</p>
                    </td>
                    <td className="py-3 px-3 text-right text-slate-900 font-bold">{formatCurrency(o.total)}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full uppercase border ${
                        o.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))}
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
            {products.filter(p => p.stock < 100).slice(0, 4).map(p => (
              <div key={p.id} className="flex items-center justify-between border border-slate-100 p-3 rounded-xl bg-slate-50/50 text-xs">
                <div className="min-w-0 pr-2">
                  <p className="font-extrabold text-slate-800 truncate">{p.name}</p>
                  <p className="text-[10px] text-slate-400 font-medium">Category: {p.category}</p>
                </div>
                <div className="text-right flex-shrink-0 flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2 py-1 rounded-lg font-bold">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  <span>{p.stock} ctns / {p.unitStock || 0} units</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};

export default Dashboard;
