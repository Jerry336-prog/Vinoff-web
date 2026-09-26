import React, { useState } from "react";
import { Search, MessageSquare } from "lucide-react";
import Avatar from "../ui/Avatar";
import { getAvatarUrl, getInitials } from "../../utils/avatar";

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
      <div className="p-3 sm:p-3.5 border-b border-slate-100 bg-slate-50/50">
        <h3 className="font-extrabold text-slate-800 text-xs tracking-wider mb-2 flex items-center gap-1.5 uppercase">
          <MessageSquare className="w-3.5 h-3.5 text-brand-green-600" />
          ACTIVE CHAT ROOMS
        </h3>
        <div className="relative">
          <input
            type="text"
            placeholder="Search buyer or store..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl py-1.5 pl-8 pr-3 text-[11px] font-medium focus:ring-2 focus:ring-brand-green-500 focus:border-brand-green-500 transition-all outline-none"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
        </div>
      </div>

      {/* Rooms List */}
      <div className="flex-grow overflow-y-auto p-2 space-y-1">
        {filteredRooms.length > 0 ? (
          filteredRooms.map((room) => {
            const isActive = activeRoom?.roomId === room.roomId;
            const isUnread = room.unreadCount > 0;
            const lastMessage =
              room.lastMessage ||
              (room.messages && room.messages.length > 0
                ? room.messages[room.messages.length - 1]
                : null);
            const avatarSrc = room.avatarUrl || getAvatarUrl(room.customer) || getAvatarUrl(room);

            return (
              <button
                key={room.roomId}
                onClick={() => onSelectRoom(room.roomId)}
                className={`w-full text-left p-2.5 transition-all flex items-start gap-2.5 rounded-2xl outline-none border ${
                  isActive
                    ? "bg-gradient-to-r from-brand-green-50/70 to-white border-brand-green-200/70 shadow-xs"
                    : "bg-transparent border-transparent hover:bg-slate-50/80 hover:border-slate-100"
                }`}
              >
                {/* User Avatar */}
                <div
                  className={`w-9 h-9 rounded-xl overflow-hidden border flex-shrink-0 transition-colors ${isActive ? "bg-brand-green-100 border-brand-green-200/50" : "bg-slate-100 border-slate-200/50"}`}
                >
                  <Avatar
                    src={avatarSrc}
                    alt={room.customerName || "avatar"}
                    size={36}
                    fallback={getInitials(room.customer || room, "C")}
                  />
                </div>

                {/* Message Meta Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="font-extrabold text-slate-800 text-[11px] truncate">
                      {room.customerName}
                    </h4>
                    <span className="text-[8px] text-slate-400 font-medium shrink-0">
                      {lastMessage
                        ? formatTimestamp(lastMessage.timestamp)
                        : ""}
                    </span>
                  </div>

                  <p className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wider truncate mt-0.5">
                    {room.businessName}
                  </p>

                  <div className="flex items-center justify-between mt-1.5 gap-1.5">
                    <p
                      className={`text-[10px] truncate ${isUnread ? "text-slate-900 font-bold" : "text-slate-500 font-medium"}`}
                    >
                      {lastMessage?.type === "system"
                        ? "Notice update"
                        : lastMessage?.text || "No messages yet"}
                    </p>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {isUnread && (
                        <span
                          className="flex items-center justify-center bg-brand-yellow-400 text-slate-900 rounded-full text-[9px] font-black min-w-[18px] h-4 px-1 shadow-xs"
                          title={`${room.unreadCount} unread messages`}
                        >
                          {room.unreadCount > 99 ? '99+' : room.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        ) : (
          <div className="text-center py-8 text-slate-400 text-xs">
            No active conversations.
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatSidebar;
