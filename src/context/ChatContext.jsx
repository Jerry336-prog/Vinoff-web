import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useRef,
  useCallback,
} from "react";
import api from "../services/api";
import { createIdempotencyKey, withIdempotencyKey } from "../services/idempotency";
import { AuthContext } from "./AuthContext";
import { unwrapApiList, unwrapApiRecord } from "../utils/apiResponse";
import { getAvatarUrl } from "../utils/avatar";
import { formatChatStatus, toChatStatusValue } from "../utils/chat";

export const ChatContext = createContext({
  rooms: [],
  activeRoom: null,
  loading: false,
  selectRoom: async () => {},
  sendMessage: async () => {},
  updateRoomStatus: async () => {},
  deleteRoom: async () => {},
  refreshRooms: async () => {},
  setTypingState: async () => {},
  createOrGetCustomerRoom: async () => {},
});

const getEntityId = (entity) => {
  if (!entity) return null;
  if (typeof entity === "string") return entity;
  return entity._id || entity.id || entity.uid || null;
};

const sameId = (left, right) => {
  if (!left || !right) return false;
  return String(left) === String(right);
};

const normalizeAttachments = (attachments = []) => {
  const list = Array.isArray(attachments) ? attachments : [attachments];

  return list
    .filter(Boolean)
    .map((attachment) => {
      if (typeof attachment === "string") {
        return { url: attachment, type: "image" };
      }

      return {
        ...attachment,
        url:
          attachment.url ||
          attachment.secure_url ||
          attachment.image ||
          attachment.src ||
          attachment.path ||
          "",
        type: attachment.type || attachment.resourceType || "file",
        name: attachment.name || attachment.filename || "",
      };
    })
    .filter((attachment) => attachment.url);
};

const isImageAttachment = (attachment) => {
  const type = String(attachment?.type || "");
  const url = String(attachment?.url || "");

  if (type.includes("pdf") || /\.pdf(\?.*)?$/i.test(url)) return false;

  return (
    type.startsWith("image") ||
    /\.(avif|gif|jpe?g|png|webp|svg)(\?.*)?$/i.test(url)
  );
};

const getMessageImage = (message, attachments = normalizeAttachments(message?.attachments)) => {
  const imageAttachment = attachments.find(isImageAttachment);

  return (
    message?.image ||
    message?.imageUrl ||
    message?.attachmentUrl ||
    imageAttachment?.url ||
    null
  );
};

const normalizeMessage = (message, currentUserId) => {
  if (!message || typeof message !== "object") return null;

  const sender = typeof message.sender === "object" ? message.sender : null;
  const senderId =
    getEntityId(sender) ||
    message.senderId ||
    message.userId ||
    (typeof message.sender === "string" ? message.sender : null);
  const senderRole =
    message.senderRole ||
    message.role ||
    sender?.role ||
    (message.isSystem ? "system" : "customer");
  const text =
    message.content ||
    message.text ||
    message.message ||
    message.body ||
    message.caption ||
    "";
  const attachments = normalizeAttachments(message.attachments);
  const createdAt =
    message.createdAt ||
    message.timestamp ||
    message.sentAt ||
    message.updatedAt ||
    new Date().toISOString();
  const senderName =
    message.senderName ||
    (sender?.firstName
      ? `${sender.firstName} ${sender.lastName || ""}`.trim()
      : sender?.name) ||
    (senderRole === "admin" || senderRole === "subAdmin" ? "Support Admin" : "Customer");

  return {
    ...message,
    id: message._id || message.id || `${senderId || "msg"}-${createdAt}`,
    _id: message._id || message.id,
    text,
    content: text,
    senderId,
    senderRole,
    senderName,
    senderAvatar: getAvatarUrl(sender) || getAvatarUrl(message) || null,
    type:
      message.type ||
      (message.isSystem || senderRole === "system" ? "system" : "text"),
    timestamp: createdAt,
    createdAt,
    attachments,
    image: getMessageImage(message, attachments),
    invoiceRef: message.invoiceRef || message.invoiceId || message.invoice?._id || message.invoice?.id,
    invoicePdfUrl: message.invoicePdfUrl || message.invoice?.pdfUrl,
    orderRef: message.orderRef || message.orderId || message.order?._id || message.order?.id,
    isSelf: Boolean(senderId && currentUserId && sameId(senderId, currentUserId)),
  };
};

