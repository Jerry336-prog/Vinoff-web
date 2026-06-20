import React, { useState } from "react";
import { showModal } from "../../../services/ui/modal";
import {
  X,
  FileText,
  Download,
  Printer,
  Landmark,
  CreditCard,
  Wallet,
  Calendar,
  User,
  BookOpen,
} from "lucide-react";
import { formatCurrency } from "../../../utils/formatCurrency";
import InvoiceStatusBadge from "./InvoiceStatusBadge";
import InvoiceItemsTable from "./InvoiceItemsTable";
import InvoiceActions from "./InvoiceActions";
import { useInvoice } from "../hooks/useInvoice";

/**
 * Premium overlay modal to inspect generated invoices.
 * Includes complete items tables, visual financial boxes, PDF links, and print triggers.
 *
 * @param {object} invoice - Full invoice document data
 * @param {boolean} isOpen - Visibility state
 * @param {function} onClose - Close modal callback
 * @param {function} onEdit - Edit callback from viewer
 */
export const InvoiceViewer = ({ invoice, isOpen = false, onClose, onEdit, onSaveSuccess, readOnly = false }) => {
  const { deleteInvoice, updateInvoice } = useInvoice();
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [pendingDeleteInvoice, setPendingDeleteInvoice] = useState(null);

  const handleMarkPaid = async () => {
    try {
      const updated = await updateInvoice(invoice.id, {
        status: "Paid",
        deposit: invoice.total,
        balance: 0,
      });
      if (onSaveSuccess) {
        onSaveSuccess(updated);
      }
      onClose?.();
    } catch (err) {
      await showModal({
        title: "Update Failed",
        message: "Failed to mark invoice as paid: " + err.message,
        tone: "danger",
      });
    }
  };

  const requestDelete = (inv) => {
    setPendingDeleteInvoice(inv || invoice);
    setShowConfirmDelete(true);
  };

  const confirmDelete = async () => {
    const inv = pendingDeleteInvoice || invoice;
    try {
      await deleteInvoice(inv.id || invoice.id);
      setShowConfirmDelete(false);
      onClose?.();
      window.location.reload();
    } catch (e) {
      await showModal({
        title: "Delete Failed",
        message: "Failed to delete invoice: " + (e.message || e),
      });
    }
  };

  const cancelDelete = () => {
    setPendingDeleteInvoice(null);
    setShowConfirmDelete(false);
  };

  if (!isOpen || !invoice) return null;

  const dateStr = invoice.createdAt?.seconds
    ? new Date(invoice.createdAt.seconds * 1000).toLocaleDateString()
    : new Date(invoice.createdAt || Date.now()).toLocaleDateString();

  const dueDateStr = new Date(
    new Date(invoice.createdAt || Date.now()).getTime() +
      5 * 24 * 60 * 60 * 1000,
  ).toLocaleDateString();

  // Normalize numeric fields and compute missing totals defensively
  const subtotal = Number(invoice.subtotal) || 0;
  const discount = Number(invoice.discount) || 0;
  const subtotalAfterDiscount =
    invoice.subtotalAfterDiscount !== undefined
      ? Number(invoice.subtotalAfterDiscount)
      : Math.max(0, subtotal - discount);
  const vatRate = Number(invoice.vatRate) || 0.075;
  const vatAmount =
    invoice.vatAmount !== undefined
      ? Number(invoice.vatAmount)
      : +(subtotalAfterDiscount * vatRate).toFixed(2);
  const shipping = Number(invoice.shipping) || 0;
  const total =
    invoice.total !== undefined
      ? Number(invoice.total)
      : +(subtotalAfterDiscount + vatAmount + shipping).toFixed(2);
  const deposit = Number(invoice.deposit) || 0;
  const balance =
    invoice.balance !== undefined
      ? Number(invoice.balance)
      : +(total - deposit).toFixed(2);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 print:absolute print:inset-0 print:bg-white print:p-0">
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl max-w-4xl w-full flex flex-col max-h-[90vh] animate-scale-up print:border-none print:shadow-none print:max-h-none print:block">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-250 flex items-center justify-center text-emerald-700">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm tracking-tight">
                Inspect Invoice Detail
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                Vinoff Wholesale Engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Actions inside header */}
            <InvoiceActions
              invoice={invoice}
              onEdit={readOnly ? undefined : onEdit}
              onMarkPaid={readOnly ? undefined : handleMarkPaid}
              showEdit={!readOnly && !!onEdit}
              onDelete={readOnly ? undefined : requestDelete}
            />

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition ml-2 border border-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Invoice Document Box */}
        <div id="invoice-document-area" className="flex-1 overflow-y-auto p-6 space-y-6 print:p-0 print:overflow-visible bg-white">
          {/* Printable Invoice Header */}
          <div className="flex flex-col md:flex-row justify-between border-b border-slate-100 pb-5 gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-905 tracking-tight">
                Vinoff Wholesales Ltd
              </h2>
              <p className="text-[10px] text-slate-400 font-medium">
                Plot 14, Commercial Avenue, Lekki Phase 1, Lagos
              </p>
              <p className="text-[10px] text-slate-400 font-medium">
                support@vinoff.com | +234 80 9123 4567
              </p>
            </div>
            <div className="text-left md:text-right">
              <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">
                INVOICE
              </h1>
              <p className="text-sm font-mono font-bold text-brand-green-700 mt-1">
                {invoice.invoiceNumber}
              </p>
              <div className="mt-2.5">
                <InvoiceStatusBadge status={invoice.status} />
              </div>
            </div>
          </div>

          {/* Customer and Metadata Rows */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 border border-slate-200/50 p-5 rounded-2xl">
            <div>
              <span className="block text-[9px] text-slate-400 font-extrabold uppercase tracking-wider mb-2">
                Billed Outlet
              </span>
              <h4 className="font-extrabold text-slate-800 text-sm">
                {invoice.customerName}
              </h4>
              {invoice.businessName && (
                <p className="text-xs font-bold text-brand-green-800 uppercase tracking-wide mt-1">
                  {invoice.businessName}
                </p>
              )}
              <p className="text-[10px] text-slate-400 font-semibold mt-1">
                Verified Wholesale Purchaser
              </p>
            </div>

            <div className="space-y-2 text-xs font-semibold text-slate-700 md:text-right md:justify-items-end">
              <div className="flex justify-between md:justify-end gap-3">
                <span className="text-slate-400 font-bold flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Date Issued:
                </span>
                <span className="font-mono text-slate-800">{dateStr}</span>
              </div>
              <div className="flex justify-between md:justify-end gap-3">
                <span className="text-slate-400 font-bold flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Payment Due:
                </span>
                <span className="font-mono text-slate-800">{dueDateStr}</span>
              </div>
              {invoice.orderId && (
                <div className="flex justify-between md:justify-end gap-3">
                  <span className="text-slate-400 font-bold flex items-center gap-1">
                    Order Link:
                  </span>
                  <span className="font-mono font-bold text-slate-800">
                    {invoice.orderId}
                  </span>
                </div>
              )}
              <div className="flex justify-between md:justify-end gap-3">
                <span className="text-slate-400 font-bold flex items-center gap-1">
                  <User className="w-3.5 h-3.5" /> Created By:
                </span>
                <span className="text-slate-800 font-bold">
                  {invoice.createdBy || "Admin"}
                </span>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div>
            <span className="block text-[9px] text-slate-400 font-extrabold uppercase tracking-wider mb-2">
              Line Items Summary
            </span>
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
                <div className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                  <p>
                    Bank Name:{" "}
                    <strong className="text-slate-700">
                      Guaranty Trust Bank (GTB)
                    </strong>
                  </p>
                  <p>
                    Account Name:{" "}
                    <strong className="text-slate-700">
                      Vinoff Wholesales Ltd
                    </strong>
                  </p>
                  <p>
                    Account Number:{" "}
                    <strong className="text-slate-700">0123456789</strong>
                  </p>
                </div>
              </div>

              {invoice.notes && (
                <div>
                  <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider flex items-center gap-1 mb-1">
                    <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                    Special Terms
                  </span>
                  <p className="text-[10px] text-slate-500 font-medium italic leading-relaxed whitespace-pre-wrap">
                    {invoice.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Totals panel */}
            <div className="bg-slate-50 border border-slate-200/50 p-4.5 rounded-2xl space-y-2 text-xs font-semibold text-slate-655">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-mono">{formatCurrency(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Discount Applied:</span>
                  <span className="font-mono">-{formatCurrency(discount)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Subtotal (after discount):</span>
                <span className="font-mono">
                  {formatCurrency(subtotalAfterDiscount)}
                </span>
              </div>

              <div className="flex justify-between border-t border-slate-200/50 pt-2 text-blue-650 font-bold">
                <span>Deposit Amount Paid:</span>
                <span className="font-mono">{formatCurrency(deposit)}</span>
              </div>

              <div className="flex justify-between text-emerald-650 font-bold">
                <span>Outstanding Balance:</span>
                <span className="font-mono">{formatCurrency(balance)}</span>
              </div>

              <div className="flex justify-between border-t border-slate-200/80 pt-3 text-slate-900 font-black text-sm">
                <span>Grand Total:</span>
                <span className="font-mono font-black text-brand-green-700 text-base">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer controls */}
        <div className="px-6 py-4.5 border-t border-slate-100 bg-slate-50/50 flex justify-end print:hidden">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-150 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-extrabold transition shadow-2xs"
          >
            Close Sheet
          </button>
        </div>
      </div>

      {showConfirmDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40">
          <div className="bg-white p-6 rounded-2xl shadow-xl max-w-md w-full">
            <h3 className="text-lg font-bold text-slate-800 mb-2">
              Confirm Delete
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Are you sure you want to permanently delete invoice{" "}
              <strong>
                {pendingDeleteInvoice?.invoiceNumber || invoice.invoiceNumber}
              </strong>
              ? This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 rounded-xl border"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceViewer;
