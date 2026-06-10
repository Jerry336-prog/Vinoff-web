import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useInvoice } from '../hooks/useInvoice';
import { formatCurrency } from '../../../utils/formatCurrency';
import InvoiceStatusBadge from '../components/InvoiceStatusBadge';
import InvoiceItemsTable from '../components/InvoiceItemsTable';
import { ArrowLeft, FileText, Download } from 'lucide-react';

export const InvoicePreview = () => {
  const { id } = useParams();
  const { getInvoice } = useInvoice();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      getInvoice(id)
        .then(setInvoice)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) {
    return <p className="text-slate-500 animate-pulse text-xs font-semibold p-8">Rendering preview canvas...</p>;
  }

  if (!invoice) {
    return (
      <div className="p-8 text-center bg-white border border-slate-200 rounded-3xl">
        <p className="text-rose-600 font-bold text-xs">Invoice not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto my-8 bg-white border border-slate-200 rounded-3xl p-8 space-y-6 shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-brand-green-700" />
          <h3 className="font-extrabold text-slate-800 text-sm">Invoice Preview</h3>
        </div>
        {invoice.pdfUrl && (
          <a
            href={invoice.pdfUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-green-50 hover:bg-brand-green-100 border border-brand-green-200 text-[10px] font-bold text-brand-green-700 rounded-xl transition"
          >
            <Download className="w-3.5 h-3.5" />
            Download PDF
          </a>
        )}
      </div>

      <div className="border border-slate-100 p-6 rounded-2xl bg-slate-50/50 space-y-4">
        <div className="flex justify-between">
          <div>
            <h4 className="font-black text-slate-800 text-sm">Vinoff Wholesales Ltd</h4>
            <p className="text-[10px] text-slate-400">Plot 14, Commercial Avenue, Lekki Phase 1, Lagos</p>
          </div>
          <div className="text-right">
            <h4 className="font-bold text-slate-700 text-xs">{invoice.invoiceNumber}</h4>
            <div className="mt-1">
              <InvoiceStatusBadge status={invoice.status} />
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200/60 pt-4">
          <p className="text-[10px] text-slate-400 font-extrabold uppercase mb-1">Billed To:</p>
          <p className="font-bold text-slate-850 text-xs">{invoice.customerName}</p>
          {invoice.businessName && (
            <p className="text-[10px] text-brand-green-700 font-bold uppercase">{invoice.businessName}</p>
          )}
        </div>

        <InvoiceItemsTable items={invoice.items} />

        <div className="border-t border-slate-200/60 pt-4 space-y-2 text-xs font-semibold text-slate-655 md:w-80 md:ml-auto">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span className="font-mono">{formatCurrency(invoice.subtotal)}</span>
          </div>
          {invoice.discount > 0 && (
            <div className="flex justify-between text-rose-600">
              <span>Discount:</span>
              <span className="font-mono">-{formatCurrency(invoice.discount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-150 pt-2 text-blue-600 font-bold">
            <span>Deposit Paid:</span>
            <span className="font-mono">{formatCurrency(invoice.deposit)}</span>
          </div>
          <div className="flex justify-between text-emerald-650 font-bold">
            <span>Balance Due:</span>
            <span className="font-mono">{formatCurrency(invoice.balance)}</span>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-2 font-black text-slate-900 text-sm">
            <span>Grand Total:</span>
            <span className="font-mono font-black text-brand-green-700">{formatCurrency(invoice.total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoicePreview;
