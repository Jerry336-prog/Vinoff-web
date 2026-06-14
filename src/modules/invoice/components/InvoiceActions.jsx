import React from "react";
import { Download, Printer, Edit3, CheckCircle, FileText } from "lucide-react";
import { PDFDownloadLink, pdf } from "@react-pdf/renderer";
import InvoicePDF from "./InvoicePDF";

/**
 * Premium actions controller for single invoices.
 *
 * @param {object} invoice - The invoice data
 * @param {function} onEdit - Edit button callback
 * @param {function} onMarkPaid - Mark paid callback
 * @param {function} onUpdate - Generic update callback
 * @param {boolean} showEdit - Whether to display the edit action
 */
export const InvoiceActions = ({
  invoice,
  onEdit,
  onMarkPaid,
  onUpdate,
  showEdit = true,
  onDelete,
}) => {
  const handlePrint = async () => {
    if (!invoice) return;
    try {
      const blob = await pdf(<InvoicePDF invoice={invoice} />).toBlob();
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url, "_blank");
      if (!printWindow) {
        console.warn("Popup blocked, could not open PDF for printing.");
      }
    } catch (err) {
      console.error("Failed to generate PDF for print", err);
    }
  };

  const handleDeleteClick = () => {
    if (!onDelete) return;
    onDelete(invoice);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* View PDF (External Link if exists) */}
      {invoice?.pdfUrl && (
        <a
          href={invoice.pdfUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl transition shadow-2xs hover:border-brand-green-300"
          title="Open External PDF"
        >
          <FileText className="w-3.5 h-3.5 text-brand-green-600" />
          View External PDF
        </a>
      )}

      {/* Download PDF via Option B (@react-pdf) */}
      {invoice && (
        <PDFDownloadLink
          document={<InvoicePDF invoice={invoice} />}
          fileName={`Invoice_${invoice.invoiceNumber || invoice.id}.pdf`}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl transition shadow-2xs hover:border-brand-green-300"
          title="Download Invoice as PDF"
        >
          {({ loading }) => (
            <>
              <Download className="w-3.5 h-3.5 text-slate-500" />
              {loading ? "Preparing..." : "Download"}
            </>
          )}
        </PDFDownloadLink>
      )}

      {/* Print */}
      <button
        onClick={handlePrint}
        className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl transition shadow-2xs"
        title="Print invoice sheet"
      >
        <Printer className="w-3.5 h-3.5 text-slate-550" />
        Print
      </button>

      {/* Edit */}
      {showEdit && onEdit && (
        <button
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-brand-green-50 border border-slate-200 hover:border-brand-green-300 text-xs font-bold text-slate-700 hover:text-brand-green-700 rounded-xl transition shadow-2xs"
        >
          <Edit3 className="w-3.5 h-3.5 text-brand-green-600" />
          Edit Invoice
        </button>
      )}

      {/* Mark Paid Quick Button */}
      {invoice?.status !== "Paid" && onMarkPaid && (
        <button
          onClick={onMarkPaid}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-900 border border-emerald-500 text-xs font-extrabold text-white rounded-xl transition shadow-xs"
        >
          <CheckCircle className="w-3.5 h-3.5" />
          Mark as Paid
        </button>
      )}

      {/* Delete (optional) */}
      {onDelete && (
        <button
          onClick={handleDeleteClick}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white rounded-xl transition shadow-2xs"
          title="Delete Invoice"
        >
          Delete
        </button>
      )}
    </div>
  );
};

export default InvoiceActions;
