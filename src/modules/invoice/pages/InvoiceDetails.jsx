import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useInvoice } from '../hooks/useInvoice';
import { formatCurrency } from '../../../utils/formatCurrency';
import InvoiceStatusBadge from '../components/InvoiceStatusBadge';
import InvoiceItemsTable from '../components/InvoiceItemsTable';
import InvoiceActions from '../components/InvoiceActions';
import InvoiceForm from '../components/InvoiceForm';
import { ArrowLeft, Landmark, BookOpen, Calendar, User, FileText } from 'lucide-react';

export const InvoiceDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getInvoice, updateInvoice } = useInvoice();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);

  const fetchInvoice = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getInvoice(id);
      setInvoice(data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch invoice details. Document may not exist.");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = async () => {
    try {
      const updated = await updateInvoice(invoice.id, {
        status: 'Paid',
        deposit: invoice.total,
        balance: 0,
      });
      setInvoice(updated);
    } catch (err) {
      console.error("Failed to mark invoice as paid", err);
    }
  };

  useEffect(() => {
    if (id) {
      fetchInvoice();
    }
  }, [id]);

  useEffect(() => {
    if (invoice && window.location.search.includes("print=true")) {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [invoice]);

  const handleEditClick = () => {
    setIsFormOpen(true);
  };

  const handleSaveSuccess = () => {
    fetchInvoice();
  };

  if (loading) {
    return <p className="text-slate-500 animate-pulse text-xs font-semibold p-8">Loading invoice sheet...</p>;
  }

  if (error || !invoice) {
    return (
      <div className="p-8 text-center bg-white border border-slate-200 rounded-3xl space-y-4">
        <p className="text-rose-600 font-bold text-xs">{error || 'Invoice not found.'}</p>
        <Link to="/admin/invoices" className="inline-flex items-center gap-1 text-xs text-brand-green-700 font-bold hover:underline">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Registry
        </Link>
      </div>
    );
  }

  const dateStr = invoice.createdAt?.seconds 
    ? new Date(invoice.createdAt.seconds * 1000).toLocaleDateString()
    : new Date(invoice.createdAt || Date.now()).toLocaleDateString();

  const dueDateStr = new Date(new Date(invoice.createdAt || Date.now()).getTime() + 5*24*60*60*1000).toLocaleDateString();

  return (
    <div className="space-y-6">
      
      {/* Top back bar and actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 print:hidden">
        <button
          onClick={() => navigate('/admin/invoices')}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-bold hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Registry
        </button>

        <InvoiceActions 
          invoice={invoice} 
          onEdit={handleEditClick}
          onMarkPaid={handleMarkPaid}
          showEdit={true}
        />
      </div>

      {/* Main sheet container */}
      <div id="invoice-document-area" className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm print:border-none print:shadow-none print:p-0 print:m-0">
        
        {/* Invoice Header */}
        <div className="flex flex-col md:flex-row justify-between border-b border-slate-100 pb-5 gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">Vinoff Wholesales Ltd</h2>
            <p className="text-[10px] text-slate-400 font-medium">Plot 14, Commercial Avenue, Lekki Phase 1, Lagos</p>
            <p className="text-[10px] text-slate-400 font-medium">support@vinoff.com | +234 80 9123 4567</p>
          </div>
          <div className="text-left md:text-right">
            <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">INVOICE</h1>
            <p className="text-sm font-mono font-bold text-brand-green-700 mt-1">{invoice.invoiceNumber}</p>
            <div className="mt-2.5">
              <InvoiceStatusBadge status={invoice.status} />
            </div>
          </div>
        </div>

        {/* Customer and Metadata Rows */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 border border-slate-200/50 p-5 rounded-2xl">
          <div>
            <span className="block text-[9px] text-slate-400 font-extrabold uppercase tracking-wider mb-2">Billed Outlet</span>
            <h4 className="font-extrabold text-slate-800 text-sm">{invoice.customerName}</h4>
            {invoice.businessName && (
              <p className="text-xs font-bold text-brand-green-800 uppercase tracking-wide mt-1">{invoice.businessName}</p>
            )}
            <p className="text-[10px] text-slate-400 font-semibold mt-1">Verified Wholesale Purchaser</p>
          </div>

          <div className="space-y-2 text-xs font-semibold text-slate-700 md:text-right md:justify-items-end">
            <div className="flex justify-between md:justify-end gap-3">
              <span className="text-slate-400 font-bold flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Date Issued:</span>
              <span className="font-mono text-slate-800">{dateStr}</span>
            </div>
            <div className="flex justify-between md:justify-end gap-3">
              <span className="text-slate-400 font-bold flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Payment Due:</span>
              <span className="font-mono text-slate-800">{dueDateStr}</span>
            </div>
            {invoice.orderId && (
              <div className="flex justify-between md:justify-end gap-3">
                <span className="text-slate-400 font-bold flex items-center gap-1">Order Link:</span>
                <span className="font-mono font-bold text-slate-800">{invoice.orderId}</span>
              </div>
            )}
            <div className="flex justify-between md:justify-end gap-3">
              <span className="text-slate-400 font-bold flex items-center gap-1"><User className="w-3.5 h-3.5" /> Created By:</span>
              <span className="text-slate-800 font-bold">{invoice.createdBy || 'Admin'}</span>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div>
          <span className="block text-[9px] text-slate-400 font-extrabold uppercase tracking-wider mb-2">Line Items Summary</span>
          <InvoiceItemsTable items={invoice.items} />
        </div>

        {/* Notes and Totals */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Payment instructions */}
          <div className="bg-slate-50 border border-slate-200/50 p-4.5 rounded-2xl space-y-3.5">
            <div>
              <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider flex items-center gap-1 mb-1">
                <Landmark className="w-3.5 h-3.5 text-slate-400" />
                Bank Wire Instructions
              </span>
              <div className="text-[10px] text-slate-505 font-semibold leading-relaxed">
                <p>Bank Name: <strong className="text-slate-700">Guaranty Trust Bank (GTB)</strong></p>
                <p>Account Name: <strong className="text-slate-700">Vinoff Wholesales Ltd</strong></p>
                <p>Account Number: <strong className="text-slate-700">0123456789</strong></p>
              </div>
            </div>

            {invoice.notes && (
              <div>
                <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider flex items-center gap-1 mb-1">
                  <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                  Special Terms
                </span>
                <p className="text-[10px] text-slate-500 font-medium italic leading-relaxed whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            )}
          </div>

          {/* Totals panel */}
          <div className="bg-slate-50 border border-slate-200/50 p-4.5 rounded-2xl space-y-2 text-xs font-semibold text-slate-655">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-mono">{formatCurrency(invoice.subtotal)}</span>
            </div>
            {invoice.discount > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>Discount Applied:</span>
                <span className="font-mono">-{formatCurrency(invoice.discount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-200/50 pt-2 text-blue-650 font-bold">
              <span>Deposit Amount Paid:</span>
              <span className="font-mono">{formatCurrency(invoice.deposit)}</span>
            </div>
            <div className="flex justify-between text-emerald-650 font-bold">
              <span>Outstanding Balance:</span>
              <span className="font-mono">{formatCurrency(invoice.balance)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200/80 pt-3 text-slate-900 font-black text-sm">
              <span>Grand Total:</span>
              <span className="font-mono font-black text-brand-green-700 text-base">{formatCurrency(invoice.total)}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Editor Modal */}
      <InvoiceForm
        isOpen={isFormOpen}
        initialData={invoice}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveSuccess}
      />

    </div>
  );
};

export default InvoiceDetails;
