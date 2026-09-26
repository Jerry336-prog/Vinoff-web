import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import { formatCurrency } from '../../utils/formatCurrency';
import { unwrapApiList } from '../../utils/apiResponse';
import { exportHistoryCSV, exportHistoryPDF } from '../../utils/exportHistory';
import {
  Users,
  Download,
  Search,
  Filter,
  Calendar,
  User,
  FileSpreadsheet,
  RefreshCw,
  ShoppingBag,
  Building2,
  Mail,
  Phone,
  DollarSign,
  Package,
} from 'lucide-react';
import Button from '../../components/ui/Button';

export const CustomerAccountHistory = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [accountTypeFilter, setAccountTypeFilter] = useState('all');

  const fetchCustomerHistory = async () => {
    setLoading(true);
    try {
      const [usersRes, ordersRes] = await Promise.all([
        api.get('/api/users?limit=300').catch(() => ({ data: [] })),
        api.get('/api/orders?limit=500').catch(() => ({ data: [] })),
      ]);

      const rawUsers = unwrapApiList(usersRes);
      const rawOrders = unwrapApiList(ordersRes);

      // Build customer purchase statistics map
      const statsMap = new Map();

      (Array.isArray(rawOrders) ? rawOrders : []).forEach((ord) => {
        const custId = ord.customer?._id || ord.customer?.id || ord.customerId || ord.customerEmail || ord.customerName;
        if (!custId) return;

        const key = String(custId).toLowerCase();
        const existing = statsMap.get(key) || {
          orderCount: 0,
          totalSpend: 0,
          totalCartons: 0,
          lastOrderDate: null,
          businessName: ord.businessName || ord.customer?.businessName || '',
          name: ord.customerName || (ord.customer?.firstName ? `${ord.customer.firstName} ${ord.customer.lastName || ''}`.trim() : ''),
          email: ord.customerEmail || ord.customer?.email || '',
          phone: ord.customerPhone || ord.customer?.phone || '',
        };

        existing.orderCount += 1;
        existing.totalSpend += ord.totalAmount || ord.total || 0;

        if (Array.isArray(ord.items)) {
          existing.totalCartons += ord.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
        }

        const ordDate = new Date(ord.createdAt || ord.date || Date.now());
        if (!existing.lastOrderDate || ordDate > new Date(existing.lastOrderDate)) {
          existing.lastOrderDate = ordDate.toISOString();
        }

        statsMap.set(key, existing);
      });

      // Merge with registered user list
      const combined = (Array.isArray(rawUsers) ? rawUsers : []).map((u) => {
        const emailKey = String(u.email || '').toLowerCase();
        const idKey = String(u._id || u.id || '').toLowerCase();
        const stat = statsMap.get(emailKey) || statsMap.get(idKey) || {};

        return {
          id: u._id || u.id,
          name: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || stat.name || 'Commercial Customer',
          email: u.email || stat.email || 'N/A',
          phone: u.phone || stat.phone || 'N/A',
          businessName: u.businessName || stat.businessName || 'Retail Outlet',
          accountType: u.accountType || (u.role === 'admin' ? 'Administrator' : 'Commercial Buyer'),
          registeredAt: u.createdAt || new Date().toISOString(),
          orderCount: stat.orderCount || 0,
          totalSpend: stat.totalSpend || 0,
          totalCartons: stat.totalCartons || 0,
          lastOrderDate: stat.lastOrderDate || null,
        };
      });

      // Add guest order purchasers if any exist not in user list
      statsMap.forEach((stat, key) => {
        const found = combined.some(
          (c) => c.email.toLowerCase() === key || String(c.id).toLowerCase() === key
        );
        if (!found && stat.name) {
          combined.push({
            id: `guest-${key}`,
            name: stat.name,
            email: stat.email || 'N/A',
            phone: stat.phone || 'N/A',
            businessName: stat.businessName || 'Commercial Buyer',
            accountType: 'Guest Buyer',
            registeredAt: stat.lastOrderDate || new Date().toISOString(),
            orderCount: stat.orderCount,
            totalSpend: stat.totalSpend,
            totalCartons: stat.totalCartons,
            lastOrderDate: stat.lastOrderDate,
          });
        }
      });

      // Sort by highest total spend
      combined.sort((a, b) => b.totalSpend - a.totalSpend);
      setCustomers(combined);
    } catch (e) {
      console.error('Failed to fetch customer history:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerHistory();
  }, []);

  const filteredCustomers = useMemo(() => {
    return customers.filter((cust) => {
      const matchesSearch =
        cust.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cust.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cust.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cust.phone.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType =
        accountTypeFilter === 'all' ||
        cust.accountType.toLowerCase().includes(accountTypeFilter.toLowerCase());

      return matchesSearch && matchesType;
    });
  }, [customers, searchQuery, accountTypeFilter]);

  const summary = useMemo(() => {
    const totalAccounts = filteredCustomers.length;
    const totalSpendSum = filteredCustomers.reduce((acc, c) => acc + c.totalSpend, 0);
    const totalCartonsSum = filteredCustomers.reduce((acc, c) => acc + c.totalCartons, 0);
    return { totalAccounts, totalSpendSum, totalCartonsSum };
  }, [filteredCustomers]);

  const handleExportCSV = () => {
    if (filteredCustomers.length === 0) return;

    const headers = [
      'Customer Name',
      'Business Name',
      'Email Address',
      'Phone Number',
      'Account Type',
      'Total Orders Placed',
      'Total Cartons Ordered',
      'Total Lifetime Spend (NGN)',
      'Last Order Date',
    ];

    const rows = filteredCustomers.map((cust) => [
      cust.name,
      cust.businessName,
      cust.email,
      cust.phone,
      cust.accountType,
      cust.orderCount,
      cust.totalCartons,
      cust.totalSpend,
      cust.lastOrderDate ? new Date(cust.lastOrderDate).toLocaleDateString() : 'No orders yet',
    ]);

    exportHistoryCSV(
      `vinoff_customer_purchase_history_${new Date().toISOString().slice(0, 10)}`,
      headers,
      rows
    );
  };

  const handleExportPDF = () => {
    if (filteredCustomers.length === 0) return;

    const headers = [
      'Customer Name',
      'Business Outlet',
      'Email',
      'Account Type',
      'Orders',
      'Cartons',
      'Total Spend',
    ];

    const rows = filteredCustomers.map((cust) => [
      cust.name,
      cust.businessName,
      cust.email,
      cust.accountType,
      cust.orderCount,
      `${cust.totalCartons} ctns`,
      formatCurrency(cust.totalSpend),
    ]);

    exportHistoryPDF(
      'Customer Account & Purchase History Audit Report',
      `vinoff_customer_purchase_history_${new Date().toISOString().slice(0, 10)}`,
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
            <Users className="w-6 h-6 text-brand-green-700" />
            Customer Account &amp; Purchase History Log
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Comprehensive directory of commercial buyer accounts, total cartons ordered, and lifetime purchase volume.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchCustomerHistory}
            className="rounded-xl border-slate-200"
            icon={RefreshCw}
          >
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={filteredCustomers.length === 0}
            className="rounded-xl border-slate-200 text-slate-700"
            icon={FileSpreadsheet}
          >
            Download CSV
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleExportPDF}
            disabled={filteredCustomers.length === 0}
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
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Registered Commercial Accounts</p>
          <p className="text-2xl font-black text-slate-800 mt-1">{summary.totalAccounts} Accounts</p>
          <p className="text-[10px] text-slate-400 font-medium mt-1">Filtered customer profiles</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Cartons Purchased</p>
          <p className="text-2xl font-black text-amber-600 mt-1">{summary.totalCartonsSum} Cartons</p>
          <p className="text-[10px] text-slate-400 font-medium mt-1">Cumulative volume bought</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Lifetime Gross Spend</p>
          <p className="text-2xl font-black text-brand-green-700 mt-1">{formatCurrency(summary.totalSpendSum)}</p>
          <p className="text-[10px] text-slate-400 font-medium mt-1">Total revenue generated</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Search name, email, or business..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-green-500 outline-none transition"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-xs text-slate-500 font-semibold shrink-0">Account Type:</span>
          <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto text-[11px]">
            <button
              onClick={() => setAccountTypeFilter('all')}
              className={`px-3 py-1 rounded-lg font-bold transition ${
                accountTypeFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setAccountTypeFilter('buyer')}
              className={`px-3 py-1 rounded-lg font-bold transition ${
                accountTypeFilter === 'buyer'
                  ? 'bg-emerald-50 text-emerald-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Buyers Only
            </button>
          </div>
        </div>
      </div>

      {/* Customer Directory Table */}
      {loading ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-3xl">
          <div className="w-8 h-8 border-4 border-brand-green-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 text-xs font-semibold mt-3">Compiling customer purchase history...</p>
        </div>
      ) : filteredCustomers.length > 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 font-extrabold border-b border-slate-100 bg-slate-50 uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-4">Customer &amp; Outlet</th>
                  <th className="py-3.5 px-4">Contact Details</th>
                  <th className="py-3.5 px-4 text-center">Account Tier</th>
                  <th className="py-3.5 px-4 text-center">Orders Placed</th>
                  <th className="py-3.5 px-4 text-center">Volume Bought</th>
                  <th className="py-3.5 px-4 text-right">Lifetime Spend</th>
                  <th className="py-3.5 px-4">Last Purchase Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {filteredCustomers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-slate-50/50">
                    <td className="py-4 px-4 font-bold text-slate-800">
                      <div className="flex items-center gap-1.5 text-slate-900">
                        <User className="w-3.5 h-3.5 text-brand-green-700 shrink-0" />
                        {cust.name}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium mt-0.5">
                        <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                        {cust.businessName}
                      </div>
                    </td>

                    <td className="py-4 px-4 text-slate-600">
                      <div className="flex items-center gap-1 text-[11px]">
                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                        {cust.email}
                      </div>
                      {cust.phone !== 'N/A' && (
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          {cust.phone}
                        </div>
                      )}
                    </td>

                    <td className="py-4 px-4 text-center">
                      <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-0.5 rounded-full font-bold uppercase">
                        {cust.accountType}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-center font-mono font-bold text-slate-900">
                      {cust.orderCount} order(s)
                    </td>

                    <td className="py-4 px-4 text-center font-mono font-bold text-amber-600">
                      {cust.totalCartons} ctns
                    </td>

                    <td className="py-4 px-4 text-right font-mono font-bold text-brand-green-700">
                      {formatCurrency(cust.totalSpend)}
                    </td>

                    <td className="py-4 px-4 text-slate-500 font-mono text-[11px]">
                      {cust.lastOrderDate
                        ? new Date(cust.lastOrderDate).toLocaleDateString()
                        : 'No orders'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-3xl">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700">No customer history accounts found</h3>
          <p className="text-xs text-slate-400 mt-1">Customer profiles and their lifetime purchase volume will appear here.</p>
        </div>
      )}
    </div>
  );
};

export default CustomerAccountHistory;
