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
  Wrench,
  PackagePlus,
  AlertTriangle,
  Mail,
  Phone,
  Landmark,
  Lock,
  Save,
  CreditCard,
} from "lucide-react";

export const Settings = () => {
  const { user, isAdmin } = useContext(AuthContext);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("announcements");
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  // Company Bank Account State
  const [bankForm, setBankForm] = useState({
    bankName: "Guaranty Trust Bank (GTB)",
    accountName: "Vinoff Wholesales Ltd",
    accountNumber: "0123456789",
    instructions: "Please use your Order # or Invoice # as the transfer payment narration.",
  });
  const [loadingBank, setLoadingBank] = useState(false);
  const [savingBank, setSavingBank] = useState(false);

  const isSuperAdmin = user?.role === "superadmin";

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

  useEffect(() => {
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
  }, []);

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
      const message =
        err.status === 404
          ? "The bank-details API route was not found. Add or deploy PUT /api/settings/bank-details on the backend."
          : err.message || "Failed to update bank account details";
      toast.error(message, "Update Error");
    } finally {
      setSavingBank(false);
    }
  };

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
              Configure settlement bank details, read store announcements, and view platform location.
            </p>
          </div>
        </div>

        {/* Tab Navigation Bar */}
        <div className="flex items-center gap-2 border-t border-slate-800 pt-5 mt-6 overflow-x-auto">
          {[
            { id: "announcements", label: `Announcements & News (${announcements.length})`, icon: Megaphone },
            ...(isAdmin
              ? [{ id: "bank_details", label: "Bank Account Details", icon: Landmark }]
              : []),
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

      {/* Tab: Bank Account Details (Admins) */}
      {activeTab === "bank_details" && isAdmin && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Landmark className="w-4 h-4 text-brand-green-600" /> Official Company Bank Account & Wire Details
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                These payment details are displayed live on the Checkout page, Invoice views, and PDF invoice downloads.
              </p>
            </div>

            {/* Permission Badge */}
            {isSuperAdmin ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl shadow-2xs">
                <Shield className="w-3.5 h-3.5 text-emerald-600" /> Super Admin Access (Full Edit Rights)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
                <Lock className="w-3.5 h-3.5 text-amber-600" /> View Only (Super Admin Restricted)
              </span>
            )}
          </div>

          {loadingBank ? (
            <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
              Loading active bank account settings...
            </div>
          ) : (
            <form onSubmit={handleSaveBankDetails} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Bank Name */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                    Bank Name *
                  </label>
                  <input
                    type="text"
                    value={bankForm.bankName}
                    onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                    disabled={!isSuperAdmin}
                    placeholder="e.g. Guaranty Trust Bank (GTB)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-green-500 outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    required
                  />
                </div>

                {/* Account Name */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                    Account Name / Title *
                  </label>
                  <input
                    type="text"
                    value={bankForm.accountName}
                    onChange={(e) => setBankForm({ ...bankForm, accountName: e.target.value })}
                    disabled={!isSuperAdmin}
                    placeholder="e.g. Vinoff Wholesales Ltd"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-brand-green-500 outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    required
                  />
                </div>

                {/* Account Number */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                    Account Number *
                  </label>
                  <input
                    type="text"
                    value={bankForm.accountNumber}
                    onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                    disabled={!isSuperAdmin}
                    placeholder="e.g. 0123456789"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs font-mono font-black text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-green-500 outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    required
                  />
                </div>

                {/* Payment Narration / Instructions */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                    Payment Narration / Instructions (Shown to customer)
                  </label>
                  <textarea
                    rows="3"
                    value={bankForm.instructions}
                    onChange={(e) => setBankForm({ ...bankForm, instructions: e.target.value })}
                    disabled={!isSuperAdmin}
                    placeholder="e.g. Please use your Order # or Invoice # as the transfer payment narration."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs font-semibold text-slate-700 focus:bg-white focus:ring-2 focus:ring-brand-green-500 outline-none disabled:opacity-60 disabled:cursor-not-allowed resize-none"
                  />
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="bg-brand-green-50/80 border border-brand-green-200 rounded-2xl p-4 text-xs space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-green-800 block">
                  Live Preview (As rendered on Checkout & Invoices)
                </span>
                <div className="bg-white rounded-xl p-3 border border-brand-green-100 space-y-1">
                  <p className="font-extrabold text-brand-green-950 text-sm">{bankForm.bankName || "Bank Name"}</p>
                  <div className="flex justify-between text-brand-green-900 text-xs">
                    <span>Account Name:</span>
                    <strong className="font-semibold">{bankForm.accountName || "Account Name"}</strong>
                  </div>
                  <div className="flex justify-between text-brand-green-900 text-xs">
                    <span>Account Number:</span>
                    <strong className="font-mono font-black text-brand-green-700">{bankForm.accountNumber || "0000000000"}</strong>
                  </div>
                  {bankForm.instructions && (
                    <p className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-100 mt-1">
                      Narration: {bankForm.instructions}
                    </p>
                  )}
                </div>
              </div>

              {/* Submit Button for Super Admin */}
              {isSuperAdmin ? (
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={savingBank}
                    className="bg-brand-green-600 hover:bg-brand-green-700 text-white font-bold text-xs py-2.5 px-6 rounded-xl transition flex items-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {savingBank ? "Saving Bank Details..." : "Save Bank Account Details"}
                  </button>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center text-xs text-slate-500 font-medium italic">
                  Normal admins can view bank details, but only Super Admins can save changes.
                </div>
              )}
            </form>
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

