export const INVOICE_STATUS = {
  PENDING: "Pending",
  PAID: "Paid",
  OVERDUE: "Overdue"
};

export const INVOICE_STATUS_COLORS = {
  [INVOICE_STATUS.PENDING]: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    hex: "#F59E0B"
  },
  [INVOICE_STATUS.PAID]: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    hex: "#22C55E"
  },
  [INVOICE_STATUS.OVERDUE]: {
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    hex: "#EF4444"
  }
};

export default {
  INVOICE_STATUS,
  INVOICE_STATUS_COLORS
};
