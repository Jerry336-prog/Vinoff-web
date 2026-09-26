import React, { useState, useEffect } from "react";
import api from "../../services/api";
import Button from "../../components/ui/Button";
import { useToast } from "../../context/ToastContext";
import { unwrapApiList } from "../../utils/apiResponse";
import {
  Megaphone,
  Plus,
  Trash2,
  Users,
  User,
  Wrench,
  PackagePlus,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  Search,
  ExternalLink,
} from "lucide-react";

export const AdminAnnouncements = () => {
  const { toast, showModal } = useToast();

  const [announcements, setAnnouncements] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("general");
  const [target, setTarget] = useState("all");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [actionUrl, setActionUrl] = useState("");
  const [actionText, setActionText] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [annRes, custRes] = await Promise.all([
        api.get("/api/admin/announcements"),
        api.get("/api/admin/users?limit=100").catch(() => ({ data: [] })),
      ]);
      setAnnouncements(unwrapApiList(annRes));
      setCustomers(unwrapApiList(custRes));
    } catch (err) {
      console.error("Failed to load announcements:", err);
      toast.error("Could not fetch announcements list", "Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error("Please enter both a title and message body", "Validation Error");
      return;
    }

    if (target === "specific_customer" && !selectedCustomerId) {
      toast.error("Please select a specific customer for this announcement", "Validation Error");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post("/api/admin/announcements", {
        title: title.trim(),
        message: message.trim(),
        type,
        target,
        targetUser: target === "specific_customer" ? selectedCustomerId : null,
        actionUrl: actionUrl.trim(),
        actionText: actionText.trim(),
        expiresAt: expiresAt || null,
      });

      toast.success("Announcement published successfully!", "Broadcast Sent");
      // Reset form
      setTitle("");
      setMessage("");
      setType("general");
      setTarget("all");
      setSelectedCustomerId("");
      setActionUrl("");
      setActionText("");
      setExpiresAt("");

      fetchData();
    } catch (err) {
      toast.error(err.message || "Failed to publish announcement", "Error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusToggle = (id, currentStatus) => {
    const newStatus = currentStatus === "active" ? "dismissed" : "active";
    const actionText = newStatus === "dismissed" ? "Deactivate / Dismiss" : "Activate";

    showModal({
      title: `${actionText} Announcement`,
      message: `Are you sure you want to ${actionText.toLowerCase()} this announcement? ${
        newStatus === "dismissed"
          ? "Deactivating will immediately remove it from all customer popups."
          : "Activating will make it popup on customer screens."
      }`,
      confirmText: `Yes, ${actionText}`,
      cancelText: "Cancel",
      type: newStatus === "dismissed" ? "warning" : "info",
      onConfirm: async () => {
        try {
          await api.patch(`/api/admin/announcements/${id}/status`, {
            status: newStatus,
          });
          toast.success(`Announcement status updated to '${newStatus}'`, "Status Changed");
          fetchData();
        } catch (err) {
          toast.error(err.message || "Failed to update status", "Error");
        }
      },
    });
  };

  const handleDelete = (id) => {
    showModal({
      title: "Delete Announcement",
      message: "Are you sure you want to permanently delete this announcement?",
      confirmText: "Yes, Delete",
      cancelText: "Cancel",
      type: "warning",
      onConfirm: async () => {
        try {
          await api.delete(`/api/admin/announcements/${id}`);
          toast.success("Announcement deleted", "Deleted");
          fetchData();
        } catch (err) {
          toast.error(err.message || "Failed to delete announcement", "Error");
        }
      },
    });
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.firstName?.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.lastName?.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.email?.toLowerCase().includes(customerSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-md">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-brand-green-600/30 border border-brand-green-500/40 text-brand-green-400 rounded-2xl flex items-center justify-center shrink-0">
            <Megaphone className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Announcements & Broadcast Management
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Publish store notices, downtime/maintenance alerts, or new product arrivals to all customers or target a specific account.
            </p>
          </div>
        </div>
      </div>

      {/* Creation Form */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
          <Plus className="w-4 h-4 text-brand-green-600" /> Post New Announcement
        </h2>

        <form onSubmit={handleCreateAnnouncement} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-8">
              <label className="font-bold text-slate-700 block mb-1">
                Announcement Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Scheduled Warehouse Maintenance / New Arrivals Batch Available"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:bg-white focus:border-brand-green-600 focus:outline-none"
                required
              />
            </div>

            <div className="sm:col-span-4">
              <label className="font-bold text-slate-700 block mb-1">Announcement Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:bg-white focus:border-brand-green-600 focus:outline-none"
              >
                <option value="general">General Update</option>
                <option value="new_product">New Product Arrival</option>
                <option value="maintenance">Maintenance & Downtime</option>
                <option value="alert">Urgent Store Notice</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Message Content <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write the complete announcement details here..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:border-brand-green-600 focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
            <div className="sm:col-span-4">
              <label className="font-bold text-slate-700 block mb-1">Target Audience</label>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setTarget("all")}
                  className={`flex-1 py-1.5 font-bold rounded-lg transition ${
                    target === "all" ? "bg-brand-green-600 text-white shadow-xs" : "text-slate-600"
                  }`}
                >
                  All Customers
                </button>
                <button
                  type="button"
                  onClick={() => setTarget("specific_customer")}
                  className={`flex-1 py-1.5 font-bold rounded-lg transition ${
                    target === "specific_customer"
                      ? "bg-brand-green-600 text-white shadow-xs"
                      : "text-slate-600"
                  }`}
                >
                  Specific Customer
                </button>
              </div>
            </div>

            {target === "specific_customer" && (
              <div className="sm:col-span-8 space-y-2">
                <label className="font-bold text-slate-700 block mb-1">Select Customer Account</label>
                <input
                  type="text"
                  placeholder="Search customer by name or email..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl mb-1"
                />
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none"
                  required={target === "specific_customer"}
                >
                  <option value="">-- Choose Customer --</option>
                  {filteredCustomers.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.firstName} {c.lastName} ({c.email})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-6">
              <label className="font-bold text-slate-700 block mb-1">Optional Action Link (URL)</label>
              <input
                type="text"
                value={actionUrl}
                onChange={(e) => setActionUrl(e.target.value)}
                placeholder="e.g., /shop or /product/123"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
              />
            </div>

            <div className="sm:col-span-6">
              <label className="font-bold text-slate-700 block mb-1">Action Button Text</label>
              <input
                type="text"
                value={actionText}
                onChange={(e) => setActionText(e.target.value)}
                placeholder="e.g., View Catalog / Check Product"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              type="submit"
              isLoading={isSubmitting}
              className="bg-brand-green-600 hover:bg-brand-green-700 text-white rounded-xl text-xs font-bold px-6 py-2.5 shadow-sm flex items-center gap-2"
            >
              <Megaphone className="w-4 h-4" /> Publish Announcement Now
            </Button>
          </div>
        </form>
      </div>

      {/* Announcements List */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">
            Published Announcements History ({announcements.length})
          </h2>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
            Loading announcements...
          </div>
        ) : announcements.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 italic">
            No announcements created yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {announcements.map((item) => {
              const isActive = item.status === "active";
              return (
                <div key={item._id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition">
                  <div className="space-y-1 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{item.title}</span>
                      <span
                        className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                          item.type === "maintenance"
                            ? "bg-amber-100 text-amber-800"
                            : item.type === "new_product"
                            ? "bg-emerald-100 text-emerald-800"
                            : item.type === "alert"
                            ? "bg-red-100 text-red-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {item.type}
                      </span>
                      <span
                        className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                          isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-600" : "bg-slate-400"}`} />
                        {isActive ? "Active Popup" : "Dismissed / Inactive"}
                      </span>
                    </div>

                    <p className="text-slate-600 leading-relaxed text-xs line-clamp-2">{item.message}</p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-1">
                      <span>
                        Target:{" "}
                        <strong className="text-slate-700">
                          {item.target === "all"
                            ? "All Customers"
                            : `Customer: ${item.targetUser?.firstName || ""} ${item.targetUser?.lastName || ""} (${item.targetUser?.email || ""})`}
                        </strong>
                      </span>
                      &bull;
                      <span>Posted {new Date(item.createdAt).toLocaleString()}</span>
                      &bull;
                      <span>{item.dismissedBy?.length || 0} user dismissal(s)</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant={isActive ? "outline" : "primary"}
                      onClick={() => handleStatusToggle(item._id, item.status)}
                      className="rounded-xl text-[11px] font-bold"
                    >
                      {isActive ? "Deactivate / Dismiss" : "Re-activate"}
                    </Button>
                    <button
                      onClick={() => handleDelete(item._id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                      title="Delete Announcement"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAnnouncements;
