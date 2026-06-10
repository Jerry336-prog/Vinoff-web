import React from 'react';
import { INVOICE_STATUS_COLORS } from '../utils/invoiceStatus';

/**
 * High-fidelity, animated-ready status badge pill.
 * 
 * @param {string} status - Pending, Paid, Overdue
 * @param {string} className - Additional CSS classes
 */
export const InvoiceStatusBadge = ({ status = "Pending", className = "" }) => {
  const config = INVOICE_STATUS_COLORS[status] || INVOICE_STATUS_COLORS.Pending;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black uppercase rounded-full border tracking-wide transition shadow-2xs ${config.bg} ${config.text} ${config.border} ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
};

export default InvoiceStatusBadge;
