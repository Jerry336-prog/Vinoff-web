import React, { useState, useEffect, useContext } from "react";
import api from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import { unwrapApiList } from "../../utils/apiResponse";
import {
  Settings as SettingsIcon,
  Megaphone,
  MapPin,
  Building,
  User,
  Shield,
  Video,
  ExternalLink,
  Info,
  CheckCircle,
  Wrench,
  PackagePlus,
  AlertTriangle,
  Mail,
  Phone,
} from "lucide-react";

export const Settings = () => {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState("announcements");
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      setLoading(true);
      try {
        const res = await api.get("/api/announcements/active");
        setAnnouncements(unwrapApiList(res));
      } catch (err) {
        console.error("Failed to load customer announcements:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnnouncements();
  }, []);

  const storeImages = [
    { src: "/store_front.jpg", alt: "Walk-in Store Front View 1" },
    { src: "/store_shelf.jpg", alt: "Walk-in Store Display Shelves" },
    { src: "/store_warehouse.jpg", alt: "Wholesale Inventory Stock Area" },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-md">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-brand-green-600/30 border border-brand-green-500/40 text-brand-green-400 rounded-2xl flex items-center justify-center shrink-0">
            <SettingsIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Settings & Platform Information Hub
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Read official announcements, locate our walk-in trade-fair physical store, and view account settings.
            </p>
          </div>
        </div>

        {/* Tab Navigation Bar */}
        <div className="flex items-center gap-2 border-t border-slate-800 pt-5 mt-6 overflow-x-auto">
          {[
            { id: "announcements", label: `Announcements & News (${announcements.length})`, icon: Megaphone },
            { id: "store", label: "Walk-in Store & Location", icon: MapPin },
            { id: "account", label: "Account & Support Info", icon: User },
          ].map((tab) => {
            const IconComponent = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 outline-none shrink-0 ${
                  active
                    ? "bg-brand-green-600 text-white shadow-sm"
                    : "bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <IconComponent className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab 1: Announcements */}
      {activeTab === "announcements" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-brand-green-600" /> Platform Announcements & Store Updates
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review active store announcements, downtime schedules, new product drops, and official updates.
            </p>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
              Loading store announcements...
            </div>
          ) : announcements.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 italic">
              No active announcements right now. Check back soon for new updates!
            </div>
          ) : (
            <div className="space-y-4">
              {announcements.map((item) => (
                <div
                  key={item._id}
                  className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-3 hover:border-brand-green-300 transition"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{item.title}</span>
                      <span
                        className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase ${
                          item.type === "maintenance"
                            ? "bg-amber-100 text-amber-900 border border-amber-300"
                            : item.type === "new_product"
                            ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                            : item.type === "alert"
                            ? "bg-red-100 text-red-900 border border-red-300"
                            : "bg-blue-100 text-blue-900 border border-blue-300"
                        }`}
                      >
                        {item.type}
                      </span>
                    </div>

                    <span className="text-[10px] text-slate-400 font-medium">
                      {new Date(item.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed font-medium whitespace-pre-line">
                    {item.message}
                  </p>

                  {item.actionUrl && (
                    <a
                      href={item.actionUrl}
                      className="inline-flex items-center gap-1 text-xs font-bold text-brand-green-700 hover:text-brand-green-800"
                    >
                      <span>{item.actionText || "Learn More / View Link"}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Store Location */}
      {activeTab === "store" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-brand-green-600" /> Vinoff Physical Walk-in Store Location
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Visit our physical trade plaza store in Badagry Expressway, Lagos for direct warehouse pick-ups and store inspection.
            </p>
          </div>

          <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-2 border border-slate-800">
            <span className="text-[10px] font-extrabold uppercase text-brand-yellow-400 tracking-wider block">
              Official Physical Store Address
            </span>
            <p className="text-sm font-black leading-snug">
              KADUNA PLAZA 1, BLOCK A, SHOP 22<br />
              INT’L CENTRE FOR COMMERCE, TRADE-FAIR COMPLEX,<br />
              BADAGRY EXPRESS WAY, LAGOS, NIGERIA.
            </p>
          </div>

          {/* Video Walkthrough Direction */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Video className="w-4 h-4 text-brand-green-600" /> Walk-in Store Location & Direction Video
            </h3>
            <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 shadow-sm max-w-2xl mx-auto">
              <video
                src="/VINOFF_C0_walkthrough.MP4"
                controls
                autoPlay
                muted
                loop
                className="w-full h-auto max-h-96 object-contain"
              >
                Your browser does not support video playback.
              </video>
            </div>
            <p className="text-[11px] text-slate-500 text-center font-medium">
              Video directions guiding you straight to Shop 22, Kaduna Plaza 1, Trade Fair Complex.
            </p>
          </div>
        </div>
      )}

      {/* Tab 3: Account Info */}
      {activeTab === "account" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <User className="w-4 h-4 text-brand-green-600" /> Account & System Overview
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review your account details and customer status.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Customer Name</span>
              <p className="font-bold text-slate-900 text-sm">
                {user?.firstName} {user?.lastName}
              </p>
              <span className="text-[10px] text-slate-400 font-bold uppercase block pt-2">Email Address</span>
              <p className="font-semibold text-slate-800 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" /> {user?.email}
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Account Role</span>
              <span className="font-bold text-brand-green-700 uppercase">{user?.role || "Customer"}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase block pt-2">Account Status</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                ● Active Customer Account
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
