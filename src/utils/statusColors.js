/**
 * Maps standard status strings to Tailwind CSS badge classes.
 * Supports Order, Payment, Chat Room, and Invoice states.
 * @param {string} status - The status text
 * @returns {object} { bg, text, border } Tailwind class names
 */
export const getStatusColors = (status) => {
  const normStatus = (status || '').toLowerCase().trim();

  switch (normStatus) {
    // Payment Statuses
    case 'paid':
    case 'payment confirmed':
    case 'confirmed':
    case 'approved':
      return {
        bg: 'bg-emerald-50 dark:bg-emerald-950/30',
        text: 'text-emerald-700 dark:text-emerald-400',
        border: 'border-emerald-200 dark:border-emerald-800/60',
      };
      
    case 'pending':
    case 'pending payment':
    case 'awaiting confirmation':
    case 'unpaid':
      return {
        bg: 'bg-amber-50 dark:bg-amber-950/30',
        text: 'text-amber-700 dark:text-amber-400',
        border: 'border-amber-200 dark:border-amber-800/60',
      };
      
    case 'awaiting invoice':
    case 'invoice draft':
      return {
        bg: 'bg-blue-50 dark:bg-blue-950/30',
        text: 'text-blue-700 dark:text-blue-400',
        border: 'border-blue-200 dark:border-blue-800/60',
      };

    case 'processing':
    case 'shipping':
    case 'shipped':
      return {
        bg: 'bg-purple-50 dark:bg-purple-950/30',
        text: 'text-purple-700 dark:text-purple-400',
        border: 'border-purple-200 dark:border-purple-800/60',
      };

    case 'cancelled':
    case 'rejected':
    case 'failed':
      return {
        bg: 'bg-red-50 dark:bg-red-950/30',
        text: 'text-red-700 dark:text-red-400',
        border: 'border-red-200 dark:border-red-800/60',
      };

    case 'open':
    case 'active':
      return {
        bg: 'bg-green-50 dark:bg-green-950/30',
        text: 'text-green-700 dark:text-green-400',
        border: 'border-green-200 dark:border-green-800/60',
      };

    case 'closed':
    case 'resolved':
      return {
        bg: 'bg-slate-50 dark:bg-slate-800/50',
        text: 'text-slate-600 dark:text-slate-400',
        border: 'border-slate-200 dark:border-slate-700',
      };

    default:
      return {
        bg: 'bg-slate-50 dark:bg-slate-800/50',
        text: 'text-slate-600 dark:text-slate-400',
        border: 'border-slate-200 dark:border-slate-700',
      };
  }
};

export default getStatusColors;
