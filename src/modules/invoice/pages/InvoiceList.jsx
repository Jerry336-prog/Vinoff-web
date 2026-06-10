import React, { useState, useEffect } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../../../services/firebase/config';
import { formatCurrency } from '../../../utils/formatCurrency';
import InvoiceStatusBadge from '../components/InvoiceStatusBadge';
import InvoiceForm from '../components/InvoiceForm';
import InvoiceViewer from '../components/InvoiceViewer';
import { useInvoice } from '../hooks/useInvoice';
import { 
  FileText, Search, Plus, Printer, Download, Eye, 
  DollarSign, FileCheck, FileClock, AlertCircle, Sparkles, ClipboardList
} from 'lucide-react';

export const InvoiceList = () => {
  const { deleteInvoice } = useInvoice();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editInvoiceData, setEditInvoiceData] = useState(null);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "invoices"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setInvoices(list);
    } catch (error) {
      console.error("Error fetching invoices:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleRowClick = (invoice) => {
    setSelectedInvoice(invoice);
    setIsViewerOpen(true);
  };

  const handleOpenCreateForm = () => {
    setEditInvoiceData(null);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (e, invoice) => {
    e.stopPropagation();
    setEditInvoiceData(invoice);
    setIsViewerOpen(false); // Close viewer if editing from viewer
    setIsFormOpen(true);
  };

  const handleSaveSuccess = () => {
    fetchInvoices();
  };

  // Filter logic
  const filteredInvoices = invoices.filter(inv => 
    inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (inv.businessName && inv.businessName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Statistics
  const totalInvoicesCount = invoices.length;
  const paidCount = invoices.filter(inv => inv.status === 'Paid').length;
  const pendingCount = invoices.filter(inv => inv.status === 'Pending').length;
  const overdueCount = invoices.filter(inv => inv.status === 'Overdue').length;
  
  // Total Revenue: sum of paid amounts (deposits for pending, total for paid)
  const totalRevenue = invoices.reduce((sum, inv) => sum + (Number(inv.deposit) || 0), 0);
  // Total Outstanding: sum of unpaid balances
  const totalOutstanding = invoices.reduce((sum, inv) => sum + (Number(inv.balance) || 0), 0);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-brand-green-700" />
            Wholesale Invoice Registry
          </h2>
          <p className="text-xs text-slate-500 font-medium">Generate transaction-safe invoices, track real-time payments, and issue secure Cloudinary PDF links.</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative w-full sm:w-60">
            <input
              type="text"
              placeholder="Search invoice or buyer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold focus:ring-2 focus:ring-brand-green-500 outline-none transition"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          {/* Create Button */}
          <button
            onClick={handleOpenCreateForm}
            className="flex-shrink-0 inline-flex items-center gap-1 bg-brand-green-650 hover:bg-brand-green-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            New Invoice
          </button>
        </div>
      </div>

      {/* Invoice Stats Widgets Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Invoices */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-2xs">
          <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Total Invoices</span>
          <div className="flex items-center justify-between mt-2">
            <span className="text-lg font-black text-slate-800 font-mono">{totalInvoicesCount}</span>
            <FileText className="w-5 h-5 text-slate-450 bg-slate-50 p-1 rounded-lg" />
          </div>
        </div>

        {/* Fully Paid */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-2xs">
          <span className="text-[9px] text-emerald-600 font-extrabold uppercase tracking-wider">Fully Paid</span>
          <div className="flex items-center justify-between mt-2">
            <span className="text-lg font-black text-emerald-700 font-mono">{paidCount}</span>
            <FileCheck className="w-5 h-5 text-emerald-600 bg-emerald-50 p-1 rounded-lg" />
          </div>
        </div>

        {/* Pending */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-2xs">
          <span className="text-[9px] text-amber-600 font-extrabold uppercase tracking-wider">Pending</span>
          <div className="flex items-center justify-between mt-2">
            <span className="text-lg font-black text-amber-700 font-mono">{pendingCount}</span>
            <FileClock className="w-5 h-5 text-amber-600 bg-amber-50 p-1 rounded-lg" />
          </div>
        </div>

        {/* Overdue */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-2xs">
          <span className="text-[9px] text-rose-600 font-extrabold uppercase tracking-wider">Overdue</span>
          <div className="flex items-center justify-between mt-2">
            <span className="text-lg font-black text-rose-700 font-mono">{overdueCount}</span>
            <AlertCircle className="w-5 h-5 text-rose-600 bg-rose-50 p-1 rounded-lg" />
          </div>
        </div>

        {/* Revenue Collected */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-2xs">
          <span className="text-[9px] text-blue-600 font-extrabold uppercase tracking-wider">Revenue Recv</span>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm font-black text-blue-700 font-mono truncate">{formatCurrency(totalRevenue)}</span>
            <DollarSign className="w-5 h-5 text-blue-600 bg-blue-50 p-1 rounded-lg" />
          </div>
        </div>

        {/* Outstanding */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-2xs">
          <span className="text-[9px] text-brand-green-700 font-extrabold uppercase tracking-wider">Out. Balance</span>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm font-black text-brand-green-700 font-mono truncate">{formatCurrency(totalOutstanding)}</span>
            <Sparkles className="w-5 h-5 text-brand-green-700 bg-brand-green-50 p-1 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Main Table */}
      {loading ? (
        <p className="text-slate-500 animate-pulse text-xs font-semibold">Syncing all invoices database...</p>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 font-extrabold border-b border-slate-100 bg-slate-50">
                  <th className="py-3.5 px-4">Invoice Num</th>
                  <th className="py-3.5 px-4">Billed Buyer</th>
                  <th className="py-3.5 px-4 text-center">Items</th>
                  <th className="py-3.5 px-4 text-right">Grand Total</th>
                  <th className="py-3.5 px-4 text-right">Deposit</th>
                  <th className="py-3.5 px-4 text-right">Balance</th>
                  <th className="py-3.5 px-4 text-center">Payment Status</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 font-medium italic">
                      No invoices registered matching filters.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map(inv => (
                    <tr 
                      key={inv.id} 
                      onClick={() => handleRowClick(inv)}
                      className="hover:bg-slate-50/50 cursor-pointer transition"
                    >
                      <td className="py-4 px-4 font-mono font-bold text-slate-900 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-slate-455" />
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-extrabold text-slate-800 leading-tight">{inv.customerName}</p>
                        <p className="text-[10px] text-slate-400 uppercase font-semibold">{inv.businessName || 'Wholesale Partner'}</p>
                      </td>
                      <td className="py-4 px-4 text-center text-slate-500 font-mono">
                        {inv.items?.reduce((sum, item) => sum + item.quantity, 0) || 0} packs
                      </td>
                      <td className="py-4 px-4 text-right text-slate-900 font-extrabold font-mono">{formatCurrency(inv.total)}</td>
                      <td className="py-4 px-4 text-right text-blue-650 font-extrabold font-mono">{formatCurrency(inv.deposit)}</td>
                      <td className="py-4 px-4 text-right text-emerald-650 font-extrabold font-mono">{formatCurrency(inv.balance)}</td>
                      <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <InvoiceStatusBadge status={inv.status} />
                      </td>
                      <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleRowClick(inv)}
                            className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-brand-green-700 rounded-lg transition"
                            title="Inspect Invoice"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleOpenEditForm(e, inv)}
                            className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-brand-green-700 rounded-lg transition"
                            title="Edit Invoice"
                          >
                            <Plus className="w-3.5 h-3.5 transform rotate-45" />
                          </button>
                          {inv.pdfUrl && (
                            <a
                              href={inv.pdfUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-brand-green-700 rounded-lg transition"
                              title="Download PDF"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* INVOICE VIEWER OVERLAY MODAL */}
      {selectedInvoice && (
        <InvoiceViewer
          invoice={selectedInvoice}
          isOpen={isViewerOpen}
          onClose={() => {
            setIsViewerOpen(false);
            setSelectedInvoice(null);
          }}
          onEdit={(e) => handleOpenEditForm(e, selectedInvoice)}
        />
      )}

      {/* INVOICE FORM CREATOR/EDITOR OVERLAY MODAL */}
      <InvoiceForm
        isOpen={isFormOpen}
        initialData={editInvoiceData}
        onClose={() => {
          setIsFormOpen(false);
          setEditInvoiceData(null);
        }}
        onSave={handleSaveSuccess}
      />

    </div>
  );
};

export default InvoiceList;
