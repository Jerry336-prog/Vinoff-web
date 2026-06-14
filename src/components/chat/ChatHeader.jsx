import React, { useState, useContext, useEffect } from "react";
import Badge from "../ui/Badge";
import { RefreshCw, ChevronDown, FileText, ArrowLeft } from "lucide-react";
import Avatar from "../ui/Avatar";
import { AuthContext } from "../../context/AuthContext";
import { getUserProfile } from "../../services/firebase/auth";

export const ChatHeader = ({
  room,
  isAdmin = false,
  onUpdateStatus,
  onGenerateInvoice,
  onBack,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { user: currentUser } = useContext(AuthContext);
  const [fetchedAvatar, setFetchedAvatar] = useState(null);

  const getAvatarUrl = () => {
    return (
      room?.avatarUrl ||
      room?.customerAvatar ||
      room?.photoURL ||
      room?.profileImage ||
      room?.image ||
      currentUser?.photoURL ||
      null
    );
  };

  const statuses = [
    "Open",
    "Awaiting Invoice",
    "Awaiting Payment Confirmation",
    "Resolved",
  ];

  const handleStatusChange = (status) => {
    onUpdateStatus(status);
    setDropdownOpen(false);
  };

  useEffect(() => {
    let cancelled = false;
    const ensureAvatar = async () => {
      const existing = getAvatarUrl();
      if (existing) {
        setFetchedAvatar(null);
        return;
      }
      const uid = room?.customerId || room?.roomId;
      if (!uid) return;
      try {
        const profile = await getUserProfile(uid);
        if (!cancelled) setFetchedAvatar(profile?.avatarUrl || null);
      } catch (e) {
        console.warn(
          "Failed to fetch user profile for avatar:",
          e.message || e,
        );
      }
    };
    ensureAvatar();
    return () => {
      cancelled = true;
    };
  }, [room]);

  const effectiveAvatar = getAvatarUrl() || fetchedAvatar || null;

  return (
    <div className="px-4 py-3 sm:px-6 sm:py-4.5 bg-white border-b border-slate-200 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-2 sm:gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="md:hidden p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-xl transition border border-slate-200/80 mr-1"
            title="Back to conversation list"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden border flex-shrink-0">
          <Avatar
            src={effectiveAvatar}
            alt={room?.customerName || "avatar"}
            size={40}
          />
        </div>
        <div className="min-w-0">
          <h3 className="font-bold text-slate-800 text-xs sm:text-sm leading-tight max-w-[85px] xs:max-w-[120px] sm:max-w-none truncate">
            {room.customerName}
          </h3>
          <p className="text-[9px] sm:text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5 max-w-[85px] xs:max-w-[120px] sm:max-w-none truncate">
            {room.businessName}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3.5 relative">
        {isAdmin && onGenerateInvoice && (
          <button
            type="button"
            onClick={onGenerateInvoice}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 bg-brand-green-700 hover:bg-brand-green-900 text-xs font-black text-white rounded-xl transition shadow-2xs hover:shadow-xs"
            title="Generate Invoice"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Generate Invoice</span>
          </button>
        )}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-400 font-medium hidden sm:inline">Status:</span>
          {isAdmin ? (
            <div>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold rounded-xl text-slate-700 transition"
              >
                <Badge status={room.status} className="border-0 px-0 py-0" />
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-9 w-52 bg-white border border-slate-200 rounded-xl shadow-xl z-30 p-1.5">
                  {statuses.map((st) => (
                    <button
                      key={st}
                      onClick={() => handleStatusChange(st)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition ${
                        room.status === st
                          ? "bg-brand-green-50 text-brand-green-700"
                          : "hover:bg-slate-50 text-slate-600"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <Badge status={room.status} />
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;
