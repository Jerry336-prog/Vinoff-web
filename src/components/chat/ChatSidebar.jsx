import React, { useState, useContext, useEffect } from "react";
import Badge from "../ui/Badge";
import { Search, User2, MessageSquare } from "lucide-react";
import { AuthContext } from "../../context/AuthContext";
import Avatar from "../ui/Avatar";
import { getUserProfile } from "../../services/firebase/auth";

const formatTimestamp = (timestamp) => {
  if (!timestamp) return "";
  let date;
  if (typeof timestamp.toDate === "function") {
    date = timestamp.toDate();
  } else if (timestamp.seconds !== undefined) {
    date = new Date(timestamp.seconds * 1000);
  } else {
    date = new Date(timestamp);
  }
  if (isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export const ChatSidebar = ({
  rooms = [],
  activeRoom = null,
  onSelectRoom,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const { currentUser } = useContext(AuthContext);

  const filteredRooms = rooms.filter(
    (room) =>
      (room.customerName || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (room.businessName || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
      {/* Search Header */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/50">
        <h3 className="font-bold text-slate-800 text-sm tracking-wide mb-3 flex items-center gap-1.5">
          <MessageSquare className="w-4 h-4 text-brand-green-600" />
          ACTIVE CHAT ROOMS
        </h3>
        <div className="relative">
          <input
            type="text"
            placeholder="Search buyer or store..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-medium focus:ring-2 focus:ring-brand-green-500 focus:border-brand-green-500 transition-all outline-none"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Rooms List */}
      <div className="flex-grow overflow-y-auto p-3 space-y-1.5">
        {filteredRooms.length > 0 ? (
          filteredRooms.map((room) => {
            const isActive = activeRoom?.roomId === room.roomId;
            const isUnread = room.unreadCount > 0;
            const lastMessage =
              room.lastMessage ||
              (room.messages && room.messages.length > 0
                ? room.messages[room.messages.length - 1]
                : null);
            const [fetchedAvatar, setFetchedAvatar] = useState(null);

            useEffect(() => {
              let cancelled = false;
              const ensure = async () => {
                if (room.avatarUrl) return;
                try {
                  const p = await getUserProfile(
                    room.customerId || room.roomId,
                  );
                  if (!cancelled) setFetchedAvatar(p?.avatarUrl || null);
                } catch (e) {
                  // ignore
                }
              };
              ensure();
              return () => {
                cancelled = true;
              };
            }, [room]);

            const avatarSrc = room.avatarUrl || fetchedAvatar || null;

            return (
              <button
                key={room.roomId}
                onClick={() => onSelectRoom(room.roomId)}
                className={`w-full text-left p-3 transition-all flex items-start gap-3 rounded-2xl outline-none border ${
                  isActive
                    ? "bg-gradient-to-r from-brand-green-50/60 to-white border-brand-green-200/60 shadow-xs"
                    : "bg-transparent border-transparent hover:bg-slate-50/70 hover:border-slate-100"
                }`}
              >
                {/* User Avatar */}
                <div
                  className={`w-10 h-10 rounded-xl overflow-hidden border flex-shrink-0 transition-colors ${isActive ? "bg-brand-green-100 border-brand-green-200/50" : "bg-slate-100 border-slate-200/50"}`}
                >
                  <Avatar
                    src={avatarSrc}
                    alt={room.customerName || "avatar"}
                    size={40}
                  />
                </div>

                {/* Message Meta Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-extrabold text-slate-800 text-xs truncate">
                      {room.customerName}
                    </h4>
                    <span className="text-[9px] text-slate-400 font-medium">
                      {lastMessage
                        ? formatTimestamp(lastMessage.timestamp)
                        : ""}
                    </span>
                  </div>

                  <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest truncate mt-0.5">
                    {room.businessName}
                  </p>

                  <div className="flex items-center justify-between mt-2.5 gap-2">
                    <p
                      className={`text-xs truncate ${isUnread ? "text-slate-900 font-bold" : "text-slate-500 font-medium"}`}
                    >
                      {lastMessage?.type === "system"
                        ? "📢 Notice update"
                        : lastMessage?.text || "No messages yet"}
                    </p>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Badge
                        status={room.status}
                        className="text-[8px] px-1.5 py-0.5"
                      />
                      {isUnread && (
                        <span
                          className="flex items-center justify-center bg-brand-green-600 text-white rounded-full text-[9px] font-black w-4.5 h-4.5 shadow-xs shadow-brand-green-200"
                          title={`${room.unreadCount} unread messages`}
                        >
                          {room.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        ) : (
          <div className="text-center py-10 text-slate-400 text-xs">
            No active conversations.
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatSidebar;
