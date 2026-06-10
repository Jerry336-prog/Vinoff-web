import { generateId } from "../../utils/generateId";

/**
 * Calculates invoice details based on items, tax rate, and shipping fee.
 * @param {Array} items - List of purchase items. Each item: { name, quantity, isCarton, cartonPrice, unitPrice, unitsPerCarton }
 * @param {number} vatRate - Value Added Tax rate as a decimal (default: 0.075 for 7.5%)
 * @param {number} shipping - Flat shipping cost (default: 0)
 * @returns {object} Calculated invoice invoice object
 */
export const calculateInvoice = (items = [], vatRate = 0, shipping = 0) => {
  const invoiceItems = items.map((item) => {
    // In wholesale, items can be bought in cartons or single units
    const unitsPerCarton = item.unitsPerCarton || 12;
    const price = item.isCarton ? item.cartonPrice : item.unitPrice;
    const quantity = item.quantity || 0;
    const itemTotal = price * quantity;
    const totalUnits = item.isCarton ? quantity * unitsPerCarton : quantity;

    return {
      id: item.id || generateId("ITM"),
      name: item.name,
      isCarton: item.isCarton,
      cartonPrice: item.cartonPrice,
      unitPrice: item.unitPrice,
      unitsPerCarton,
      quantity,
      price,
      totalUnits,
      total: itemTotal,
    };
  });

  const subtotal = invoiceItems.reduce((sum, item) => sum + item.total, 0);
  const vatAmount = 0; // taxes removed
  const grandTotal = subtotal + vatAmount + shipping;

  return {
    invoiceNumber: generateId("INV", 7),
    dateIssued: new Date().toLocaleDateString(),
    dueDate: new Date(
      Date.now() + 5 * 24 * 60 * 60 * 1000,
    ).toLocaleDateString(), // 5 days term
    items: invoiceItems,
    subtotal,
    vatRate: 0,
    vatAmount,
    shipping,
    grandTotal,
    paymentInstructions: {
      bankName: "Guaranty Trust Bank (GTB)",
      accountName: "Vinoff Wholesales Ltd",
      accountNumber: "0123456789",
      instructions:
        "Please pay exact invoice total. Upload proof of transfer screenshot in the order chat window.",
    },
  };
};

export default calculateInvoice;
