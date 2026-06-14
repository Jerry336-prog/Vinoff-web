// Real Firestore database service
// All CRUD operations for Products, Orders, Chats, Messages, and Users
// Uses Firestore SDK – no localStorage, no mocks.

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
  onSnapshot,
  limit,
  increment,
  runTransaction,
} from "firebase/firestore";
import { db } from "./config";
import { generateId } from "../../utils/generateId";

// ─────────────────────────────────────────
// SEED HELPER — runs once to populate products
// ─────────────────────────────────────────
const SEED_PRODUCTS = [
  {
    name: "Sparkle Fresh Liquid Dish Soap (5L)",
    image:
      "https://images.unsplash.com/photo-1607344645866-009c320c5ab8?auto=format&fit=crop&w=800&q=80",
    category: "Toiletries",
    cartonPrice: 48.0,
    unitPrice: 4.5,
    unitsPerCarton: 12,
    stock: 150,
    unitStock: 0,
    description:
      "Wholesale concentrated formula liquid dish soap. Cuts through tough grease. Packaged in bulk 5-liter containers, ideal for commercial or resale distribution.",
  },
  {
    name: "Ultra Bleach Household Sanitizer (1L)",
    image:
      "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80",
    category: "Household Cleaners",
    cartonPrice: 32.0,
    unitPrice: 1.5,
    unitsPerCarton: 24,
    stock: 80,
    unitStock: 0,
    description:
      "Commercial strength household bleach. Sanitizes surfaces, removes stains, and disinfects. Packed 24 standard 1L bottles per wholesale carton.",
  },
  {
    name: "Ocean Breeze Liquid Laundry Detergent (2L)",
    image:
      "https://images.unsplash.com/photo-1610557892470-76d739a98f40?auto=format&fit=crop&w=800&q=80",
    category: "Laundry Care",
    cartonPrice: 72.0,
    unitPrice: 7.0,
    unitsPerCarton: 12,
    stock: 120,
    unitStock: 0,
    description:
      "High-efficiency liquid laundry detergent. Formulated to dissolve oil, mud, and dirt in cold wash conditions. Fresh ocean aroma. 12 bottles per carton.",
  },
  {
    name: "Silky Touch Aloe Vera Hand Soap",
    image:
      "https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?auto=format&fit=crop&w=800&q=80",
    category: "Toiletries",
    cartonPrice: 28.8,
    unitPrice: 0.9,
    unitsPerCarton: 36,
    stock: 200,
    unitStock: 0,
    description:
      "Nourishing liquid hand wash soap enriched with organic Aloe Vera extracts. Bulk carton distribution contains 36 standard counter-pump bottles.",
  },
  {
    name: "Citrus Blast Heavy-Duty Floor Cleaner (5L)",
    image:
      "https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&w=800&q=80",
    category: "Household Cleaners",
    cartonPrice: 56.0,
    unitPrice: 5.5,
    unitsPerCarton: 12,
    stock: 95,
    unitStock: 0,
    description:
      "Professional grade floor disinfectant with long-lasting orange fragrance. Restores shine on hardwood, tiles, and laminate. 12 containers per carton.",
  },
  {
    name: "Lavender Fields Disinfecting Sprays",
    image:
      "https://images.unsplash.com/photo-1584622781564-1d987f7333c1?auto=format&fit=crop&w=800&q=80",
    category: "Household Cleaners",
    cartonPrice: 42.0,
    unitPrice: 2.2,
    unitsPerCarton: 24,
    stock: 110,
    unitStock: 0,
    description:
      "Air sanitizer and hard surface disinfectant aerosol. Destroys 99.9% of bacteria and viral spores on contact. Packed 24 spray bottles per carton.",
  },
];

/**
 * Seed products to Firestore if the collection is empty.
 * This runs once on app start.
 */
export const seedProductsIfEmpty = async () => {
  try {
    const snap = await getDocs(query(collection(db, "products"), limit(1)));
    if (snap.empty) {
      const batch = SEED_PRODUCTS.map((p) =>
        addDoc(collection(db, "products"), {
          ...p,
          createdAt: serverTimestamp(),
        }),
      );
      await Promise.all(batch);
      console.log("Products seeded to Firestore.");
    }
  } catch (err) {
    console.warn(
      "Seed skipped (may not have write permissions yet):",
      err.message,
    );
  }
};

