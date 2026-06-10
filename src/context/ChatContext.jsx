import React, { createContext, useState, useEffect, useContext, useRef, useCallback } from "react";
import {
  dbGetChatByRoom,
  dbSendChatMessage,
  dbClearChatUnread,
  dbUpdateChatRoomStatus,
  dbSubscribeToChats,
  dbSubscribeToChatMessages,
} from "../services/firebase/db";
import { AuthContext } from "./AuthContext";

export const ChatContext = createContext({
  rooms: [],
  activeRoom: null,
  loading: false,
  selectRoom: async () => {},
  sendMessage: async () => {},
  updateRoomStatus: async () => {},
  refreshRooms: async () => {},
});

export const ChatProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [loading, setLoading] = useState(false);

  // Refs to hold active Firestore unsubscribe functions
  const roomsUnsubRef = useRef(null);
  const messagesUnsubRef = useRef(null);

  /**
   * Subscribe to real-time messages for a specific room.
   * Automatically tears down the previous subscription first.
   */
  const subscribeToRoomMessages = useCallback((roomId) => {
    // Tear down any existing message subscription
    if (messagesUnsubRef.current) {
      messagesUnsubRef.current();
      messagesUnsubRef.current = null;
    }

    const unsub = dbSubscribeToChatMessages(roomId, (messages) => {
      setActiveRoom((prev) => {
        if (!prev || prev.roomId !== roomId) return prev;
        return { ...prev, messages };
      });
    });

    messagesUnsubRef.current = unsub;
  }, []);

  /**
   * Tear down all active subscriptions cleanly.
   */
  const tearDownAll = useCallback(() => {
    if (roomsUnsubRef.current) {
      roomsUnsubRef.current();
      roomsUnsubRef.current = null;
    }
    if (messagesUnsubRef.current) {
      messagesUnsubRef.current();
      messagesUnsubRef.current = null;
    }
  }, []);

  // Main effect: sets up the right subscriptions based on user role
  useEffect(() => {
    if (!user) {
      setRooms([]);
      setActiveRoom(null);
      tearDownAll();
      return;
    }

    setLoading(true);

    if (user.role === "admin") {
      // Admin: subscribe to ALL chat rooms in real-time (sidebar list)
      const unsub = dbSubscribeToChats((updatedRooms) => {
        setRooms(updatedRooms);
        setLoading(false);
      });
      roomsUnsubRef.current = unsub;
    } else {
      // Customer: get/create their dedicated room, then subscribe to its messages
      dbGetChatByRoom(user.uid, {
        name: user.name,
        businessName: user.businessName,
      })
        .then((room) => {
          setActiveRoom(room);
          setRooms([room]);
          // Subscribe to real-time messages for this customer's room only
          subscribeToRoomMessages(user.uid);
        })
        .catch((err) => console.error("Failed to load customer chat room:", err))
        .finally(() => setLoading(false));
    }

    return () => tearDownAll();
  }, [user?.uid, user?.role]);

  /**
   * Admin selects a customer's chat room.
   * Fetches the room metadata once, clears unread, then subscribes to
   * that room's messages in real-time — isolated to only that customer.
   */
  const selectRoom = async (roomId) => {
    if (!roomId) {
      setActiveRoom(null);
      if (messagesUnsubRef.current) {
        messagesUnsubRef.current();
        messagesUnsubRef.current = null;
      }
      return;
    }
    setLoading(true);
    try {
      const room = await dbGetChatByRoom(roomId);
      setActiveRoom(room);
      await dbClearChatUnread(roomId);
      // Subscribe to live messages for the selected room
      subscribeToRoomMessages(roomId);
    } catch (error) {
      console.error("Error selecting chat room:", error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Send a message to a specific room (by roomId).
   * Messages are written to /chats/{roomId}/messages — completely isolated
   * to that user. No other user will see this message.
   *
   * The senderRole field tells the DB layer whether to increment unread count
   * (only increments for customer messages, not admin or system).
   */
  const sendMessage = async (roomId, messageText, options = {}) => {
    if (!user) return;

    const isAdmin = user.role === "admin";

    const messageData = {
      senderId: user.uid,
      senderName: user.name || (isAdmin ? "Vinoff Admin" : "Customer"),
      senderRole: isAdmin ? "admin" : "customer",
      text: messageText,
      image: options.image || null,
      type: options.type || "text",
      invoiceRef: options.invoiceRef || null,
      orderRef: options.orderRef || null,
      invoicePdfUrl: options.invoicePdfUrl || null,
    };

    try {
      const msg = await dbSendChatMessage(roomId, messageData);

      // Trigger auto-reply only for customer messages (not system/admin)
      if (!isAdmin && options.type !== "system") {
        setTimeout(() => {
          simulateSupportReply(roomId, messageText);
        }, 3000);
      }

      return msg;
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  /**
   * Automated support reply — simulates a response from Vinoff Support.
   * Sends with senderRole: "admin" so it does NOT increment unread count
   * and is not attributed to the customer.
   */
  const simulateSupportReply = async (roomId, clientMessage) => {
    let replyText =
      "Thank you for contacting Vinoff Wholesales! An administrator has been notified and will reply shortly.";
    const textLower = clientMessage.toLowerCase();

    if (
      textLower.includes("payment") ||
      textLower.includes("transfer") ||
      textLower.includes("screenshot")
    ) {
      replyText =
        "Thank you for submitting details. Our finance team will review the transaction screenshot and change your order status to 'Paid' inside 24 hours.";
    } else if (textLower.includes("invoice") || textLower.includes("bill")) {
      replyText =
        "We can arrange customized invoices for bulk purchases. Please list the quantities needed here so our team can draft an invoice.";
    } else if (
      textLower.includes("discount") ||
      textLower.includes("carton")
    ) {
      replyText =
        "Yes! We offer bulk carton discounts: buying full cartons reduces the per-unit cost automatically. You can check discounts on the Shop shelf.";
    }

    const messageData = {
      senderId: "admin-system",
      senderName: "Vinoff Support",
      senderRole: "admin", // ensures unread count is NOT incremented
      text: replyText,
      type: "text",
    };

    try {
      await dbSendChatMessage(roomId, messageData);
      await dbUpdateChatRoomStatus(roomId, "Open");
    } catch (e) {
      console.error("Auto-reply failed:", e);
    }
  };

  const updateRoomStatus = async (roomId, status) => {
    try {
      await dbUpdateChatRoomStatus(roomId, status);
    } catch (error) {
      console.error("Error updating room status:", error);
    }
  };

  /**
   * Manual refresh helper — still used by some admin invoice actions.
   * For admins the live subscription handles it automatically, but this
   * allows explicit refresh triggers from other components.
   */
  const refreshRooms = async () => {
    if (!user) return;
    if (user.role !== "admin" && user.uid) {
      try {
        const room = await dbGetChatByRoom(user.uid);
        setActiveRoom((prev) => ({
          ...prev,
          ...room,
          messages: prev?.messages || room.messages,
        }));
        setRooms([room]);
      } catch (err) {
        console.error("refreshRooms error:", err);
      }
    }
    // For admin, the onSnapshot subscription already keeps rooms current
  };

  const value = {
    rooms,
    activeRoom,
    loading,
    selectRoom,
    sendMessage,
    updateRoomStatus,
    refreshRooms,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
