import { useContext, useCallback } from "react";
import { InvoiceContext } from "../context/InvoiceContext";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../../services/firebase/config";
import { calculateInvoice } from "../../../services/invoice/invoiceEngine";
import { dbDeleteInvoice } from "../../../services/firebase/db";

/**
 * Custom hook to easily access and perform transactions using the Invoice Module Engine.
 * Exposes createInvoice, updateInvoice, deleteInvoice, getInvoice, getCustomerInvoices, getOrderInvoices, and loading.
 *
 * @returns {object} Invoice Module Context value
 */
export const useInvoiceContext = () => {
  const context = useContext(InvoiceContext);
  if (!context) {
    throw new Error("useInvoiceContext must be used within an InvoiceProvider");
  }
  return context;
};

// Utility to deep-clone and remove functions / undefined values
const sanitizeForFirestore = (obj) => {
  return JSON.parse(
    JSON.stringify(obj, (k, v) => {
      if (typeof v === "function") return undefined;
      if (v === undefined) return undefined;
      return v;
    }),
  );
};

export const useInvoice = () => {
  const getCustomerInvoices = useCallback(async (customerId) => {
    // Avoid composite index requirement by fetching all invoices for customer and sorting client-side.
    const q = query(
      collection(db, "invoices"),
      where("customerId", "==", customerId),
    );
    const snap = await getDocs(q);
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    // Sort by createdAt (descending). Support serverTimestamp objects.
    items.sort((a, b) => {
      const ta = a.createdAt?.seconds
        ? a.createdAt.seconds * 1000
        : new Date(a.createdAt || 0).getTime();
      const tb = b.createdAt?.seconds
        ? b.createdAt.seconds * 1000
        : new Date(b.createdAt || 0).getTime();
      return tb - ta;
    });
    return items;
  }, []);

  const createInvoice = useCallback(async (invoicePayload) => {
    // Sanitize to avoid passing functions to Firestore
    const payload = sanitizeForFirestore(invoicePayload || {});

    // Ensure we have items and compute totals if missing
    if (
      !payload.items ||
      !Array.isArray(payload.items) ||
      payload.items.length === 0
    ) {
      payload.items = [];
    }

    // Normalize numeric fields
    const discount = Number(payload.discount) || 0;
    const deposit = Number(payload.deposit) || 0;
    // Taxes removed
    const vatRate = 0;
    const shipping = Number(payload.shipping) || 0;

    // Compute invoice using engine
    let finalPayload = { ...payload };
    try {
      const computed = calculateInvoice(
        payload.items.map((i) => ({
          id: i.id,
          name: i.name,
          quantity: Number(i.quantity) || 0,
          isCarton: !!i.isCarton,
          cartonPrice: Number(i.cartonPrice) || 0,
          unitPrice: Number(i.unitPrice) || 0,
          unitsPerCarton: Number(i.unitsPerCarton) || 12,
        })),
        vatRate,
        shipping,
      );

      // Apply discount as absolute amount
      const subtotalPre = computed.subtotal;
      const subtotalAfterDiscount = Math.max(0, subtotalPre - discount);
      const vatAmount = 0;
      const grandTotal = subtotalAfterDiscount + vatAmount + shipping;
      
      const invoiceStatus = payload.status || "Pending";
      let depositVal = deposit;
      let balance = grandTotal - depositVal;
      
      if (invoiceStatus === "Paid") {
        depositVal = grandTotal;
        balance = 0;
      }

      finalPayload = {
        ...finalPayload,
        invoiceNumber: finalPayload.invoiceNumber || computed.invoiceNumber,
        dateIssued: computed.dateIssued,
        dueDate: computed.dueDate,
        paymentInstructions: computed.paymentInstructions,
        items: computed.items,
        subtotal: subtotalPre, // keep pre-discount subtotal
        subtotalAfterDiscount,
        vatRate,
        vatAmount,
        shipping,
        total: grandTotal,
        balance,
        discount,
        deposit: depositVal,
        status: invoiceStatus,
      };
    } catch (err) {
      // fallback - ensure numbers
      finalPayload.subtotal = Number(finalPayload.subtotal) || 0;
      finalPayload.vatAmount = Number(finalPayload.vatAmount) || 0;
      finalPayload.total = Number(finalPayload.total) || 0;
      finalPayload.balance =
        Number(finalPayload.balance) || finalPayload.total - deposit;
    }

    // Final sanitize
    const clean = sanitizeForFirestore(finalPayload);

    const ref = await addDoc(collection(db, "invoices"), {
      ...clean,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // If orderId provided, link invoice to order document
    if (clean.orderId) {
      try {
        const orderRef = doc(db, "orders", clean.orderId);
        const orderUpdates = {
          invoiceNumber: clean.invoiceNumber,
          invoiceId: ref.id,
          updatedAt: serverTimestamp(),
        };
        if (clean.status === "Paid") {
          orderUpdates.status = "Paid";
          orderUpdates.deposit = clean.total || 0;
        } else if (clean.status) {
          orderUpdates.status = clean.status;
        }
        await updateDoc(orderRef, orderUpdates);
      } catch (e) {
        // non-fatal
        console.warn("Failed to link invoice to order:", e.message || e);
      }
    }

    // Return fresh saved document
    const savedSnap = await getDocs(
      query(collection(db, "invoices"), where("__name__", "==", ref.id)),
    );
    if (savedSnap && savedSnap.docs && savedSnap.docs[0]) {
      return { id: ref.id, ...savedSnap.docs[0].data() };
    }

    return { id: ref.id, ...clean };
  }, []);

  const updateInvoice = useCallback(async (invoiceId, updates) => {
    const ref = doc(db, "invoices", invoiceId);
    const clean = sanitizeForFirestore(updates || {});

    // Load existing invoice if needed to merge data
    let existing = {};
    try {
      const snap = await getDocs(
        query(collection(db, "invoices"), where("__name__", "==", invoiceId)),
      );
      if (snap && snap.docs && snap.docs[0]) {
        existing = snap.docs[0].data();
      }
    } catch (e) {
      // fallback: ignore
    }

    // Determine the items to compute totals with: prefer clean.items, else existing.items
    const itemsForCompute =
      clean.items && Array.isArray(clean.items) && clean.items.length > 0
        ? clean.items
        : existing.items || [];

    // Merge rates/shipping/ deposit/discount
    // Taxes removed
    const vatRate = 0;
    const shipping = clean.shipping ?? existing.shipping ?? 0;
    const deposit = clean.deposit ?? existing.deposit ?? 0;
    const discount = clean.discount ?? existing.discount ?? 0;

    // Recompute totals using invoice engine
    try {
      const computed = calculateInvoice(
        itemsForCompute.map((i) => ({
          id: i.id,
          name: i.name,
          quantity: i.quantity,
          isCarton: !!i.isCarton,
          cartonPrice: Number(i.cartonPrice) || 0,
          unitPrice: Number(i.unitPrice) || 0,
          unitsPerCarton: Number(i.unitsPerCarton) || 12,
        })),
        vatRate,
        shipping,
      );

      // Apply discount (percentage or absolute?) — assume absolute value discount for now
      const subtotalAfterDiscount = computed.subtotal - (Number(discount) || 0);
      const vatAmount = 0;
      const grandTotal = subtotalAfterDiscount + vatAmount + shipping;
      
      let depositVal = Number(deposit) || 0;
      let balance = grandTotal - depositVal;

      const currentStatus = clean.status || existing.status || "Pending";
      if (currentStatus === "Paid") {
        depositVal = grandTotal;
        balance = 0;
      }

      // Prepare final payload to write
      const payloadToWrite = {
        ...clean,
        items: computed.items,
        subtotal: computed.subtotal, // store original subtotal before discount
        subtotalAfterDiscount,
        vatRate,
        vatAmount,
        shipping,
        total: grandTotal,
        balance,
        discount,
        deposit: depositVal,
        status: currentStatus,
      };

      await updateDoc(ref, {
        ...payloadToWrite,
        updatedAt: serverTimestamp(),
      });

      // Synchronize status back to the linked order
      const orderIdToSync = clean.orderId || existing.orderId;
      if (orderIdToSync) {
        try {
          const orderRef = doc(db, "orders", orderIdToSync);
          const orderUpdates = {
            status: payloadToWrite.status,
            updatedAt: serverTimestamp(),
          };
          if (payloadToWrite.status === "Paid") {
            orderUpdates.deposit = payloadToWrite.total || 0;
          }
          await updateDoc(orderRef, orderUpdates);
        } catch (e) {
          console.warn("Failed to sync status from invoice to order:", e.message || e);
        }
      }

      // Return fresh document
      const freshSnap = await getDocs(
        query(collection(db, "invoices"), where("__name__", "==", invoiceId)),
      );
      if (freshSnap && freshSnap.docs && freshSnap.docs[0]) {
        return { id: invoiceId, ...freshSnap.docs[0].data() };
      }

      return { id: invoiceId, ...payloadToWrite };
    } catch (e) {
      // On error, still attempt simple update
      await updateDoc(ref, {
        ...clean,
        updatedAt: serverTimestamp(),
      });
      return { id: invoiceId, ...clean };
    }
  }, []);

  const deleteInvoice = useCallback(async (invoiceId) => {
    try {
      // delegate to db helper
      if (typeof dbDeleteInvoice === "function") {
        await dbDeleteInvoice(invoiceId);
      } else {
        const ref = doc(db, "invoices", invoiceId);
        await deleteDoc(ref);
      }
      return true;
    } catch (e) {
      console.error("Failed to delete invoice", e);
      throw e;
    }
  }, []);

  const getInvoice = useCallback(async (id) => {
    const ref = doc(db, "invoices", id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      throw new Error(`Invoice with ID ${id} not found.`);
    }
    return { id: snap.id, ...snap.data() };
  }, []);

  return { getInvoice, getCustomerInvoices, createInvoice, updateInvoice, deleteInvoice };
};

export default useInvoice;
