import React, { useEffect, useRef, useContext } from "react";
import ChatHeader from "./ChatHeader";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import { AuthContext } from "../../context/AuthContext";
import { ChatContext } from "../../context/ChatContext";
import { MessageSquareOff, Shield } from "lucide-react";

export const ChatWindow = ({
  room,
  onSendMessage,
  onUpdateStatus,
  isAdmin = false,
  onGenerateInvoice,
  onViewInvoice,
  onBack,
}) => {
  const { user } = useContext(AuthContext);
  const { setTypingState } = useContext(ChatContext);
  const chatEndRef = useRef(null);

  const isOtherTyping = isAdmin ? room?.typingCustomer === true : room?.typingAdmin === true;
  const lastMsgId = room?.messages?.[room?.messages?.length - 1]?.id;

  // Auto Scroll to bottom only when the latest message ID changes or typing indicator changes
  useEffect(() => {
    if (lastMsgId) {
      chatEndRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [lastMsgId, isOtherTyping]);

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
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 space-y-1">
        {room.messages && room.messages.length > 0 ? (
          (() => {
            let lastAdminSenderId = null;
            return room.messages.map((msg) => {
              const currentId = user?._id || user?.id || user?.uid;
              const isAdminRole = msg.senderRole === "admin" || msg.senderRole === "subAdmin" || msg.senderRole === "superadmin";

              let isSelf;
              if (isAdmin) {
                const sender = String(msg.senderId || msg.sender?._id || "");
                isSelf =
                  msg.isSelf ||
                  (currentId && String(msg.sender?._id || "") === String(currentId)) ||
                  sender === String(currentId || "");
              } else {
                isSelf = msg.isSelf || String(msg.senderId || msg.sender?._id || "") === String(currentId || "");
              }

              let adminSwitchBanner = null;
              if (isAdminRole) {
                const currentAdminId = String(msg.sender?._id || msg.senderId || msg.senderFirstName || msg.senderName || "admin");
                if (lastAdminSenderId && lastAdminSenderId !== currentAdminId) {
                  const adminName = msg.sender?.firstName || msg.senderFirstName || "Support Admin";
                  adminSwitchBanner = (
                    <div key={`switch-${msg.id}`} className="flex justify-center my-3">
                      <div className="inline-flex items-center gap-1.5 bg-brand-green-50 border border-brand-green-200/80 text-brand-green-900 text-[10px] font-bold px-3 py-1 rounded-full shadow-2xs">
                        <Shield className="w-3 h-3 text-brand-green-600 shrink-0" />
                        <span>Admin {adminName} is now responding in this chat</span>
                      </div>
                    </div>
                  );
                }
                lastAdminSenderId = currentAdminId;
              }

              return (
                <React.Fragment key={msg.id}>
                  {adminSwitchBanner}
                  <MessageBubble
                    message={msg}
                    isSelf={isSelf}
                    onViewInvoice={onViewInvoice}
                    room={room}
                  />
                </React.Fragment>
              );
            });
          })()
        ) : (
          <p className="text-center text-xs text-slate-400 py-10">
            No messages yet.
          </p>
        )}
        {isOtherTyping && (
          <div className="flex justify-start mb-2 items-end">
            <div className="mr-2 flex-shrink-0">
              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-500 border border-slate-200">
                {isAdmin ? "C" : "AD"}
              </div>
            </div>
            <div className="bg-white border border-slate-100 px-3.5 py-2 rounded-2xl flex items-center gap-1.5 shadow-xs max-w-[70%]">
              <span className="text-[10px] font-semibold text-slate-400 mr-1 animate-pulse">
                {isAdmin ? "Buyer is typing" : "Support is typing"}
              </span>
              <div className="flex gap-1 items-center h-2">
                <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input controls */}
      <ChatInput
        onSendMessage={(text, opt) => onSendMessage(room.roomId, text, opt)}
        onTyping={(isTyping) => setTypingState(isTyping)}
      />
    </div>
  );
};

export default ChatWindow;
