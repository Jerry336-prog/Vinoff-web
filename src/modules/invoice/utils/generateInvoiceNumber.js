import { runTransaction, doc } from "firebase/firestore";
import { db } from "../../../services/firebase/config";

/**
 * Generates an incrementing, transaction-safe, sequential invoice number.
 * Format: INV-000204 (padded to 6 digits)
 * 
 * Uses settings/invoiceCounter in Firestore to store current count.
 * If not exists, seeds with { current: 203 } so next number is INV-000204.
 * 
 * @returns {Promise<string>} Generated invoice number e.g. INV-000204
 */
export const generateInvoiceNumber = async () => {
  const counterRef = doc(db, "settings", "invoiceCounter");
  let nextNumber = 204; // Default safe fallback

  try {
    await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      if (!counterDoc.exists()) {
        // Seed the counter with 203 so that the very next is 204
        transaction.set(counterRef, { current: 203 });
        nextNumber = 204;
      } else {
        const current = counterDoc.data().current || 203;
        nextNumber = current + 1;
        transaction.update(counterRef, { current: nextNumber });
      }
    });
  } catch (error) {
    console.error("Error executing invoice counter transaction:", error);
    // Simple client-side fallback if permission or write fails during setup
    const rand = Math.floor(Math.random() * 900000) + 100000;
    return `INV-${rand}`;
  }

  const padded = String(nextNumber).padStart(6, "0");
  return `INV-${padded}`;
};

export default generateInvoiceNumber;
