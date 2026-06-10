import React, { useEffect, useRef, useContext } from "react";
import ChatHeader from "./ChatHeader";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import { AuthContext } from "../../context/AuthContext";
import { MessageSquareOff } from "lucide-react";

export const ChatWindow = ({
  room,
  onSendMessage,
  onUpdateStatus,
  isAdmin = false,
  onGenerateInvoice,
  onBack,
}) => {
  const { user } = useContext(AuthContext);
  const chatEndRef = useRef(null);

  // Auto Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [room?.messages?.length]);

  if (!room) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-white border border-slate-200 rounded-3xl p-6 text-center text-slate-400 shadow-sm">
        <MessageSquareOff className="w-12 h-12 text-slate-300 mb-2 animate-pulse" />
        <h3 className="font-bold text-slate-800 text-sm">
          No Active Chat selected
        </h3>
        <p className="text-xs text-slate-500 max-w-xs mt-1">
          Select a customer channel from the sidebar to inspect logs and reply.
        </p>
      </div>
    );
  }

  const customerId = room.customerId || room.roomId;

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
      {/* Header Info */}
      <ChatHeader
        room={room}
        isAdmin={isAdmin}
        // Inject roomId here so ChatHeader just passes the status string
        onUpdateStatus={(status) => onUpdateStatus(room.roomId, status)}
        onGenerateInvoice={onGenerateInvoice}
        onBack={onBack}
      />

      {/* Admin quick actions (always visible) */}
      {/* {isAdmin && onGenerateInvoice && (
        <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/40 flex items-center justify-end">
          <button
            onClick={() => onGenerateInvoice(room.roomId)}
            className="inline-flex items-center gap-2 px-3 py-2 bg-brand-yellow-50 hover:bg-brand-yellow-100 text-xs font-bold text-brand-green-800 border border-brand-yellow-200 rounded-lg transition"
            title="Generate Invoice from this chat's latest order"
          >
            Generate Invoice
          </button>
        </div>
      )} */}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 space-y-1">
        {room.messages && room.messages.length > 0 ? (
          room.messages.map((msg) => {
            // Determine if this message should be rendered as 'self' (right side)
            let isSelf;
            if (isAdmin) {
              // Admin view: messages sent by the admin account itself should appear on the right.
              // Consider real admin uid or legacy 'admin-...' senders as admin messages.
              const sender = String(msg.senderId || "");
              isSelf =
                sender === String(user?.uid) || sender.startsWith("admin");
            } else {
              // Customer view: only the logged-in customer's own messages are 'self'
              isSelf = msg.senderId === user?.uid;
            }

            return <MessageBubble key={msg.id} message={msg} isSelf={isSelf} />;
          })
        ) : (
          <p className="text-center text-xs text-slate-400 py-10">
            No messages yet.
          </p>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input controls */}
      <ChatInput
        onSendMessage={(text, opt) => onSendMessage(room.roomId, text, opt)}
      />
    </div>
  );
};

export default ChatWindow;
