import React, { useState, useEffect, useContext } from "react";
import api from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { unwrapApiList, unwrapApiRecord } from "../../utils/apiResponse";
import { createIdempotencyKey, withIdempotencyKey } from "../../services/idempotency";
import { playNotificationChime, playSwitchSound } from "../../utils/soundEffects";
import { showConfirm } from "../../services/ui/modal";
import {
  Settings as SettingsIcon,
  MapPin,
  Building,
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
  Sliders,
  Sparkles,
  Play,
  Edit3,
  Plus,
} from "lucide-react";

export const Settings = () => {
  const { user, isAdmin } = useContext(AuthContext);
  const { toast } = useToast();

  const isSuperAdmin = user?.role === "superadmin";

  // Tab State: default to store_status if admin, store if customer
  const [activeTab, setActiveTab] = useState(isAdmin ? "store_status" : "store");

  // =========================================================
  // 1. STORE STATUS STATE (ACTIVE / PAUSED)
  // =========================================================
  const [storeStatus, setStoreStatus] = useState({
    isOpen: true,
    bannerMessage: "We are restocking our warehouse for the weekend. Orders placed today will be dispatched Monday.",
  });
  const [loadingStoreStatus, setLoadingStoreStatus] = useState(false);
  const [savingStoreStatus, setSavingStoreStatus] = useState(false);

  // =========================================================
  // 2. AUTOMATED ALERTS & NOTIFICATION PREFERENCES STATE
  // =========================================================
  const [alertsForm, setAlertsForm] = useState({
    lowStockThreshold: 5,
    categoryThresholds: {
      Toiletries: 5,
      "Household Cleaners": 5,
      Cosmetics: 5,
      "Laundry Care": 5,
    },
    lowStockAlertsEnabled: true,
    whatsappNotificationsEnabled: true,
    whatsappNumber: "",
    notifyOnNewOrder: true,
    soundAlertsEnabled: true,
  });
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [savingAlerts, setSavingAlerts] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [removingCategoryName, setRemovingCategoryName] = useState(null);

  // =========================================================
  // 3. STORE LOCATION & WORKING STORE STATE (EDITABLE BY ADMIN)
  // =========================================================
  const [locationForm, setLocationForm] = useState({
    shopAddress: "KADUNA PLAZA 1, BLOCK A, SHOP 22",
    complexArea: "INT’L CENTRE FOR COMMERCE, TRADE-FAIR COMPLEX",
    cityState: "BADAGRY EXPRESS WAY, LAGOS, NIGERIA",
    operatingHours: "Monday – Saturday: 8:00 AM – 5:30 PM",
    phoneContact: "+234 803 000 0000",
    walkthroughVideoUrl: "/VINOFF_C0_walkthrough.MP4",
  });
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);

  // =========================================================
  // 4. SESSION MANAGER & DEVICE HISTORY STATE
  // =========================================================
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [revokingOthers, setRevokingOthers] = useState(false);
  const [revokingId, setRevokingId] = useState(null);

  // =========================================================
  // 5. COMPANY BANK ACCOUNT STATE (ADMIN)
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
  // FETCH DATA
  // =========================================================
  // Fetch Store Status
  useEffect(() => {
    const fetchStoreStatus = async () => {
      setLoadingStoreStatus(true);
      try {
        const res = await api.get("/api/settings/store-status");
        const record = unwrapApiRecord(res) || res.data?.data || res.data;
        if (record && typeof record.isOpen === "boolean") {
          setStoreStatus({
            isOpen: record.isOpen,
            bannerMessage: record.bannerMessage || "",
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

  // Fetch Store Location
  useEffect(() => {
    const fetchLocation = async () => {
      setLoadingLocation(true);
      try {
        const res = await api.get("/api/settings/store-location");
        const record = unwrapApiRecord(res) || res.data?.data || res.data;
        if (record && record.shopAddress) {
          setLocationForm({
            shopAddress: record.shopAddress || "KADUNA PLAZA 1, BLOCK A, SHOP 22",
            complexArea: record.complexArea || "INT’L CENTRE FOR COMMERCE, TRADE-FAIR COMPLEX",
            cityState: record.cityState || "BADAGRY EXPRESS WAY, LAGOS, NIGERIA",
            operatingHours: record.operatingHours || "Monday – Saturday: 8:00 AM – 5:30 PM",
            phoneContact: record.phoneContact || "+234 803 000 0000",
            walkthroughVideoUrl: record.walkthroughVideoUrl || "/VINOFF_C0_walkthrough.MP4",
          });
        }
      } catch (err) {
        console.error("Failed to load store location:", err);
      } finally {
        setLoadingLocation(false);
      }
    };
    fetchLocation();
  }, []);

  // Fetch Alerts & Notifications (Admin)
  useEffect(() => {
    if (!isAdmin) return;
    const fetchAlerts = async () => {
      setLoadingAlerts(true);
      try {
        const res = await api.get("/api/settings/notifications");
        const record = unwrapApiRecord(res) || res.data?.data || res.data;
        if (record) {
          // Clean category thresholds so only real categories are listed
          const cleanCategoryThresholds = {};
          const knownCategories = ["Toiletries", "Household Cleaners", "Cosmetics", "Laundry Care"];
          
          // Merge real categories from saved settings or known categories
          const savedCategories = record.categoryThresholds ? Object.keys(record.categoryThresholds) : [];
          const allRealCategories = Array.from(
            new Set([...knownCategories, ...savedCategories.filter((c) => c && c !== "All" && !/beverage/i.test(c))])
          );

          allRealCategories.forEach((cat) => {
            cleanCategoryThresholds[cat] = record.categoryThresholds?.[cat] ?? record.lowStockThreshold ?? 5;
          });

          setAlertsForm((prev) => ({
            ...prev,
            lowStockThreshold: record.lowStockThreshold ?? prev.lowStockThreshold,
            categoryThresholds: cleanCategoryThresholds,
            lowStockAlertsEnabled: record.lowStockAlertsEnabled ?? prev.lowStockAlertsEnabled,
            whatsappNotificationsEnabled: record.whatsappNotificationsEnabled ?? prev.whatsappNotificationsEnabled,
            whatsappNumber: record.whatsappNumber ?? prev.whatsappNumber,
            notifyOnNewOrder: record.notifyOnNewOrder ?? prev.notifyOnNewOrder,
            soundAlertsEnabled: record.soundAlertsEnabled ?? prev.soundAlertsEnabled,
          }));

          // Sync sound enabled preference
          if (record.soundAlertsEnabled !== undefined) {
            localStorage.setItem("vinoff_sound_enabled", String(record.soundAlertsEnabled));
          }
        }
      } catch (err) {
        console.error("Failed to load notification settings:", err);
      } finally {
        setLoadingAlerts(false);
      }
    };
    fetchAlerts();
  }, [isAdmin]);

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

  // Toggle Store Status (Plays switch sound immediately)
  const handleToggleStoreStatus = () => {
    playSwitchSound();
    setStoreStatus((prev) => ({
      ...prev,
      isOpen: !prev.isOpen,
    }));
  };

  // Save Store Status
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
          ? "Store is now Active! No banner is shown to customers."
          : "Store paused. Vacation banner is now active for customers.",
        storeStatus.isOpen ? "Store Active" : "Store Inactive / Paused"
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
      localStorage.setItem("vinoff_sound_enabled", String(alertsForm.soundAlertsEnabled));
      toast.success("Low-stock alerts & WhatsApp notification rules updated!", "Preferences Saved");
    } catch (err) {
      const message = err.response?.data?.message || err.message || "Failed to save alert preferences";
      toast.error(message, "Preferences Error");
    } finally {
      setSavingAlerts(false);
    }
  };

  // Toggle Sound Chimes & Play Sound
  const handleToggleSound = (checked) => {
    setAlertsForm((prev) => ({ ...prev, soundAlertsEnabled: checked }));
    localStorage.setItem("vinoff_sound_enabled", String(checked));
    if (checked) {
      playNotificationChime();
    }
  };

  // Add Custom Category
  const handleAddCategory = async (e) => {
    if (e) e.preventDefault();
    const cleanName = newCategoryName.trim();
    if (!cleanName) {
      toast.error("Please enter a category name");
      return;
    }
    if (cleanName.length < 2) {
      toast.error("Category name must be at least 2 characters");
      return;
    }
    if (/beverage/i.test(cleanName)) {
      toast.error("Beverage categories are not permitted");
      return;
    }

    const currentCats = Object.keys(alertsForm.categoryThresholds || {});
    const exists = currentCats.some((c) => c.toLowerCase() === cleanName.toLowerCase());
    if (exists) {
      toast.error(`Category "${cleanName}" already exists`);
      return;
    }

    setAddingCategory(true);
    try {
      await api.post("/api/settings/categories", { name: cleanName });
      const nextThreshold = alertsForm.lowStockThreshold || 5;
      setAlertsForm((prev) => ({
        ...prev,
        categoryThresholds: {
          ...prev.categoryThresholds,
          [cleanName]: nextThreshold,
        },
      }));
      setNewCategoryName("");
      toast.success(`Category "${cleanName}" created and added successfully!`);
    } catch (err) {
      console.error("Failed to add category:", err);
      toast.error(err.response?.data?.message || err.message || "Failed to add category");
    } finally {
      setAddingCategory(false);
    }
  };

  // Remove Custom Category
  const handleRemoveCategory = async (catName) => {
    const isStandard = ["Toiletries", "Household Cleaners", "Cosmetics", "Laundry Care"].some(
      (c) => c.toLowerCase() === catName.toLowerCase()
    );
    if (isStandard) {
      toast.error(`Standard category "${catName}" cannot be removed.`);
      return;
    }

    const confirmed = await showConfirm({
      title: "Remove Category",
      message: `Are you sure you want to remove the custom category "${catName}"? This will remove it from threshold alerts and catalog filters.`,
      confirmText: "Remove Category",
      okText: "Remove Category",
      cancelText: "Cancel",
      tone: "danger",
    });
    if (!confirmed) return;

    setRemovingCategoryName(catName);
    try {
      await api.delete(`/api/settings/categories/${encodeURIComponent(catName)}`);
      setAlertsForm((prev) => {
        const nextThresholds = { ...prev.categoryThresholds };
        delete nextThresholds[catName];
        return {
          ...prev,
          categoryThresholds: nextThresholds,
        };
      });
      toast.success(`Category "${catName}" removed successfully.`);
    } catch (err) {
      console.error("Failed to remove category:", err);
      toast.error(err.response?.data?.message || err.message || "Failed to remove category");
    } finally {
      setRemovingCategoryName(null);
    }
  };

  // Save Store Location (Admin & Super Admin)
  const handleSaveLocation = async (e) => {
    e?.preventDefault?.();
    setSavingLocation(true);
    try {
      const res = await api.put(
        "/api/settings/store-location",
        locationForm,
        withIdempotencyKey(createIdempotencyKey("update-store-location"))
      );
      const data = unwrapApiRecord(res) || res.data?.data || res.data;
      if (data) {
        setLocationForm((prev) => ({ ...prev, ...data }));
      }
      toast.success("Physical store location and pickup details updated!", "Location Saved");
    } catch (err) {
      const message = err.response?.data?.message || err.message || "Failed to update store location";
      toast.error(message, "Location Error");
    } finally {
      setSavingLocation(false);
    }
  };

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

  // Revoke other sessions
  const handleRevokeOtherSessions = async () => {
    const confirmed = await showConfirm({
      title: "Log Out All Other Devices",
      message: "Are you sure you want to log out of all other devices? Other active sessions will be terminated immediately.",
      confirmText: "Log Out All Others",
      okText: "Log Out All Others",
      cancelText: "Keep Signed In",
      tone: "danger",
    });
    if (!confirmed) return;

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

  // Revoke single session
  const handleRevokeSingleSession = async (sessionId) => {
    const confirmed = await showConfirm({
      title: "Terminate Device Session",
      message: "Are you sure you want to log out this device session?",
      confirmText: "Log Out Device",
      okText: "Log Out Device",
      cancelText: "Cancel",
      tone: "warning",
    });
    if (!confirmed) return;

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

  // Test WhatsApp
  const handleTestWhatsApp = () => {
    if (!alertsForm.whatsappNumber) {
      toast.warning("Please enter your WhatsApp phone number first.", "Phone Required");
      return;
    }
    const cleanNumber = alertsForm.whatsappNumber.replace(/[^0-9]/g, "");
    const testText =
      `*🔔 VINOFF ORDER NOTIFICATION TEST*\n\n` +
      `Your automated WhatsApp order notification is working!\n` +
      `Whenever a wholesale order is placed, you will receive real-time order alerts here.\n\n` +
      `Time: ${new Date().toLocaleTimeString()} • Vinoff Wholesales Ltd`;

    const url = `https://api.whatsapp.com/send?phone=${cleanNumber}&text=${encodeURIComponent(testText)}`;
    window.open(url, "_blank");
  };

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
                Configure store operational status, warehouse location, real category carton alerts, and device sessions.
              </p>
            </div>
          </div>

          {/* Status Indicator */}
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
                {storeStatus.isOpen ? "Store Active (Orders Open)" : "Store Inactive (Orders Paused)"}
              </span>
            </div>
          )}
        </div>

        {/* Tab Navigation Bar (Announcements & Account Info removed) */}
        <div className="flex items-center gap-1.5 sm:gap-2 border-t border-slate-800/80 pt-3.5 sm:pt-5 mt-4 sm:mt-6 overflow-x-auto no-scrollbar scroll-smooth">
          {[
            ...(isAdmin
              ? [
                  { id: "store_status", label: "Store Status", icon: Store },
                  { id: "alerts", label: "Alerts & Notifications", icon: BellRing },
                ]
              : []),
            { id: "store", label: "Store Location", icon: MapPin },
            { id: "sessions", label: `Active Devices (${sessions.length || 1})`, icon: Smartphone },
            ...(isAdmin
              ? [{ id: "bank_details", label: "Bank Account Details", icon: Landmark }]
              : []),
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
      {/* TAB 1: STORE STATUS (SIMPLE TOGGLE & BANNER MESSAGE) */}
      {/* ========================================================= */}
      {activeTab === "store_status" && isAdmin && (
        <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Store className="w-4 h-4 text-brand-green-600" /> Store Status &amp; Vacation Mode
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 leading-relaxed">
              When active, the store accepts orders normally with no banner message. When switched off, the banner message informs customers that orders are paused.
            </p>
          </div>

          {/* Simple Switch */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
                <Power className={`w-4 h-4 ${storeStatus.isOpen ? "text-emerald-600" : "text-amber-600"}`} />
                Status: {storeStatus.isOpen ? "Active (Accepting Orders)" : "Paused / Vacation Mode"}
              </span>
              <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed">
                {storeStatus.isOpen
                  ? "The store is active and accepting wholesale orders. No announcement banner is displayed to customers."
                  : "The store is temporarily paused. Checkout is disabled and the banner message below is displayed to customers."}
              </p>
            </div>

            <button
              type="button"
              onClick={handleToggleStoreStatus}
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

          {/* Banner message only needed when switched off */}
          {!storeStatus.isOpen ? (
            <div className="space-y-3 pt-2 animate-fade-in">
              <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>Banner Message for Customers (Displayed while paused)</span>
                <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Visible to shoppers
                </span>
              </label>

              <textarea
                rows={3}
                value={storeStatus.bannerMessage}
                onChange={(e) => setStoreStatus((prev) => ({ ...prev, bannerMessage: e.target.value }))}
                placeholder="We are restocking our warehouse for the weekend. Orders placed today will be dispatched Monday."
                className="w-full text-xs sm:text-sm p-3.5 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl focus:bg-white focus:border-brand-green-500 focus:ring-2 focus:ring-brand-green-500/20 transition-all font-medium text-slate-800 outline-none"
              />

              {/* Preview */}
              <div className="p-3 bg-amber-500 text-amber-950 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  <strong>Preview:</strong> [Orders Paused] {storeStatus.bannerMessage || "We are restocking our warehouse for the weekend."}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Store is Active:</strong> Shoppers can assemble carton orders and proceed directly to invoice checkout. No banners will clutter the screen.
              </span>
            </div>
          )}

          {/* Save Button */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
            <button
              type="button"
              onClick={handleSaveStoreStatus}
              disabled={savingStoreStatus}
              className="px-5 py-2.5 bg-brand-green-600 hover:bg-brand-green-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition flex items-center gap-2 disabled:opacity-50"
            >
              <Save className={`w-4 h-4 ${savingStoreStatus ? "animate-spin" : ""}`} />
              <span>{savingStoreStatus ? "Saving..." : "Save Store Status"}</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: ALERTS & NOTIFICATIONS (REAL CATEGORIES ONLY) */}
      {/* ========================================================= */}
      {activeTab === "alerts" && isAdmin && (
        <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <BellRing className="w-4 h-4 text-brand-green-600" /> Alerts &amp; Notification Preferences
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 leading-relaxed">
              Set carton thresholds based on your store's real categories and manage automated WhatsApp order alerts and in-app sound chimes.
            </p>
          </div>

          {/* Section A: Low Stock Carton Warning (Real Categories Only) */}
          <div className="space-y-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-brand-green-600" /> Low Stock Carton Thresholds
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                  Alert is triggered when inventory reaches or drops below these carton counts.
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

            {/* Global Threshold */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center pt-2">
              <label className="text-xs font-bold text-slate-700 sm:col-span-2">
                Default General Threshold (Cartons)
                <span className="block text-[11px] font-normal text-slate-500">
                  Applied to any product unless a category-specific threshold is set below.
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

            {/* Store Categories & Carton Alert Thresholds */}
            <div className="space-y-4 pt-3 border-t border-slate-200/60">
              <div>
                <span className="text-xs sm:text-sm font-black text-slate-800 block">
                  Product Categories &amp; Carton Alert Thresholds
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Standard store categories are <span className="font-bold text-slate-700">Toiletries, Household Cleaners, Cosmetics, and Laundry Care</span>. You can create your own custom categories below anytime.
                </p>
              </div>

              {/* Add Custom Category Form */}
              <div className="p-3 sm:p-4 bg-white border border-slate-200/90 rounded-2xl shadow-2xs space-y-2">
                <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider block">
                  Add New Store Category
                </span>
                <form
                  onSubmit={handleAddCategory}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
                >
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Enter category name (e.g. Baby Care, Disinfectants, Hair Care)..."
                    className="flex-1 text-xs font-semibold px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-brand-green-500/20 text-slate-800 placeholder:text-slate-400"
                  />
                  <button
                    type="submit"
                    disabled={addingCategory || !newCategoryName.trim()}
                    className="px-4 py-2.5 rounded-xl bg-brand-green-600 hover:bg-brand-green-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shrink-0 shadow-xs active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{addingCategory ? "Creating..." : "Add Category"}</span>
                  </button>
                </form>
              </div>

              {/* Category Thresholds Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
                {Object.entries(alertsForm.categoryThresholds || {}).map(([cat, val]) => {
                  const isStandard = ["Toiletries", "Household Cleaners", "Cosmetics", "Laundry Care"].some(
                    (c) => c.toLowerCase() === cat.toLowerCase()
                  );
                  const isRemoving = removingCategoryName === cat;

                  return (
                    <div
                      key={cat}
                      className="flex flex-col justify-between p-3.5 bg-white border border-slate-200/80 rounded-2xl shadow-2xs hover:border-slate-300 transition-all gap-3"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-black text-slate-800 truncate" title={cat}>
                          {cat}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          {isStandard ? (
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                              Standard
                            </span>
                          ) : (
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] font-bold uppercase tracking-wider text-brand-green-700 bg-brand-green-50 px-1.5 py-0.5 rounded border border-brand-green-200">
                                Custom
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveCategory(cat)}
                                disabled={isRemoving}
                                title={`Delete custom category "${cat}"`}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                        <span className="text-[11px] text-slate-500 font-medium">Alert if below:</span>
                        <div className="flex items-center gap-1.5">
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
                            className="w-16 text-center text-xs font-black p-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-brand-green-500/20"
                          />
                          <span className="text-[10px] text-slate-500 font-bold">ctns</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section B: WhatsApp Order Notifications */}
          <div className="space-y-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-emerald-600" /> WhatsApp Order Notifications
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                  Sends wholesale order details directly to your WhatsApp when an order is submitted.
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

            {/* Store Owner WhatsApp Number */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center pt-2">
              <label className="text-xs font-bold text-slate-700 sm:col-span-1">
                Store Owner WhatsApp Number
                <span className="block text-[11px] font-normal text-slate-500">
                  Include country code (e.g. +234 803 000 0000)
                </span>
              </label>
              <div className="sm:col-span-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  value={alertsForm.whatsappNumber}
                  onChange={(e) => setAlertsForm((prev) => ({ ...prev, whatsappNumber: e.target.value }))}
                  placeholder="+234 803 000 0000"
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

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed">
              <strong>Order Alert Dispatch:</strong> When customer finishes checkout, the order confirmation automatically connects with your WhatsApp number above. An instant email ping is also sent to your admin email address.
            </div>
          </div>

          {/* Section C: In-App Audible Chimes (Working Sound Synthesizer) */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-brand-green-600" /> In-App Audible Notification Chime
              </span>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Plays a dual-tone audio chime when new orders, low-stock warnings, and customer messages arrive.
              </p>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => playNotificationChime()}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 active:scale-95"
              >
                <Play className="w-3 h-3 text-slate-700" />
                <span>Test Sound</span>
              </button>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={alertsForm.soundAlertsEnabled}
                  onChange={(e) => handleToggleSound(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-green-600"></div>
              </label>
            </div>
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
      {/* TAB 3: STORE LOCATION & WORKING STORE (EDITABLE BY ADMIN) */}
      {/* ========================================================= */}
      {activeTab === "store" && (
        <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-brand-green-600" /> Physical Warehouse &amp; Store Location
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                Physical trade plaza store details at Trade Fair Complex, Lagos for direct customer pick-ups and walkthrough directions.
              </p>
            </div>

            {isAdmin && (
              <span className="self-start sm:self-auto inline-flex items-center gap-1.5 text-xs font-bold text-brand-green-700 bg-brand-green-50 px-2.5 py-1 rounded-xl border border-brand-green-200">
                <Edit3 className="w-3.5 h-3.5 text-brand-green-600" /> Admin Editable
              </span>
            )}
          </div>

          {/* Editable Form for Admin & Super Admin */}
          {isAdmin ? (
            <form onSubmit={handleSaveLocation} className="space-y-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700 block">
                Edit Warehouse &amp; Store Details:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Shop &amp; Block Address</label>
                  <input
                    type="text"
                    value={locationForm.shopAddress}
                    onChange={(e) => setLocationForm((prev) => ({ ...prev, shopAddress: e.target.value }))}
                    placeholder="KADUNA PLAZA 1, BLOCK A, SHOP 22"
                    className="w-full text-xs sm:text-sm p-2.5 bg-white border border-slate-200 rounded-xl focus:border-brand-green-500 focus:ring-2 focus:ring-brand-green-500/20 outline-none font-semibold text-slate-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Complex / Market Area</label>
                  <input
                    type="text"
                    value={locationForm.complexArea}
                    onChange={(e) => setLocationForm((prev) => ({ ...prev, complexArea: e.target.value }))}
                    placeholder="INT’L CENTRE FOR COMMERCE, TRADE-FAIR COMPLEX"
                    className="w-full text-xs sm:text-sm p-2.5 bg-white border border-slate-200 rounded-xl focus:border-brand-green-500 focus:ring-2 focus:ring-brand-green-500/20 outline-none font-semibold text-slate-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">City, State &amp; Expressway</label>
                  <input
                    type="text"
                    value={locationForm.cityState}
                    onChange={(e) => setLocationForm((prev) => ({ ...prev, cityState: e.target.value }))}
                    placeholder="BADAGRY EXPRESS WAY, LAGOS, NIGERIA"
                    className="w-full text-xs sm:text-sm p-2.5 bg-white border border-slate-200 rounded-xl focus:border-brand-green-500 focus:ring-2 focus:ring-brand-green-500/20 outline-none font-semibold text-slate-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Operating &amp; Pickup Hours</label>
                  <input
                    type="text"
                    value={locationForm.operatingHours}
                    onChange={(e) => setLocationForm((prev) => ({ ...prev, operatingHours: e.target.value }))}
                    placeholder="Monday – Saturday: 8:00 AM – 5:30 PM"
                    className="w-full text-xs sm:text-sm p-2.5 bg-white border border-slate-200 rounded-xl focus:border-brand-green-500 focus:ring-2 focus:ring-brand-green-500/20 outline-none font-semibold text-slate-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Pickup Driver Contact Phone</label>
                  <input
                    type="text"
                    value={locationForm.phoneContact}
                    onChange={(e) => setLocationForm((prev) => ({ ...prev, phoneContact: e.target.value }))}
                    placeholder="+234 803 000 0000"
                    className="w-full text-xs sm:text-sm p-2.5 bg-white border border-slate-200 rounded-xl focus:border-brand-green-500 focus:ring-2 focus:ring-brand-green-500/20 outline-none font-semibold text-slate-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Video Walkthrough URL</label>
                  <input
                    type="text"
                    value={locationForm.walkthroughVideoUrl}
                    onChange={(e) => setLocationForm((prev) => ({ ...prev, walkthroughVideoUrl: e.target.value }))}
                    placeholder="/VINOFF_C0_walkthrough.MP4"
                    className="w-full text-xs sm:text-sm p-2.5 bg-white border border-slate-200 rounded-xl focus:border-brand-green-500 focus:ring-2 focus:ring-brand-green-500/20 outline-none font-mono text-slate-800"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={savingLocation}
                  className="px-5 py-2.5 bg-brand-green-600 hover:bg-brand-green-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className={`w-4 h-4 ${savingLocation ? "animate-spin" : ""}`} />
                  <span>{savingLocation ? "Saving..." : "Save Location Details"}</span>
                </button>
              </div>
            </form>
          ) : null}

          {/* Live Address Display Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-xl sm:rounded-2xl p-4 sm:p-5 space-y-2 border border-slate-800 shadow-xs">
            <span className="text-[10px] font-extrabold uppercase text-brand-yellow-400 tracking-wider block">
              Official Physical Store Address
            </span>
            <p className="text-xs sm:text-sm font-black leading-relaxed text-slate-100">
              {locationForm.shopAddress}<br />
              {locationForm.complexArea}<br />
              {locationForm.cityState}
            </p>
            <div className="pt-2 flex flex-wrap gap-4 text-[11px] text-slate-300 font-medium">
              <span>🕒 {locationForm.operatingHours}</span>
              <span>📞 {locationForm.phoneContact}</span>
            </div>
          </div>

          {/* Video Walkthrough Player */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Video className="w-4 h-4 text-brand-green-600" /> Walk-in Store Location &amp; Direction Video
            </h3>
            <div className="rounded-xl sm:rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 shadow-sm max-w-2xl mx-auto w-full aspect-video sm:aspect-auto">
              <video
                src={locationForm.walkthroughVideoUrl || "/VINOFF_C0_walkthrough.MP4"}
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
              Direct video instructions guiding drivers and shoppers straight to Shop 22, Kaduna Plaza 1, Trade Fair Complex.
            </p>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: SESSION MANAGER & DEVICE HISTORY */}
      {/* ========================================================= */}
      {activeTab === "sessions" && (
        <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-brand-green-600" /> Active Login Sessions &amp; Device History
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 leading-relaxed">
                Review all computers, phones, and tablets currently logged into your account.
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

          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-start gap-2">
            <Shield className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
            <p className="leading-relaxed">
              <strong>Security Guard:</strong> Clicking "Log Out of All Other Devices" will instantly invalidate all active JWT authorization tokens issued to other phones, laptops, and browsers, keeping only your current session active.
            </p>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 5: BANK ACCOUNT DETAILS (ADMIN) */}
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
    </div>
  );
};

export default Settings;
