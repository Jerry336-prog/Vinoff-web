import React, { useContext, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { ChatContext } from "../../context/ChatContext";
import ChatWindow from "../../components/chat/ChatWindow";
import { Info, MessageSquare } from "lucide-react";
import Button from "../../components/ui/Button";

export const ChatPage = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId");

  const {
    activeRoom,
    sendMessage,
    updateRoomStatus,
    createOrGetCustomerRoom,
    selectRoom,
    rooms,
    loading,
  } = useContext(ChatContext);

  const initiatedRef = React.useRef(null);
  const activeRoomId = activeRoom?.roomId;
  const firstRoomId = rooms?.[0]?.roomId;
  const roomCount = rooms?.length || 0;

  useEffect(() => {
    // Only initialize once per orderId or when rooms first load
    const initKey = orderId || "general_chat";
    if (initiatedRef.current === initKey && activeRoomId) return;

    if (orderId) {
      initiatedRef.current = initKey;
      createOrGetCustomerRoom(orderId);
    } else if (firstRoomId && !activeRoomId) {
      initiatedRef.current = initKey;
      selectRoom(firstRoomId);
    } else if (!activeRoomId && !roomCount) {
      initiatedRef.current = initKey;
      createOrGetCustomerRoom();
    }
  }, [
    orderId,
    firstRoomId,
    roomCount,
    activeRoomId,
    createOrGetCustomerRoom,
    selectRoom,
  ]);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-brand-green-700" />
          Message Admin &mdash; Sales &amp; Support
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Chat directly with Vinoff administration to discuss wholesale orders, custom quotations, and payment verification.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Chat Window Box */}
        <div className="lg:col-span-3 h-[calc(100dvh-220px)] min-h-[480px] lg:h-[620px]">
          {activeRoom ? (
            <ChatWindow
              room={activeRoom}
              onSendMessage={sendMessage}
              onUpdateStatus={updateRoomStatus}
              isAdmin={false}
            />
          ) : (
            <div className="h-full bg-white border border-slate-200 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-sm space-y-3">
              <div className="w-12 h-12 bg-brand-green-50 rounded-2xl flex items-center justify-center text-brand-green-600 animate-pulse">
                <MessageSquare className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-800">
                {loading ? "Connecting to Support..." : "Starting Conversation with Admin..."}
              </p>
              <p className="text-xs text-slate-400 max-w-xs">
                Establishing a secure session with Vinoff customer service desk.
              </p>
              {!loading && (
                <Button
                  size="sm"
                  variant="primary"
                  className="rounded-xl"
                  onClick={() => createOrGetCustomerRoom && createOrGetCustomerRoom(orderId)}
                >
                  Start Chat Now
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Informative Side Panel */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4 text-xs leading-relaxed">
          <h3 className="font-extrabold text-slate-800 text-sm tracking-wide uppercase border-b border-slate-100 pb-2.5 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-brand-green-600" />
            Wholesale Chat Terms
          </h3>

          <div className="space-y-3.5">
            <div>
              <p className="font-bold text-slate-700 flex items-center gap-1">
                🧾 Order & Custom Invoicing
              </p>
              <p className="text-slate-500 mt-1">
                Need bulk discounts or specific quantities? State your request here and the admin will issue an official invoice directly into your account.
              </p>
            </div>

            <div>
              <p className="font-bold text-slate-700 flex items-center gap-1">
                📸 Payment Slip Verification
              </p>
              <p className="text-slate-500 mt-1">
                You can attach transfer receipts by clicking the attachment icon. Once uploaded, admins confirm transactions and dispatch items.
              </p>
            </div>

            <div>
              <p className="font-bold text-slate-700 flex items-center gap-1">
                ⚡ Real-time System Updates
              </p>
              <p className="text-slate-500 mt-1">
                Status changes, proof submissions, and invoices automatically trigger system updates right inside this room.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