const normalizeLastMessage = (chat, currentUserId) => {
  const last = chat.lastMessage || chat.latestMessage || chat.last_message;

  if (!last) return null;

  if (typeof last === "string") {
    return normalizeMessage(
      {
        text: last,
        createdAt: chat.lastMessageAt || chat.updatedAt || chat.createdAt,
        senderRole: chat.lastMessageSenderRole,
      },
      currentUserId,
    );
  }

  return normalizeMessage(last, currentUserId);
};

const normalizeRoom = (chat, isAdmin, currentUserId) => {
  if (!chat || typeof chat !== "object") return null;
  const customer =
    typeof chat.customer === "object"
      ? chat.customer
      : typeof chat.user === "object"
        ? chat.user
        : typeof chat.buyer === "object"
          ? chat.buyer
          : null;
  const roomId = chat.roomId || chat._id || chat.id || chat.chatId || getEntityId(customer);
  const customerName =
    chat.customerName ||
    chat.name ||
    (customer?.firstName
      ? `${customer.firstName} ${customer.lastName || ""}`.trim()
      : customer?.name) ||
    customer?.email ||
    chat.title ||
    "Customer";
  const businessName =
    chat.businessName ||
    customer?.profile?.companyName ||
    customer?.companyName ||
    customer?.businessName ||
    chat.companyName ||
    chat.title ||
    customerName;
  const messages = unwrapApiList({ messages: chat.messages })
    .map((message) => normalizeMessage(message, currentUserId))
    .filter(Boolean);
  const lastMessage = normalizeLastMessage(chat, currentUserId) || messages[messages.length - 1] || null;
  const unreadCount = isAdmin
    ? chat.unreadForAdmin ?? chat.unreadCount?.admin ?? chat.unreadCount ?? 0
    : chat.unreadForCustomer ?? chat.unreadCount?.customer ?? chat.unreadCount ?? 0;

  return {
    ...chat,
    id: roomId,
    roomId,
    customerId:
      chat.customerId ||
      getEntityId(customer) ||
      (typeof chat.customer === "string" ? chat.customer : null),
    customer,
    customerName,
    businessName,
    avatarUrl: getAvatarUrl(customer) || getAvatarUrl(chat),
    unreadCount: Number(unreadCount) || 0,
    lastMessage,
    status: toChatStatusValue(chat.status || "open"),
    statusLabel: formatChatStatus(chat.status || "open"),
    messages,
  };
};

const mergeMessages = (serverMessages = [], localMessages = []) => {
  if (!serverMessages || serverMessages.length === 0) {
    return localMessages || [];
  }
  if (!localMessages || localMessages.length === 0) {
    return serverMessages || [];
  }

  const byId = new Map();
  localMessages.forEach((message) => {
    if (message?.id) byId.set(String(message.id), message);
  });

  serverMessages.forEach((message) => {
    if (message?.id) byId.set(String(message.id), message);
  });

  return Array.from(byId.values()).sort(
    (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0),
  );
};

const roomSnapshot = (room) =>
  [
    room?.roomId,
    room?.status,
    room?.unreadCount,
    room?.lastMessage?.text || room?.lastMessage?.content || "",
    (room?.messages || []).map((message) => message._id || message.id || message.timestamp).join(","),
  ].join("|");