// ─────────────────────────────────────────
// PRODUCTS
// ─────────────────────────────────────────

export const dbGetProducts = async () => {
  const snap = await getDocs(
    query(collection(db, "products"), orderBy("createdAt", "asc")),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

const numberOrDefault = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const dbAddProduct = async (product) => {
  const ref = await addDoc(collection(db, "products"), {
    ...product,
    cartonPrice: numberOrDefault(product.cartonPrice, 0),
    unitPrice: numberOrDefault(product.unitPrice, 0),
    unitsPerCarton: numberOrDefault(product.unitsPerCarton, 12),
    stock: numberOrDefault(product.stock, 0),
    unitStock: numberOrDefault(product.unitStock, 0),
    createdAt: serverTimestamp(),
  });
  return { id: ref.id, ...product };
};

export const dbUpdateProduct = async (id, updatedFields) => {
  const ref = doc(db, "products", id);
  const payload = { ...updatedFields };
  const numericDefaults = {
    cartonPrice: 0,
    unitPrice: 0,
    unitsPerCarton: 12,
    stock: 0,
    unitStock: 0,
  };

  Object.entries(numericDefaults).forEach(([field, fallback]) => {
    if (Object.prototype.hasOwnProperty.call(updatedFields, field)) {
      payload[field] = numberOrDefault(updatedFields[field], fallback);
    }
  });

  await updateDoc(ref, payload);
  const snap = await getDoc(ref);
  return { id: snap.id, ...snap.data() };
};

export const dbDeleteProduct = async (id) => {
  await deleteDoc(doc(db, "products", id));
  return true;
};

const toOrderQuantity = (value, itemName) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid quantity for ${itemName || "order item"}.`);
  }
  return parsed;
};

const getOrderInventoryRequests = (items = []) => {
  return items.reduce((requests, item) => {
    if (!item.id) {
      throw new Error(`Missing product id for ${item.name || "order item"}.`);
    }

    const existing = requests.get(item.id) || {
      name: item.name,
      cartonQty: 0,
      unitQty: 0,
    };
    const quantity = toOrderQuantity(item.quantity, item.name);

    if (item.isCarton) {
      existing.cartonQty += quantity;
    } else {
      existing.unitQty += quantity;
    }

    requests.set(item.id, existing);
    return requests;
  }, new Map());
};

const getUpdatedInventoryLevels = (product, request) => {
  const unitsPerCarton = Math.max(
    1,
    Math.floor(numberOrDefault(product.unitsPerCarton, 12)),
  );
  const currentCartons = Math.max(
    0,
    Math.floor(numberOrDefault(product.stock, 0)),
  );
  const currentUnits = Math.max(
    0,
    Math.floor(numberOrDefault(product.unitStock, 0)),
  );
  const productName = product.name || request.name || "product";

  if (currentCartons < request.cartonQty) {
    throw new Error(
      `Not enough carton stock for ${productName}. Available: ${currentCartons} cartons.`,
    );
  }

  let stock = currentCartons - request.cartonQty;
  let unitStock = currentUnits;

  if (request.unitQty > 0) {
    if (unitStock >= request.unitQty) {
      unitStock -= request.unitQty;
    } else {
      const remainingUnits = request.unitQty - unitStock;
      const cartonsToOpen = Math.ceil(remainingUnits / unitsPerCarton);

      if (stock < cartonsToOpen) {
        const availableUnits = unitStock + stock * unitsPerCarton;
        throw new Error(
          `Not enough unit stock for ${productName}. Available: ${availableUnits} units.`,
        );
      }

      stock -= cartonsToOpen;
      unitStock = cartonsToOpen * unitsPerCarton - remainingUnits;
    }
  }

  return { stock, unitStock };
};

// ─────────────────────────────────────────
// ORDERS
// ─────────────────────────────────────────

export const dbGetOrders = async () => {
  const snap = await getDocs(
    query(collection(db, "orders"), orderBy("createdAt", "desc")),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const dbGetOrdersByCustomer = async (customerId) => {
  const snap = await getDocs(
    query(
      collection(db, "orders"),
      where("customerId", "==", customerId),
      orderBy("createdAt", "desc"),
    ),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const dbCreateOrder = async (orderData) => {
  const invoiceNumber = orderData.invoiceNumber || generateId("INV", 7);
  const orderRef = doc(collection(db, "orders"));

  await runTransaction(db, async (transaction) => {
    const inventoryRequests = getOrderInventoryRequests(orderData.items);
    const inventoryUpdates = [];

    for (const [productId, request] of inventoryRequests.entries()) {
      const productRef = doc(db, "products", productId);
      const productSnap = await transaction.get(productRef);

      if (!productSnap.exists()) {
        throw new Error(`Product not found: ${request.name || productId}.`);
      }

      const levels = getUpdatedInventoryLevels(productSnap.data(), request);
      inventoryUpdates.push({ ref: productRef, ...levels });
    }

    transaction.set(orderRef, {
      ...orderData,
      invoiceNumber,
      status: "Pending Payment",
      paymentScreenshot: orderData.paymentScreenshot || null,
      createdAt: serverTimestamp(),
      date: new Date().toISOString().split("T")[0],
    });

    inventoryUpdates.forEach(({ ref, stock, unitStock }) => {
      transaction.update(ref, {
        stock,
        unitStock,
        updatedAt: serverTimestamp(),
      });
    });
  });

  // Post a system chat message to notify the customer (in their isolated room)
  await dbSendChatMessage(orderData.customerId, {
    senderId: "system",
    senderName: "System",
    senderRole: "admin", // system notices don't increment unread
    text: `Your order ${orderRef.id} has been submitted. Ref: ${invoiceNumber}. Please complete bank wire transfer and upload screenshot.`,
    type: "system",
    orderRef: orderRef.id,
    invoiceRef: invoiceNumber,
  });

  return { id: orderRef.id, ...orderData, invoiceNumber };
};

export const dbUpdateOrderStatus = async (orderId, status) => {
  const ref = doc(db, "orders", orderId);
  const orderSnap = await getDoc(ref);
  const orderData = orderSnap?.exists() ? orderSnap.data() : null;

  const orderUpdates = { status };
  if (status === "Paid" && orderData) {
    orderUpdates.deposit = orderData.total || 0;
  }

  await updateDoc(ref, orderUpdates);
  const snap = await getDoc(ref);

  // Notify the customer in chat
  const data = snap.data();

  // If order links to an invoice, mirror status
  try {
    if (data?.invoiceId) {
      const invRef = doc(db, "invoices", data.invoiceId);
      const invUpdates = { status, updatedAt: serverTimestamp() };
      if (status === "Paid") {
        const invSnap = await getDoc(invRef);
        if (invSnap.exists()) {
          const invData = invSnap.data();
          invUpdates.deposit = invData.total || 0;
          invUpdates.balance = 0;
        }
      }
      await updateDoc(invRef, invUpdates);
    }
  } catch (e) {
    console.warn("Failed to mirror order status to invoice:", e.message || e);
  }

  if (data?.customerId) {
    await dbSendChatMessage(data.customerId, {
      senderId: "system",
      senderName: "System",
      text: `Order ${orderId} status has been updated to: ${status}.`,
      type: "system",
      orderRef: orderId,
    });
  }

  return { id: snap.id, ...data };
};

export const dbSubmitOrderPayment = async (
  orderId,
  screenshotUrl,
  customerId,
) => {
  const ref = doc(db, "orders", orderId);
  await updateDoc(ref, {
    status: "Awaiting Confirmation",
    paymentScreenshot: screenshotUrl,
  });

  // Send screenshot in the customer's own isolated chat room
  await dbSendChatMessage(customerId, {
    senderId: customerId,
    senderName: "Customer",
    senderRole: "customer", // this will increment unread for admin to notice
    text: `Payment transfer screenshot submitted for Order ${orderId}.`,
    type: "text",
    image: screenshotUrl,
  });

  await dbUpdateChatRoomStatus(customerId, "Awaiting Payment Confirmation");
  const snap = await getDoc(ref);
  return { id: snap.id, ...snap.data() };
};

// ─────────────────────────────────────────
// CHATS (one room per customer UID)
// ─────────────────────────────────────────

/**
 * Get all chat rooms (for admin view).
 * Each room doc lives at /chats/{customerId}.
 */
export const dbGetChats = async () => {
  const snap = await getDocs(
    query(collection(db, "chats"), orderBy("updatedAt", "desc")),
  );
  const rooms = snap.docs.map((d) => ({ roomId: d.id, ...d.data() }));

  // If rooms already contain a lastMessage field, use it; avoid fetching messages for everyone.
  const withMessages = rooms.map((room) => {
    const lastMsg = room.lastMessage || null;
    return {
      ...room,
      lastMessage: lastMsg,
      messages: lastMsg ? [lastMsg] : [],
    };
  });

  return withMessages;
};

/**
 * Get or create a chat room document for a customer.
 * Room ID is the customer's UID — each registered user gets exactly
 * one room that only they and admins can see.
 */
export const dbGetChatByRoom = async (roomId, customerProfile = null) => {
  const ref = doc(db, "chats", roomId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    // Create room for new customer
    const profile = customerProfile || {};
    const roomData = {
      customerId: roomId,
      customerName: profile.name || "Valued Buyer",
      businessName: profile.businessName || "Wholesale Merchant",
      status: "Open",
      unreadCount: 0,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    };
    await setDoc(ref, roomData);

    // Post welcome message — senderRole: admin so it doesn't count as unread
    await addDoc(collection(db, "chats", roomId, "messages"), {
      senderId: "admin-system",
      senderName: "Vinoff Support",
      senderRole: "admin",
      text: "Welcome to Vinoff Wholesales! Chat with us to negotiate prices, request custom invoices, or confirm bank transfers.",
      type: "system",
      timestamp: serverTimestamp(),
    });

    const msgs = await dbGetChatMessages(roomId);
    return { roomId, ...roomData, messages: msgs };
  }

  const msgs = await dbGetChatMessages(roomId);
  return { roomId, ...snap.data(), messages: msgs };
};

/**
 * Get all messages for a chat room, ordered by timestamp ascending.
 */
export const dbGetChatMessages = async (roomId) => {
  const snap = await getDocs(
    query(
      collection(db, "chats", roomId, "messages"),
      orderBy("timestamp", "asc"),
    ),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

/**
 * Send a message to a chat room. Writes to the /messages sub-collection.
 *
 * Each room lives at /chats/{customerId} — messages are fully isolated
 * per user. Only the customer whose UID matches the roomId will ever
 * load this sub-collection.
 *
 * senderRole: "customer" | "admin" — determines unread count behaviour.
 * Admin and system messages never increment unreadCount.
 */
export const dbSendChatMessage = async (roomId, messageData) => {
  // Ensure room exists
  const roomRef = doc(db, "chats", roomId);
  let roomSnap = await getDoc(roomRef);
  if (!roomSnap.exists()) {
    await setDoc(roomRef, {
      customerId: roomId,
      customerName: messageData.senderName || "Customer",
      businessName: "Unknown",
      status: "Open",
      unreadCount: 0,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    });
    // re-read the room snapshot after creating it
    roomSnap = await getDoc(roomRef);
  }

  const msgPayload = {
    senderId: messageData.senderId || "unknown",
    senderName: messageData.senderName || "User",
    // senderRole is used to distinguish admin vs customer messages reliably
    // without depending on hardcoded IDs like "admin-1"
    senderRole: messageData.senderRole || "customer",
    text: messageData.text || "",
    image: messageData.image || null,
    type: messageData.type || "text",
    invoiceRef: messageData.invoiceRef || null,
    orderRef: messageData.orderRef || null,
    invoicePdfUrl: messageData.invoicePdfUrl || null,
    timestamp: serverTimestamp(),
  };

  const ref = await addDoc(
    collection(db, "chats", roomId, "messages"),
    msgPayload,
  );

  // Build a lastMessage summary to store on the room doc
  const lastMessageSummary = {
    id: ref.id,
    senderId: msgPayload.senderId,
    senderName: msgPayload.senderName,
    senderRole: msgPayload.senderRole,
    text: msgPayload.text,
    type: msgPayload.type,
    timestamp: serverTimestamp(),
  };

  // Only increment unreadCount when a CUSTOMER sends a message.
  // Admin replies and system notices must NOT trigger the unread badge.
  const isCustomerSending =
    msgPayload.senderRole === "customer" &&
    msgPayload.senderId !== "system" &&
    msgPayload.type !== "system";

  if (isCustomerSending) {
    await updateDoc(roomRef, {
      updatedAt: serverTimestamp(),
      unreadCount: increment(1),
      lastMessage: lastMessageSummary,
    });
  } else {
    await updateDoc(roomRef, {
      updatedAt: serverTimestamp(),
      lastMessage: lastMessageSummary,
    });
  }

  return { id: ref.id, ...messageData };
};

export const dbClearChatUnread = async (roomId) => {
  const ref = doc(db, "chats", roomId);
  await updateDoc(ref, { unreadCount: 0 });
};

export const dbUpdateChatRoomStatus = async (roomId, status) => {
  const ref = doc(db, "chats", roomId);
  await updateDoc(ref, { status, updatedAt: serverTimestamp() });
};

/**
 * Real-time listener on a chat room's messages sub-collection.
 * Returns unsubscribe function.
 */
export const dbSubscribeToChatMessages = (roomId, callback) => {
  const q = query(
    collection(db, "chats", roomId, "messages"),
    orderBy("timestamp", "asc"),
  );
  return onSnapshot(q, (snap) => {
    const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(msgs);
  });
};

/**
 * Real-time listener on all chat rooms (for admin).
 * Returns unsubscribe function.
 */
export const dbSubscribeToChats = (callback) => {
  const q = query(collection(db, "chats"), orderBy("updatedAt", "desc"));
  return onSnapshot(q, async (snap) => {
    const rooms = snap.docs.map((d) => ({ roomId: d.id, ...d.data() }));
    callback(rooms);
  });
};

/**
 * Update the typing status for admin or customer inside the room metadata.
 */
export const dbUpdateTypingState = async (roomId, isTyping, role) => {
  const ref = doc(db, "chats", roomId);
  const updateData = {};
  if (role === "admin") {
    updateData.typingAdmin = isTyping;
  } else {
    updateData.typingCustomer = isTyping;
  }
  await updateDoc(ref, updateData);
};

/**
 * Real-time listener on a single chat room document.
 */
export const dbSubscribeToChatRoom = (roomId, callback) => {
  const ref = doc(db, "chats", roomId);
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      callback({ roomId: snap.id, ...snap.data() });
    }
  });
};

// ─────────────────────────────────────────
// USERS (profile + role management)
// ─────────────────────────────────────────

/**
 * Get all user profiles from Firestore.
 * Used in admin Customers page.
 */
export const dbGetAllUsers = async () => {
  const snap = await getDocs(
    query(collection(db, "users"), orderBy("createdAt", "asc")),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

/**
 * Update a user's role in Firestore.
 * Calling this from the Admin Customers page promotes/demotes a user.
 * The user's role takes effect on their NEXT login (AuthContext reloads on auth change).
 */
export const dbUpdateUserRole = async (uid, role) => {
  if (role !== "admin" && role !== "customer") {
    throw new Error('Role must be "admin" or "customer"');
  }
  await updateDoc(doc(db, "users", uid), { role });
  return true;
};

/**
 * Get a single user profile by UID.
 */
export const dbGetUser = async (uid) => {
  const snap = await getDoc(doc(db, "users", uid));
  if (snap.exists()) return { id: snap.id, ...snap.data() };
  return null;
};

// ─────────────────────────────────────────
// INVOICES
// ─────────────────────────────────────────

export const dbGetInvoiceById = async (invoiceId) => {
  const ref = doc(db, "invoices", invoiceId);
  const snap = await getDoc(ref);
  if (snap.exists()) return { id: snap.id, ...snap.data() };
  return null;
};

export const dbAttachInvoiceToOrder = async (
  orderId,
  invoiceId,
  invoiceNumber,
) => {
  const ref = doc(db, "orders", orderId);
  await updateDoc(ref, {
    invoiceId,
    invoiceNumber,
    updatedAt: serverTimestamp(),
  });
  const snap = await getDoc(ref);
  return { id: snap.id, ...snap.data() };
};

export const dbDeleteInvoice = async (invoiceId) => {
  await deleteDoc(doc(db, "invoices", invoiceId));
  return true;
};

// ─────────────────────────────────────────
// CUSTOMERS
// ─────────────────────────────────────────

/**
 * Update or create a customer profile.
 * customerId is the document ID in Firestore.
 */
