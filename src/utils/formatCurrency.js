/**
 * Formats a numeric value into a localized currency string.
 * Supports NGN (₦) and USD ($) default layouts.
 * @param {number} value - The amount to format
 * @param {string} currencyCode - ISO 4217 Currency Code (default: USD)
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (value) => {
  if (value === null || value === undefined) return "₦0.00";
  const num = Number(value) || 0;
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      currencyDisplay: "symbol",
    }).format(num);
  } catch (err) {
    return `₦${num.toFixed(2)}`;
  }
};

export default formatCurrency;
