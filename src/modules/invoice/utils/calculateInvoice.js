/**
 * Centralized Calculation Engine for Invoices.
 * No other file in the application should calculate invoice totals.
 * 
 * @param {Array} items - List of purchase items. Each item: { name, quantity, isCarton, cartonPrice, unitPrice, unitsPerCarton }
 * @param {number|string} discountInput - Flat discount amount (default: 0)
 * @param {number|string} depositInput - Deposit paid so far (default: 0)
 * @param {string} status - Current invoice status ('Paid', 'Pending', 'Overdue')
 * @returns {object} Calculated financial breakdown
 */
export const calculateInvoice = (items = [], discountInput = 0, depositInput = 0, status = "Pending") => {
  const discount = Math.max(0, Number(discountInput) || 0);
  let deposit = Math.max(0, Number(depositInput) || 0);

  // Calculate items and subtotal
  let subtotal = 0;
  let quantityTotal = 0;

  const calculatedItems = items.map(item => {
    const qty = Math.max(0, Number(item.quantity) || 0);
    const unitsPerCtn = Math.max(1, Number(item.unitsPerCarton) || 12);
    const price = item.isCarton ? (Number(item.cartonPrice) || 0) : (Number(item.unitPrice) || 0);
    const itemTotal = Number((price * qty).toFixed(2));
    
    subtotal += itemTotal;
    quantityTotal += qty;

    return {
      ...item,
      quantity: qty,
      unitsPerCarton: unitsCtn => unitsPerCtn,
      price,
      total: itemTotal,
      totalUnits: item.isCarton ? qty * unitsPerCtn : qty
    };
  });

  subtotal = Number(subtotal.toFixed(2));
  
  // Total after discount
  let total = Number(Math.max(0, subtotal - discount).toFixed(2));

  // Business Rules for deposit & balance based on status
  let balance = 0;
  if (status === "Paid") {
    deposit = total;
    balance = 0;
  } else {
    // Never allow deposit > total
    if (deposit > total) {
      deposit = total;
    }
    balance = Number((total - deposit).toFixed(2));
  }

  return {
    subtotal,
    discount,
    total,
    deposit,
    balance,
    quantityTotal,
    items: calculatedItems
  };
};

export default calculateInvoice;
