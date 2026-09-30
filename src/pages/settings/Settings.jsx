import React, { useState, useEffect, useContext } from "react";
import api from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { unwrapApiList, unwrapApiRecord } from "../../utils/apiResponse";
import { createIdempotencyKey, withIdempotencyKey } from "../../services/idempotency";
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
  AlertTriangle,
  Mail,
  Phone,
  Landmark,
  Lock,
  Save,
  CreditCard,
  Store,
  BellRing,
  Smartphone,
  Monitor,
  Laptop,
  Tablet,
  LogOut,
  RefreshCw,
  MessageCircle,
  Volume2,
  Trash2,
  Power,
  Clock,
  Check,
  Radio,
  Sliders,
  Sparkles,
} from "lucide-react";

export const Settings = () => {
  const { user, isAdmin } = useContext(AuthContext);
  const { toast } = useToast();

  const isSuperAdmin = user?.role === "superadmin";

  // Tab State: default to store_status if admin, announcements if customer
  const [activeTab, setActiveTab] = useState(isAdmin ? "store_status" : "announcements");

  // =========================================================
  // 1. ANNOUNCEMENTS STATE
  // =========================================================
  const [announcements, setAnnouncements] = useState([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);

  // =========================================================
  // 2. COMPANY BANK ACCOUNT STATE
  // =========================================================
  const [bankForm, setBankForm] = useState({
    bankName: "Guaranty Trust Bank (GTB)",
    accountName: "Vinoff Wholesales Ltd",
    accountNumber: "0123456789",
    instructions: "Please use your Order # or Invoice # as the transfer payment narration.",
  });
  const [loadingBank, setLoadingBank] = useState(false);
  const [savingBank, setSavingBank] = useState(false);

  // =========================================================
  // 3. STORE STATUS / VACATION MODE STATE
  // =========================================================
  const [storeStatus, setStoreStatus] = useState({
    isOpen: true,
    bannerMessage: "We are restocking our warehouse for the weekend. Orders placed today will be dispatched Monday.",
    noticeType: "warning",
    allowBrowsing: true,
  });
  const [loadingStoreStatus, setLoadingStoreStatus] = useState(false);
  const [savingStoreStatus, setSavingStoreStatus] = useState(false);

  // Presets for quick banner messages
  const BANNER_PRESETS = [
    {
      label: "Restocking Weekend",
      text: "We are restocking our warehouse for the weekend. Orders placed today will be dispatched Monday.",
      type: "warning",
    },
    {
      label: "Stock-Taking Day",
      text: "Warehouse is currently undergoing monthly physical stock-taking. Online checkout will resume tomorrow morning.",
      type: "warning",
    },
    {
      label: "Public Holiday",
      text: "Our Trade Fair warehouse is closed for the public holiday. Dispatches resume on the next business day.",
      type: "info",
    },
    {
      label: "Inventory Audit",
      text: "System and physical carton inventory audit in progress. Order taking is paused temporarily.",
      type: "alert",
    },
  ];

  // =========================================================
  // 4. AUTOMATED ALERTS & NOTIFICATION PREFERENCES STATE
  // =========================================================
  const [alertsForm, setAlertsForm] = useState({
    lowStockThreshold: 5,
    categoryThresholds: {
      Beverages: 10,
      Toiletries: 5,
      Cosmetics: 5,
      "Food & Groceries": 10,
      Confectioneries: 10,
      Household: 5,
    },
    lowStockAlertsEnabled: true,
    whatsappNotificationsEnabled: true,
    whatsappNumber: "",
    notifyOnNewOrder: true,
    notifyOnNewCustomer: true,
    soundAlertsEnabled: true,
  });
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [savingAlerts, setSavingAlerts] = useState(false);

  // =========================================================
  // 5. SESSION MANAGER & DEVICE HISTORY STATE
  // =========================================================
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [revokingOthers, setRevokingOthers] = useState(false);
  const [revokingId, setRevokingId] = useState(null);

  // =========================================================
  // DATA FETCHING EFFECTS
  // =========================================================
  // Fetch Announcements
  useEffect(() => {
    const fetchAnnouncements = async () => {
      setLoadingAnnouncements(true);
      try {
        const res = await api.get("/api/announcements/active");
        setAnnouncements(unwrapApiList(res));
      } catch (err) {
        console.error("Failed to load announcements:", err);
      } finally {
        setLoadingAnnouncements(false);
      }
    };
    fetchAnnouncements();
  }, []);

  // Fetch Bank Details (Admin)
  useEffect(() => {
    if (!isAdmin) return;
    const fetchBankDetails = async () => {
      setLoadingBank(true);
      try {
        const res = await api.get("/api/settings/bank-details");
        const record = unwrapApiRecord(res) || res.data || res;
        if (record && record.bankName) {
          setBankForm({
            bankName: record.bankName || "",
            accountName: record.accountName || "",
            accountNumber: record.accountNumber || "",
            instructions: record.instructions || "",
          });
        }
      } catch (err) {
        console.error("Failed to load bank details:", err);
      } finally {
        setLoadingBank(false);
      }
    };
    fetchBankDetails();
  }, [isAdmin]);

  // Fetch Store Status
  useEffect(() => {
    const fetchStoreStatus = async () => {
      setLoadingStoreStatus(true);
      try {
        const res = await api.get("/api/settings/store-status");
        const record = unwrapApiRecord(res) || res.data || res;
        if (record && typeof record.isOpen === "boolean") {
          setStoreStatus({
            isOpen: record.isOpen,
            bannerMessage: record.bannerMessage || "",
            noticeType: record.noticeType || "warning",
            allowBrowsing: record.allowBrowsing !== false,
          });
        }
      } catch (err) {
        console.error("Failed to load store status:", err);
      } finally {
        setLoadingStoreStatus(false);
      }
    };
    fetchStoreStatus();
  }, []);

  // Fetch Alerts & Notifications (Admin)
  useEffect(() => {
    if (!isAdmin) return;
    const fetchAlerts = async () => {
      setLoadingAlerts(true);
      try {
        const res = await api.get("/api/settings/notifications");
        const record = unwrapApiRecord(res) || res.data || res;
        if (record) {
          setAlertsForm((prev) => ({
            ...prev,
            lowStockThreshold: record.lowStockThreshold ?? prev.lowStockThreshold,
            categoryThresholds: record.categoryThresholds
              ? { ...prev.categoryThresholds, ...record.categoryThresholds }
              : prev.categoryThresholds,
            lowStockAlertsEnabled: record.lowStockAlertsEnabled ?? prev.lowStockAlertsEnabled,
            whatsappNotificationsEnabled: record.whatsappNotificationsEnabled ?? prev.whatsappNotificationsEnabled,
            whatsappNumber: record.whatsappNumber ?? prev.whatsappNumber,
            notifyOnNewOrder: record.notifyOnNewOrder ?? prev.notifyOnNewOrder,
            notifyOnNewCustomer: record.notifyOnNewCustomer ?? prev.notifyOnNewCustomer,
            soundAlertsEnabled: record.soundAlertsEnabled ?? prev.soundAlertsEnabled,
          }));
        }
      } catch (err) {
        console.error("Failed to load notification settings:", err);
      } finally {
        setLoadingAlerts(false);
      }
    };
    fetchAlerts();
  }, [isAdmin]);

  // Fetch Sessions
  const fetchSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await api.get("/api/settings/sessions");
      const list = unwrapApiList(res);
      setSessions(list);
    } catch (err) {
      console.error("Failed to load sessions:", err);
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  // =========================================================
  // HANDLERS
  // =========================================================

  // Save Bank Details
  const handleSaveBankDetails = async (e) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      toast.warning("Only Super Admin accounts can modify company bank details.", "Access Restricted");
      return;
    }
    setSavingBank(true);
    try {
      await api.put(
        "/api/settings/bank-details",
        bankForm,
        withIdempotencyKey(createIdempotencyKey("update-bank-details"))
      );
      toast.success("Company bank details updated & published live!", "Bank Info Saved");
    } catch (err) {
      const message = err.response?.data?.message || err.message || "Failed to update bank details";
      toast.error(message, "Update Error");
    } finally {
      setSavingBank(false);
    }
  };

  // Save Store Status / Vacation Mode
  const handleSaveStoreStatus = async (e) => {
    e?.preventDefault?.();
    setSavingStoreStatus(true);
    try {
      const res = await api.put(
        "/api/settings/store-status",
        storeStatus,
        withIdempotencyKey(createIdempotencyKey("update-store-status"))
      );
      const data = unwrapApiRecord(res) || res.data?.data || res.data;
      if (data) {
        setStoreStatus((prev) => ({ ...prev, ...data }));
      }
      toast.success(
        storeStatus.isOpen
          ? "Store is now Open for Orders!"
          : "Vacation mode activated. Customer alert banner is live.",
        storeStatus.isOpen ? "Store Open" : "Store Temporarily Closed"
      );
    } catch (err) {
      const message = err.response?.data?.message || err.message || "Failed to update store status";
      toast.error(message, "Status Error");
    } finally {
      setSavingStoreStatus(false);
    }
  };

  // Save Alerts & Notification Preferences
  const handleSaveAlerts = async (e) => {
    e?.preventDefault?.();
    setSavingAlerts(true);
    try {
      const res = await api.put(
        "/api/settings/notifications",
        alertsForm,
        withIdempotencyKey(createIdempotencyKey("update-notification-settings"))
      );
      const data = unwrapApiRecord(res) || res.data?.data || res.data;
      if (data) {
        setAlertsForm((prev) => ({ ...prev, ...data }));
      }
      toast.success("Low-stock alerts & WhatsApp notification rules updated!", "Preferences Saved");
    } catch (err) {
      const message = err.response?.data?.message || err.message || "Failed to save alert preferences";
      toast.error(message, "Preferences Error");
    } finally {
      setSavingAlerts(false);
    }
  };

  // Log Out Of All Other Devices
  const handleRevokeOtherSessions = async () => {
    if (!window.confirm("Are you sure you want to log out of all other devices? Other logged-in sessions will be invalidated immediately.")) {
      return;
    }
    setRevokingOthers(true);
    try {
      const res = await api.post("/api/settings/sessions/revoke-others");
      const record = unwrapApiRecord(res) || res.data?.data || res.data;
      if (record?.sessions) {
        setSessions(record.sessions);
      } else {
        await fetchSessions();
      }
      toast.success("Successfully logged out of all other devices!", "Sessions Revoked");
    } catch (err) {
      const message = err.response?.data?.message || err.message || "Failed to revoke sessions";
      toast.error(message, "Revocation Error");
    } finally {
      setRevokingOthers(false);
    }
  };

  // Revoke Specific Session
  const handleRevokeSingleSession = async (sessionId) => {
    setRevokingId(sessionId);
    try {
      await api.delete(`/api/settings/sessions/${sessionId}`);
      setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
      toast.success("Device session logged out successfully.", "Session Terminated");
    } catch (err) {
      const message = err.response?.data?.message || err.message || "Failed to terminate session";
      toast.error(message, "Error");
    } finally {
      setRevokingId(null);
    }
  };

  // Test WhatsApp Notification link
  const handleTestWhatsApp = () => {
    if (!alertsForm.whatsappNumber) {
      toast.warning("Please enter a WhatsApp phone number first.", "Phone Required");
      return;
    }
    const cleanNumber = alertsForm.whatsappNumber.replace(/[^0-9]/g, "");
    const testText =
      `*🔔 VINOFF ALERT TEST*\n\n` +
      `Your automated WhatsApp order notifications are properly connected!\n` +
      `Whenever a wholesale order is placed, you will receive real-time order alerts here.\n\n` +
      `Time: ${new Date().toLocaleTimeString()} • Vinoff Wholesales Ltd`;

    const url = `https://api.whatsapp.com/send?phone=${cleanNumber}&text=${encodeURIComponent(testText)}`;
    window.open(url, "_blank");
  };

  // Device icon helper
  const getDeviceIcon = (deviceStr = "") => {
    const d = deviceStr.toLowerCase();
    if (d.includes("iphone") || d.includes("mobile") || d.includes("android")) {
      return Smartphone;
    }
    if (d.includes("ipad") || d.includes("tablet")) {
      return Tablet;
    }
    if (d.includes("mac") || d.includes("laptop")) {
      return Laptop;
    }
    return Monitor;
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-5xl mx-auto pb-12 px-1 sm:px-0">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-brand-green-600/30 border border-brand-green-500/40 text-brand-green-400 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0">
              <SettingsIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-2xl font-black tracking-tight text-white leading-tight truncate">
                Settings &amp; Platform Controls
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1 leading-relaxed line-clamp-2 sm:line-clamp-none">
                Manage store operational status, low-stock alerts, active device sessions, and settlement bank accounts.
              </p>
            </div>
          </div>

          {/* Quick Status Tag (Admin) */}
          {isAdmin && (
            <div className="self-start sm:self-auto flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${
                  storeStatus.isOpen
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    storeStatus.isOpen ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                  }`}
                />
                {storeStatus.isOpen ? "Store Open" : "Vacation / Closed"}
              </span>
            </div>
          )}
        </div>

        {/* Tab Navigation Bar */}
        <div className="flex items-center gap-1.5 sm:gap-2 border-t border-slate-800/80 pt-3.5 sm:pt-5 mt-4 sm:mt-6 overflow-x-auto no-scrollbar scroll-smooth">
          {[
            ...(isAdmin
              ? [
                  { id: "store_status", label: "Store Status & Vacation", icon: Store },
                  { id: "alerts", label: "Alerts & Notifications", icon: BellRing },
                ]
              : []),
            { id: "sessions", label: `Active Devices (${sessions.length || 1})`, icon: Smartphone },
            ...(isAdmin
              ? [{ id: "bank_details", label: "Bank Account Details", icon: Landmark }]
              : []),
            { id: "announcements", label: `Announcements (${announcements.length})`, icon: Megaphone },
            { id: "store", label: "Store & Location", icon: MapPin },
            { id: "account", label: "Account Info", icon: User },
          ].map((tab) => {
            const IconComponent = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 outline-none shrink-0 whitespace-nowrap active:scale-95 ${
                  active
                    ? "bg-brand-green-600 text-white shadow-xs ring-1 ring-white/10"
                    : "bg-slate-800/70 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700/50"
                }`}
              >
                <IconComponent className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: STORE STATUS / VACATION MODE TOGGLE (ADMIN) */}
      {/* ========================================================= */}
      {activeTab === "store_status" && isAdmin && (
        <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-xs space-y-6">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Store className="w-4 h-4 text-brand-green-600" /> Store Operational Status &amp; Vacation Mode
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 leading-relaxed">
                Toggle whether your store is accepting orders or temporarily paused for stock-taking, weekends, or holidays.
              </p>
            </div>
            <span
              className={`self-start sm:self-auto inline-flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-xl border ${
                storeStatus.isOpen
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-800 border-amber-200"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${storeStatus.isOpen ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
              {storeStatus.isOpen ? "Live & Accepting Orders" : "Orders Paused"}
            </span>
          </div>

          {/* Master Operational Switch */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
                <Power className={`w-4 h-4 ${storeStatus.isOpen ? "text-emerald-600" : "text-amber-600"}`} />
                Store Mode: {storeStatus.isOpen ? "Open for Orders" : "Temporarily Closed / Stock-taking"}
              </span>
              <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed">
                {storeStatus.isOpen
                  ? "Customers can browse products, add cartons to cart, and checkout with bank transfers or invoices."
                  : "Checkout is paused. Customers can still view products, but an announcement banner explains when dispatches resume."}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setStoreStatus((prev) => ({ ...prev, isOpen: !prev.isOpen }))}
              className={`relative inline-flex h-8 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                storeStatus.isOpen ? "bg-emerald-600" : "bg-slate-300"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  storeStatus.isOpen ? "translate-x-8" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Banner Message Configuration */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>Customer Announcement Message</span>
              <span className="text-[10px] text-slate-400 font-normal">Displayed at the top of the store</span>
            </label>

            <textarea
              rows={3}
              value={storeStatus.bannerMessage}
              onChange={(e) => setStoreStatus((prev) => ({ ...prev, bannerMessage: e.target.value }))}
              placeholder="e.g. We are restocking our warehouse for the weekend. Orders placed today will be dispatched Monday."
              className="w-full text-xs sm:text-sm p-3.5 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl focus:bg-white focus:border-brand-green-500 focus:ring-2 focus:ring-brand-green-500/20 transition-all font-medium text-slate-800 outline-none"
            />

            {/* Quick Presets */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Quick Preset Messages:
              </span>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {BANNER_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() =>
                      setStoreStatus((prev) => ({
                        ...prev,
                        bannerMessage: preset.text,
                        noticeType: preset.type,
                      }))
                    }
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition active:scale-95"
                  >
                    + {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Notice Tone & Browsing Permissions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 block">Notice Banner Tone</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "warning", label: "Warning (Amber)", color: "border-amber-400 bg-amber-50 text-amber-800" },
                  { id: "info", label: "Info (Blue)", color: "border-blue-400 bg-blue-50 text-blue-800" },
                  { id: "alert", label: "Alert (Red)", color: "border-red-400 bg-red-50 text-red-800" },
                ].map((tone) => (
                  <button
                    key={tone.id}
                    type="button"
                    onClick={() => setStoreStatus((prev) => ({ ...prev, noticeType: tone.id }))}
                    className={`py-2 px-2 text-center rounded-xl text-xs font-bold border transition ${
                      storeStatus.noticeType === tone.id ? tone.color + " ring-2 ring-slate-900/10" : "bg-slate-50 border-slate-200 text-slate-600"
                    }`}
                  >
                    {tone.label.split(" ")[0]}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 block">Catalog Visibility When Closed</label>
              <label className="flex items-center gap-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={storeStatus.allowBrowsing}
                  onChange={(e) => setStoreStatus((prev) => ({ ...prev, allowBrowsing: e.target.checked }))}
                  className="rounded text-brand-green-600 focus:ring-brand-green-500 h-4 w-4"
                />
                <span className="text-xs text-slate-700 font-medium">
                  Allow customers to browse catalog &amp; view wholesale prices (checkout disabled)
                </span>
              </label>
            </div>
          </div>

          {/* Live Customer Preview */}
          <div className="space-y-2 pt-2">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-green-600" />
              Live Preview (How Customers See the Banner):
            </span>
            <div
              className={`p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border flex items-start gap-3 transition-all ${
                storeStatus.noticeType === "alert"
                  ? "bg-red-50 border-red-200 text-red-900"
                  : storeStatus.noticeType === "info"
                  ? "bg-blue-50 border-blue-200 text-blue-900"
                  : "bg-amber-50 border-amber-200 text-amber-900"
              }`}
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed font-semibold">
                <span className="font-black uppercase tracking-wider block text-[10px] opacity-80 mb-0.5">
                  {storeStatus.isOpen ? "Active Store Notice" : "Store Temporarily Closed"}
                </span>
                {storeStatus.bannerMessage || "No notice message set."}
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
            <button
              type="button"
              onClick={handleSaveStoreStatus}
              disabled={savingStoreStatus}
              className="px-5 py-2.5 bg-brand-green-600 hover:bg-brand-green-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition flex items-center gap-2 disabled:opacity-50"
            >
              <Save className={`w-4 h-4 ${savingStoreStatus ? "animate-spin" : ""}`} />
              <span>{savingStoreStatus ? "Saving Changes..." : "Publish Store Status"}</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: AUTOMATED ALERTS & NOTIFICATIONS (ADMIN) */}
      {/* ========================================================= */}
      {activeTab === "alerts" && isAdmin && (
        <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <BellRing className="w-4 h-4 text-brand-green-600" /> Automated Alerts &amp; Notification Preferences
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 leading-relaxed">
              Never miss a critical event in your warehouse. Set up carton threshold alerts and automated WhatsApp order notifications.
            </p>
          </div>

          {/* Section A: Low Stock Warning Threshold */}
          <div className="space-y-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-brand-green-600" /> Low Stock Warning Threshold
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                  Trigger admin alerts when carton quantities fall below your designated safe levels.
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={alertsForm.lowStockAlertsEnabled}
                  onChange={(e) => setAlertsForm((prev) => ({ ...prev, lowStockAlertsEnabled: e.target.checked }))}
                  className="rounded text-brand-green-600 focus:ring-brand-green-500 h-4 w-4"
                />
                <span className="text-xs font-bold text-slate-700">Enabled</span>
              </label>
            </div>

            {/* Global Threshold Input */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center pt-2">
              <label className="text-xs font-bold text-slate-700 sm:col-span-2">
                Default Global Threshold (Cartons)
                <span className="block text-[11px] font-normal text-slate-500">
                  Products with fewer cartons than this will be flagged as low stock across the admin dashboard.
                </span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="1000"
                  value={alertsForm.lowStockThreshold}
                  onChange={(e) => setAlertsForm((prev) => ({ ...prev, lowStockThreshold: parseInt(e.target.value, 10) || 0 }))}
                  className="w-28 text-center text-sm font-black p-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green-500/20 outline-none"
                />
                <span className="text-xs font-bold text-slate-500">Cartons</span>
              </div>
            </div>

            {/* Category-Specific Thresholds */}
            <div className="space-y-2 pt-2 border-t border-slate-200/60">
              <span className="text-xs font-bold text-slate-800 block">
                Category-Specific Thresholds:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {Object.entries(alertsForm.categoryThresholds || {}).map(([cat, val]) => (
                  <div key={cat} className="flex items-center justify-between p-2.5 bg-white border border-slate-200/70 rounded-xl">
                    <span className="text-xs font-semibold text-slate-700 truncate mr-2">{cat}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <input
                        type="number"
                        min="0"
                        value={val}
                        onChange={(e) => {
                          const num = parseInt(e.target.value, 10) || 0;
                          setAlertsForm((prev) => ({
                            ...prev,
                            categoryThresholds: {
                              ...prev.categoryThresholds,
                              [cat]: num,
                            },
                          }));
                        }}
                        className="w-14 text-center text-xs font-black p-1 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                      />
                      <span className="text-[10px] text-slate-400 font-bold">ctns</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section B: WhatsApp / SMS Order Notifications */}
          <div className="space-y-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-emerald-600" /> WhatsApp / SMS Order Notifications
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                  Automatically ping the store owner on WhatsApp whenever any new order is placed.
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={alertsForm.whatsappNotificationsEnabled}
                  onChange={(e) => setAlertsForm((prev) => ({ ...prev, whatsappNotificationsEnabled: e.target.checked }))}
                  className="rounded text-brand-green-600 focus:ring-brand-green-500 h-4 w-4"
                />
                <span className="text-xs font-bold text-slate-700">Enabled</span>
              </label>
            </div>

            {/* WhatsApp Phone Number */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center pt-2">
              <label className="text-xs font-bold text-slate-700 sm:col-span-1">
                Store Owner WhatsApp Number
                <span className="block text-[11px] font-normal text-slate-500">
                  Include country code (e.g. +2348012345678)
                </span>
              </label>
              <div className="sm:col-span-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  value={alertsForm.whatsappNumber}
                  onChange={(e) => setAlertsForm((prev) => ({ ...prev, whatsappNumber: e.target.value }))}
                  placeholder="+234 800 000 0000"
                  className="flex-1 text-xs sm:text-sm font-semibold p-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-green-500/20 outline-none"
                />
                <button
                  type="button"
                  onClick={handleTestWhatsApp}
                  className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shrink-0 active:scale-95"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Test WhatsApp</span>
                </button>
              </div>
            </div>

            {/* WhatsApp Notification Message Format Preview */}
            <div className="bg-emerald-950/90 text-emerald-100 rounded-xl p-3.5 border border-emerald-800 text-[11px] font-mono leading-relaxed space-y-1">
              <span className="text-emerald-400 font-bold block text-[10px] uppercase">Automated WhatsApp Message Format:</span>
              <p>📦 *NEW WHOLESALE ORDER ALERT - VINOFF*</p>
              <p>*Order Number:* #VIN-2026-0042</p>
              <p>*Customer:* Alhaji Musa Bello (0803XXXXXXX)</p>
              <p>*Total Amount:* ₦485,000</p>
              <p>*Items:* 15 cartons (Beverages &amp; Toiletries)</p>
              <p>*Status:* Pending Payment / Invoice Generated</p>
            </div>
          </div>

          {/* Section C: In-App Sound Alerts */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-brand-green-600" /> In-App Audible Chimes
              </span>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Play an audible alert sound in the dashboard when customer chats and new orders arrive.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={alertsForm.soundAlertsEnabled}
                onChange={(e) => setAlertsForm((prev) => ({ ...prev, soundAlertsEnabled: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-green-600"></div>
            </label>
          </div>

          {/* Save Button */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
            <button
              type="button"
              onClick={handleSaveAlerts}
              disabled={savingAlerts}
              className="px-5 py-2.5 bg-brand-green-600 hover:bg-brand-green-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition flex items-center gap-2 disabled:opacity-50"
            >
              <Save className={`w-4 h-4 ${savingAlerts ? "animate-spin" : ""}`} />
              <span>{savingAlerts ? "Saving Preferences..." : "Save Alert Settings"}</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: SESSION MANAGER & DEVICE HISTORY */}
      {/* ========================================================= */}
      {activeTab === "sessions" && (
        <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-xs space-y-6">
          {/* Header & Global Revoke Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-brand-green-600" /> Active Login Sessions &amp; Device History
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 leading-relaxed">
                Review all computers, phones, and tablets currently logged into your account. Terminate any unfamiliar sessions.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRevokeOtherSessions}
              disabled={revokingOthers || sessions.length <= 1}
              className="self-start sm:self-auto px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition flex items-center gap-2 disabled:opacity-50 shadow-xs active:scale-95"
            >
              <LogOut className={`w-3.5 h-3.5 ${revokingOthers ? "animate-spin" : ""}`} />
              <span>{revokingOthers ? "Revoking..." : "Log Out of All Other Devices"}</span>
            </button>
          </div>

          {/* Sessions List */}
          {loadingSessions ? (
            <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
              Loading active device sessions...
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 italic">
              No other active sessions recorded.
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((sess) => {
                const DeviceIcon = getDeviceIcon(sess.device);
                const isCurrent = Boolean(sess.isCurrent);
                const lastActiveDate = new Date(sess.lastActive || sess.createdAt);

                return (
                  <div
                    key={sess.sessionId}
                    className={`p-4 rounded-xl sm:rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isCurrent
                        ? "bg-emerald-50/50 border-emerald-200"
                        : "bg-slate-50/70 border-slate-200/80 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                          isCurrent
                            ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                            : "bg-slate-200 text-slate-600 border-slate-300"
                        }`}
                      >
                        <DeviceIcon className="w-5 h-5" />
                      </div>

                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-slate-900 text-xs sm:text-sm">
                            {sess.device || "Desktop"}
                          </span>
                          {isCurrent && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                              This Current Device
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium flex-wrap">
                          <span>{sess.browser || "Web Browser"}</span>
                          <span>•</span>
                          <span>{sess.os || "OS"}</span>
                          <span>•</span>
                          <span className="font-mono text-slate-400">IP: {sess.ip || "127.0.0.1"}</span>
                        </div>

                        <p className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>
                            Last active:{" "}
                            {lastActiveDate.toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}{" "}
                            at{" "}
                            {lastActiveDate.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    {!isCurrent && (
                      <button
                        type="button"
                        onClick={() => handleRevokeSingleSession(sess.sessionId)}
                        disabled={revokingId === sess.sessionId}
                        className="self-start sm:self-auto text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 transition active:scale-95 disabled:opacity-50 flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{revokingId === sess.sessionId ? "Revoking..." : "Revoke Session"}</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Security Note */}
          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-start gap-2">
            <Shield className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
            <p className="leading-relaxed">
              <strong>Security Guard:</strong> Clicking "Log Out of All Other Devices" will instantly invalidate all active JWT authorization tokens issued to other phones, laptops, and browsers, keeping only your current session active.
            </p>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: BANK ACCOUNT DETAILS (ADMIN) */}
      {/* ========================================================= */}
      {activeTab === "bank_details" && isAdmin && (
        <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-xs space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Landmark className="w-4 h-4 text-brand-green-600" /> Company Bank Account &amp; Wire Details
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 leading-relaxed">
                These payment details are displayed live on the Checkout page, Invoice views, and PDF invoice downloads.
              </p>
            </div>

            {/* Permission Badge */}
            {isSuperAdmin ? (
              <span className="self-start sm:self-auto inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl shadow-2xs">
                <Shield className="w-3.5 h-3.5 text-emerald-600" /> Super Admin Access (Edit Rights)
              </span>
            ) : (
              <span className="self-start sm:self-auto inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl">
                <Lock className="w-3.5 h-3.5 text-slate-400" /> Read-Only (Super Admin Required)
              </span>
            )}
          </div>

          <form onSubmit={handleSaveBankDetails} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Bank Name</label>
                <input
                  type="text"
                  disabled={!isSuperAdmin || savingBank}
                  value={bankForm.bankName}
                  onChange={(e) => setBankForm((prev) => ({ ...prev, bankName: e.target.value }))}
                  placeholder="e.g. Guaranty Trust Bank (GTB)"
                  className="w-full text-xs sm:text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-brand-green-500 focus:ring-2 focus:ring-brand-green-500/20 transition-all font-semibold text-slate-800 outline-none disabled:opacity-75 disabled:cursor-not-allowed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Account Number</label>
                <input
                  type="text"
                  disabled={!isSuperAdmin || savingBank}
                  value={bankForm.accountNumber}
                  onChange={(e) => setBankForm((prev) => ({ ...prev, accountNumber: e.target.value }))}
                  placeholder="e.g. 0123456789"
                  className="w-full text-xs sm:text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-brand-green-500 focus:ring-2 focus:ring-brand-green-500/20 transition-all font-mono font-bold text-slate-800 outline-none disabled:opacity-75 disabled:cursor-not-allowed"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-slate-700">Account Name (Beneficiary)</label>
                <input
                  type="text"
                  disabled={!isSuperAdmin || savingBank}
                  value={bankForm.accountName}
                  onChange={(e) => setBankForm((prev) => ({ ...prev, accountName: e.target.value }))}
                  placeholder="e.g. Vinoff Wholesales Ltd"
                  className="w-full text-xs sm:text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-brand-green-500 focus:ring-2 focus:ring-brand-green-500/20 transition-all font-semibold text-slate-800 outline-none disabled:opacity-75 disabled:cursor-not-allowed"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-slate-700">Payment Narration Instructions</label>
                <textarea
                  rows={2}
                  disabled={!isSuperAdmin || savingBank}
                  value={bankForm.instructions}
                  onChange={(e) => setBankForm((prev) => ({ ...prev, instructions: e.target.value }))}
                  placeholder="e.g. Please use your Order # or Invoice # as the transfer payment narration."
                  className="w-full text-xs sm:text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-brand-green-500 focus:ring-2 focus:ring-brand-green-500/20 transition-all font-medium text-slate-800 outline-none disabled:opacity-75 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {isSuperAdmin && (
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={savingBank}
                  className="px-5 py-2.5 bg-brand-green-600 hover:bg-brand-green-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className={`w-4 h-4 ${savingBank ? "animate-spin" : ""}`} />
                  <span>{savingBank ? "Saving..." : "Save Bank Details"}</span>
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 5: ANNOUNCEMENTS */}
      {/* ========================================================= */}
      {activeTab === "announcements" && (
        <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-xs space-y-4 sm:space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-brand-green-600" /> Platform Announcements &amp; Store Updates
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Review active store announcements, downtime schedules, new product drops, and official updates.
            </p>
          </div>

          {loadingAnnouncements ? (
            <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
              Loading store announcements...
            </div>
          ) : announcements.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 italic">
              No active announcements right now. Check back soon for new updates!
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {announcements.map((item) => (
                <div
                  key={item._id}
                  className="bg-slate-50 border border-slate-200/80 rounded-xl sm:rounded-2xl p-4 sm:p-5 space-y-2.5 sm:space-y-3 hover:border-brand-green-300 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-slate-900 text-xs sm:text-sm">{item.title}</span>
                      <span
                        className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
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

      {/* ========================================================= */}
      {/* TAB 6: STORE & LOCATION */}
      {/* ========================================================= */}
      {activeTab === "store" && (
        <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-xs space-y-4 sm:space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-brand-green-600" /> Physical Warehouse &amp; Store Location
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Visit our physical trade plaza store in Badagry Expressway, Lagos for direct warehouse pick-ups and store inspection.
            </p>
          </div>

          <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-xl sm:rounded-2xl p-4 sm:p-5 space-y-2 border border-slate-800 shadow-xs">
            <span className="text-[10px] font-extrabold uppercase text-brand-yellow-400 tracking-wider block">
              Official Physical Store Address
            </span>
            <p className="text-xs sm:text-sm font-black leading-relaxed text-slate-100">
              KADUNA PLAZA 1, BLOCK A, SHOP 22<br />
              INT’L CENTRE FOR COMMERCE, TRADE-FAIR COMPLEX,<br />
              BADAGRY EXPRESS WAY, LAGOS, NIGERIA.
            </p>
          </div>

          {/* Video Walkthrough Direction */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Video className="w-4 h-4 text-brand-green-600" /> Walk-in Store Location &amp; Direction Video
            </h3>
            <div className="rounded-xl sm:rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 shadow-sm max-w-2xl mx-auto w-full aspect-video sm:aspect-auto">
              <video
                src="/VINOFF_C0_walkthrough.MP4"
                controls
                autoPlay
                muted
                loop
                className="w-full h-full max-h-72 sm:max-h-96 object-contain"
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

      {/* ========================================================= */}
      {/* TAB 7: ACCOUNT INFO */}
      {/* ========================================================= */}
      {activeTab === "account" && (
        <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-xs space-y-4 sm:space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <User className="w-4 h-4 text-brand-green-600" /> Account &amp; System Overview
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Review your credentials, account role, and active permissions.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs">
            <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl sm:rounded-2xl p-4 space-y-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Customer / Admin Name</span>
              <p className="font-bold text-slate-900 text-xs sm:text-sm">
                {user?.firstName} {user?.lastName}
              </p>
              <span className="text-[10px] text-slate-400 font-bold uppercase block pt-2">Email Address</span>
              <p className="font-semibold text-slate-800 flex items-center gap-1 truncate">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" /> <span className="truncate">{user?.email}</span>
              </p>
            </div>

            <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl sm:rounded-2xl p-4 space-y-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Account Role</span>
              <span className="font-bold text-brand-green-700 uppercase">{user?.role || "Customer"}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase block pt-2">Account Status</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                ● Active Verified Account
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
