import React, { useContext } from "react";
import { Link } from "react-router-dom";
import { AnnouncementContext } from "../../context/AnnouncementContext";
import {
  Megaphone,
  Wrench,
  PackagePlus,
  AlertTriangle,
  Info,
  X,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export const AnnouncementModal = () => {
  const { modalAnnouncement, dismissModalAnnouncement } = useContext(AnnouncementContext);

  if (!modalAnnouncement) return null;

  const getTypeMeta = (type) => {
    switch (type) {
      case "maintenance":
        return {
          badge: "System Maintenance & Downtime Notice",
          bgBadge: "bg-amber-100 text-amber-900 border-amber-300",
          icon: Wrench,
          iconBg: "bg-amber-500 text-white ring-4 ring-amber-100",
        };
      case "new_product":
        return {
          badge: "New Arrival & Product Announcement",
          bgBadge: "bg-emerald-100 text-emerald-900 border-emerald-300",
          icon: PackagePlus,
          iconBg: "bg-brand-green-600 text-white ring-4 ring-brand-green-100",
        };
      case "alert":
        return {
          badge: "Important Urgent Store Notice",
          bgBadge: "bg-red-100 text-red-900 border-red-300",
          icon: AlertTriangle,
          iconBg: "bg-red-600 text-white ring-4 ring-red-100",
        };
      default:
        return {
          badge: "Official Platform Update",
          bgBadge: "bg-blue-100 text-blue-900 border-blue-300",
          icon: Megaphone,
          iconBg: "bg-slate-900 text-brand-yellow-400 ring-4 ring-slate-200",
        };
    }
  };

  const meta = getTypeMeta(modalAnnouncement.type);
  const IconComponent = meta.icon;

  const handleDismiss = () => {
    dismissModalAnnouncement(modalAnnouncement._id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn print:hidden">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden transform transition-all duration-300 animate-scaleUp">
        {/* Top Decorative Banner */}
        <div className="bg-slate-900 p-6 sm:p-8 text-white relative">
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800/80 rounded-full transition"
            aria-label="Close Announcement"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${meta.iconBg}`}>
              <IconComponent className="w-6 h-6" />
            </div>
            <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${meta.bgBadge}`}>
              {meta.badge}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-2 leading-snug">
            {modalAnnouncement.title}
          </h2>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">
            Broadcasted on {new Date(modalAnnouncement.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </div>

        {/* Banner Image if available */}
        {modalAnnouncement.imageUrl && (
          <div className="relative h-48 sm:h-56 bg-slate-100 overflow-hidden">
            <img
              src={modalAnnouncement.imageUrl}
              alt={modalAnnouncement.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Message Content Body */}
        <div className="p-6 sm:p-8 space-y-5">
          <div className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-line bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5">
            {modalAnnouncement.message}
          </div>

          {/* Action Link & Dismiss Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            {modalAnnouncement.actionUrl && (
              <Link
                to={modalAnnouncement.actionUrl}
                onClick={handleDismiss}
                className="w-full sm:flex-1 py-3 px-4 bg-brand-green-600 hover:bg-brand-green-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-2"
              >
                <span>{modalAnnouncement.actionText || "View Details"}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}

            <button
              onClick={handleDismiss}
              className={`w-full ${
                modalAnnouncement.actionUrl ? "sm:w-auto" : "sm:flex-1"
              } py-3 px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-2`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Got It / Dismiss</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementModal;