export const ChatProvider = ({ children }) => {
  const { user, isAdmin } = useContext(AuthContext);
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [loading, setLoading] = useState(false);

  const activeRoomRef = useRef(activeRoom);
  const currentUserId = user?._id || user?.id || user?.uid;

  useEffect(() => {
    activeRoomRef.current = activeRoom;
  }, [activeRoom]);

  const refreshRooms = useCallback(async () => {
    if (!user) {
      setRooms([]);
      return [];
    }
    try {
      const res = await api.get("/api/chats?limit=100");
      const list = unwrapApiList(res);
      const normalized = (Array.isArray(list) ? list : [])
        .map((chat) => normalizeRoom(chat, isAdmin, currentUserId))
        .filter(Boolean);

      // Deduplicate by customer ID so each customer only appears ONCE
      const customerMap = new Map();
      normalized.forEach((room) => {
        const custKey = room.customerId || room.customer?._id || room.customer?.id || room.roomId;
        if (!custKey || !customerMap.has(custKey)) {
          customerMap.set(custKey, room);
        }
      });
      const deduplicated = Array.from(customerMap.values());

      setRooms((prev) => {
        const prevKeys = prev.map((r) => `${r.roomId}:${r.unreadCount}:${r.lastMessage?.text}`).join("|");
        const nextKeys = deduplicated.map((r) => `${r.roomId}:${r.unreadCount}:${r.lastMessage?.text}`).join("|");
        if (prevKeys === nextKeys) return prev;
        return deduplicated;
      });

      if (activeRoomRef.current) {
        const found = deduplicated.find(
          (room) =>
            room.roomId === activeRoomRef.current.roomId ||
            (room.customerId && room.customerId === activeRoomRef.current.customerId),
        );
        if (found) {
          setActiveRoom((prev) => {
            if (!prev) return prev;
            const mergedMessages = mergeMessages(found.messages || [], prev.messages || []);
            const next = {
              ...prev,
              ...found,
              unreadCount: 0,
              messages: mergedMessages,
            };
            if (roomSnapshot(prev) === roomSnapshot(next)) return prev;
            return next;
          });
        }
      }

      return deduplicated;
    } catch (err) {
      console.warn("Failed to fetch chats:", err.message);
      return [];
    }
  }, [user, isAdmin, currentUserId]);

  const fetchMessagesForRoom = useCallback(
    async (roomId, silent = false) => {
      if (!roomId) return [];
      try {
        const res = await api.get(`/api/chats/${roomId}/messages?limit=200`);
        const rawMessages = unwrapApiList(res);
        const normalizedMessages = (Array.isArray(rawMessages) ? rawMessages : [])
          .map((message) => normalizeMessage(message, currentUserId))
          .filter(Boolean);

        setActiveRoom((prev) => {
          if (!prev || prev.roomId !== roomId) return prev;
          const merged = mergeMessages(normalizedMessages, prev.messages || []);
          const prevIds = (prev.messages || []).map((message) => message.id).join("|");
          const nextIds = merged.map((message) => message.id).join("|");
          if (prevIds === nextIds) return prev;
          return { ...prev, messages: merged };
        });

        return normalizedMessages;
      } catch (err) {
        if (!silent) {
          console.warn("Failed to fetch messages for room:", err.message);
        }
        return [];
      }
    },
    [currentUserId],
  );

  useEffect(() => {
    refreshRooms();
  }, [refreshRooms]);

  useEffect(() => {
    if (!user) return undefined;

    const interval = setInterval(() => {
      if (activeRoomRef.current?.roomId) {
        fetchMessagesForRoom(activeRoomRef.current.roomId, true);
      }
      refreshRooms();
    }, 4000);

    return () => clearInterval(interval);
  }, [user, fetchMessagesForRoom, refreshRooms]);

  const selectRoom = useCallback(
    async (roomIdOrObj) => {
      if (!roomIdOrObj) {
        setActiveRoom(null);
        return null;
      }
      const roomId =
        typeof roomIdOrObj === "object"
          ? roomIdOrObj?.roomId || roomIdOrObj?._id || roomIdOrObj?.id
          : roomIdOrObj;
      if (!roomId) {
        setActiveRoom(null);
        return null;
      }

      const isAlreadyActive = activeRoomRef.current?.roomId === roomId;
      if (!isAlreadyActive) {
        setLoading(true);
        const preview =
          typeof roomIdOrObj === "object"
            ? normalizeRoom(roomIdOrObj, isAdmin, currentUserId)
            : rooms.find((room) => room.roomId === roomId);
        if (preview) {
          const clearedPreview = { ...preview, unreadCount: 0 };
          setActiveRoom(clearedPreview);
        }
      } else {
        setActiveRoom((prev) => (prev ? { ...prev, unreadCount: 0 } : prev));
      }

      setRooms((prev) =>
        prev.map((r) => (r.roomId === roomId ? { ...r, unreadCount: 0 } : r)),
      );

      try {
        const chatRes = await api.get(`/api/chats/${roomId}`);
        const chat = normalizeRoom(unwrapApiRecord(chatRes), isAdmin, currentUserId);
        if (!chat) return null;

        const chatWithZeroUnread = { ...chat, unreadCount: 0 };

        setActiveRoom((prev) => ({
          ...chatWithZeroUnread,
          messages: prev?.roomId === roomId ? prev.messages || [] : chat.messages || [],
        }));

        await fetchMessagesForRoom(roomId);
        await api.patch(`/api/chats/${roomId}/read`).catch(() => {});
        await refreshRooms();
        return chatWithZeroUnread;
      } catch (err) {
        console.error("Failed to select room:", err);
        return null;
      } finally {
        if (!isAlreadyActive) {
          setLoading(false);
        }
      }
    },
    [isAdmin, currentUserId, fetchMessagesForRoom, refreshRooms, rooms],
  );

  const createOrGetCustomerRoom = useCallback(
    async (orderId = null, customerId = null) => {
      setLoading(true);
      try {
        const payload = {};
        if (orderId) payload.orderId = orderId;
        if (customerId) payload.customerId = customerId;

        const res = await api.post(
          "/api/chats",
          payload,
          withIdempotencyKey(createIdempotencyKey(`chat-room-${orderId || customerId || "customer"}`)),
        );
        const chat = normalizeRoom(unwrapApiRecord(res), isAdmin, currentUserId);
        if (!chat) throw new Error("Chat room could not be created");
        setActiveRoom(chat);
        await fetchMessagesForRoom(chat.roomId);
        await refreshRooms();
        return chat;
      } catch (err) {
        console.error("Failed to create/get chat:", err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [isAdmin, currentUserId, fetchMessagesForRoom, refreshRooms],
  );

  const sendMessage = useCallback(
    async (...args) => {
      const [first, second, third] = args;
      const hasExplicitRoom =
        args.length >= 3 || (args.length >= 2 && typeof second === "string");
      const roomId = hasExplicitRoom ? first : activeRoomRef.current?.roomId;
      const text = hasExplicitRoom ? second : first;
      const attachment = hasExplicitRoom ? third : second;
      const trimmedText = typeof text === "string" ? text.trim() : "";

      if (!roomId) return;
      if (!trimmedText && !attachment) return;

      const isFileUpload =
        attachment &&
        ((typeof File !== "undefined" && attachment instanceof File) ||
          (typeof Blob !== "undefined" && attachment instanceof Blob));
      const isImageFile = isFileUpload && String(attachment.type || "").startsWith("image");

      const optimisticId = `temp-${Date.now()}`;
      const optimisticImage = isImageFile
        ? URL.createObjectURL(attachment)
        : attachment?.image || attachment?.url || null;
      const optimisticMessage = normalizeMessage(
        {
          id: optimisticId,
          _id: optimisticId,
          _optimistic: true,
          text: trimmedText,
          content: trimmedText,
          sender: user,
          senderId: currentUserId,
          senderRole: isAdmin ? "admin" : "customer",
          image: optimisticImage,
          attachments: optimisticImage
            ? [{ url: optimisticImage, type: attachment?.type || "image", name: attachment?.name }]
            : [],
          createdAt: new Date().toISOString(),
        },
        currentUserId,
      );

      if (optimisticMessage) {
        setActiveRoom((prev) => {
          if (!prev || prev.roomId !== roomId) return prev;
          return {
            ...prev,
            messages: [...(prev.messages || []), optimisticMessage],
            lastMessage: optimisticMessage,
          };
        });
      }

      try {
        const messageKey = createIdempotencyKey(`chat-message-${roomId}`);
        let res;
        if (isFileUpload) {
          const formData = new FormData();
          if (trimmedText) {
            formData.append("content", trimmedText);
            formData.append("text", trimmedText);
          }
          formData.append("attachments", attachment);
          res = await api.post(
            `/api/chats/${roomId}/messages`,
            formData,
            withIdempotencyKey(messageKey),
          );
        } else {
          const imageUrl =
            attachment?.image ||
            (attachment?.type?.startsWith("image") ? attachment?.url : null) ||
            null;
          const fileUrl = attachment?.url || attachment?.pdfUrl || imageUrl;
          const payload = {
            content: trimmedText,
            text: trimmedText,
          };

          if (attachment?.invoiceRef || attachment?.invoiceId) {
            payload.invoiceRef = attachment.invoiceRef || attachment.invoiceId;
          }
          if (attachment?.invoicePdfUrl) {
            payload.invoicePdfUrl = attachment.invoicePdfUrl;
          }

          if (fileUrl) {
            if (imageUrl) payload.image = imageUrl;
            payload.attachments = [
              {
                url: fileUrl,
                type: attachment?.type || (fileUrl.toLowerCase().includes(".pdf") ? "pdf" : "image"),
                name: attachment?.name || "Attachment",
              },
            ];
          }

          res = await api.post(
            `/api/chats/${roomId}/messages`,
            payload,
            withIdempotencyKey(messageKey),
          );
        }

        const newMsg = normalizeMessage(unwrapApiRecord(res), currentUserId);

        setActiveRoom((prev) => {
          if (!prev || prev.roomId !== roomId) return prev;
          const withoutOptimistic = (prev.messages || []).filter(
            (message) => message.id !== optimisticId,
          );
          const exists = withoutOptimistic.some((message) => message.id === newMsg?.id);
          return {
            ...prev,
            messages: exists
              ? withoutOptimistic
              : [...withoutOptimistic, newMsg].filter(Boolean),
            lastMessage: newMsg || prev.lastMessage,
          };
        });
        if (optimisticImage?.startsWith?.("blob:")) {
          URL.revokeObjectURL(optimisticImage);
        }

        await refreshRooms();
        return newMsg;
      } catch (err) {
        setActiveRoom((prev) => {
          if (!prev || prev.roomId !== roomId) return prev;
          return {
            ...prev,
            messages: (prev.messages || []).filter((message) => message.id !== optimisticId),
          };
        });
        if (optimisticImage?.startsWith?.("blob:")) {
          URL.revokeObjectURL(optimisticImage);
        }
        console.error("Failed to send message:", err);
        throw err;
      }
    },
    [currentUserId, isAdmin, user, refreshRooms],
  );

  const updateRoomStatus = useCallback(
    async (roomId, status) => {
      if (!roomId || !status) return;
      const nextStatus = toChatStatusValue(status);

      setRooms((prev) =>
        prev.map((room) =>
          room.roomId === roomId
            ? { ...room, status: nextStatus, statusLabel: formatChatStatus(nextStatus) }
            : room,
        ),
      );
      setActiveRoom((prev) =>
        prev?.roomId === roomId
          ? { ...prev, status: nextStatus, statusLabel: formatChatStatus(nextStatus) }
          : prev,
      );

      try {
        await api.patch(`/api/chats/${roomId}/status`, { status: nextStatus });
        await refreshRooms();
      } catch (err) {
        console.error("Failed to update chat status:", err);
        await refreshRooms();
        throw err;
      }
    },
    [refreshRooms],
  );

  const deleteRoom = useCallback(
    async (roomId) => {
      if (!roomId) return;
      try {
        await api.delete(`/api/chats/${roomId}`);
      } catch (err) {
        console.warn("Delete chat API call failed:", err.message);
      }

      setRooms((prev) => prev.filter((room) => room.roomId !== roomId));
      setActiveRoom((prev) => (prev?.roomId === roomId ? null : prev));
      await refreshRooms();
    },
    [refreshRooms],
  );

  const setTypingState = useCallback(async () => {}, []);

  const [isRefreshingChat, setIsRefreshingChat] = useState(false);

  const refreshChat = useCallback(async () => {
    setIsRefreshingChat(true);
    try {
      await refreshRooms();
      const currentActiveRoom = activeRoomRef.current;
      if (currentActiveRoom?.roomId) {
        const roomId = currentActiveRoom.roomId;
        try {
          const chatRes = await api.get(`/api/chats/${roomId}`);
          const updatedRoom = normalizeRoom(unwrapApiRecord(chatRes), isAdmin, currentUserId);
          if (updatedRoom) {
            setActiveRoom((prev) => ({
              ...prev,
              ...updatedRoom,
            }));
          }
        } catch (e) {
          console.warn("Failed to refresh chat room info:", e.message);
        }

        const res = await api.get(`/api/chats/${roomId}/messages?limit=200`);
        const rawMessages = unwrapApiList(res);
        const normalizedMessages = (Array.isArray(rawMessages) ? rawMessages : [])
          .map((message) => normalizeMessage(message, currentUserId))
          .filter(Boolean);

        setActiveRoom((prev) => {
          if (!prev || prev.roomId !== roomId) return prev;
          return {
            ...prev,
            messages: normalizedMessages,
          };
        });
      }
    } catch (err) {
      console.warn("Failed to refresh chat:", err.message);
    } finally {
      setTimeout(() => {
        setIsRefreshingChat(false);
      }, 500);
    }
  }, [refreshRooms, isAdmin, currentUserId]);

  const value = {
    rooms,
    activeRoom,
    loading,
    isRefreshingChat,
    selectRoom,
    sendMessage,
    updateRoomStatus,
    deleteRoom,
    refreshRooms,
    refreshChat,
    setTypingState,
    createOrGetCustomerRoom,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export default ChatContext;
