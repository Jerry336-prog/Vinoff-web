import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../../services/api";
import { formatCurrency } from "../../utils/formatCurrency";
import Badge from "../../components/ui/Badge";
import {
  ArrowLeft,
  Users,
  Building,
  Mail,
  Phone,
  MapPin,
  Clock,
  Package,
  FileText,
  MessageSquare,
  Activity,
  CheckCircle2,
  ShieldAlert,
  UserCheck,
  UserX,
  ExternalLink,
  Download,
  Shield,
  Sparkles,
} from "lucide-react";
import Button from "../../components/ui/Button";
import Avatar from "../../components/ui/Avatar";
import { useToast } from "../../context/ToastContext";
import { downloadInvoicePDF } from "../../utils/generatePDF";
import { unwrapApiList, unwrapApiRecord } from "../../utils/apiResponse";
import { getAvatarUrl, getInitials } from "../../utils/avatar";

export const CustomerDetail = () => {
  const { toast, showModal } = useToast();
  const { id } = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [activities, setActivities] = useState([]);
  const [adminActivities, setAdminActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [statusUpdating, setStatusUpdating] = useState(false);

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        const [custRes, ordRes, invRes, actRes, adminActRes] = await Promise.all([
          api.get(`/api/admin/customers/${id}`),
          api.get(`/api/orders?customer=${id}`).catch(() => ({ data: [] })),
          api.get(`/api/invoices?customer=${id}`).catch(() => ({ data: [] })),
          api.get(`/api/admin/activity?targetType=User`).catch(() => ({ data: [] })),
          api.get(`/api/admin/activity?actor=${id}`).catch(() => ({ data: [] })),
        ]);

        const customerPayload = unwrapApiRecord(custRes);
        const customerData = customerPayload?.customer || customerPayload;
        setCustomer(customerData);
        setOrders(unwrapApiList(ordRes));
        setInvoices(unwrapApiList(invRes));
        setAdminActivities(unwrapApiList(adminActRes));

        const allActs = unwrapApiList(actRes);
        const customerActs = Array.isArray(allActs)
          ? allActs.filter(
              (a) =>
                a.targetId === id ||
                a.actor?._id === id ||
                a.actor === id ||
                a.description?.toLowerCase().includes(customerData?.email?.toLowerCase())
            )
          : [];
        setActivities(customerActs);
      } catch (err) {
        console.error("Failed to load customer details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [id]);

  const handleStatusToggle = () => {
    if (!customer) return;
    const newStatus = customer.accountStatus === "suspended" ? "active" : "suspended";
    const isSuspending = newStatus === "suspended";

    showModal({
      title: isSuspending ? "Suspend Customer Account" : "Activate Customer Account",
      message: `Are you sure you want to change ${customer.firstName} ${customer.lastName}'s account status to '${newStatus}'?`,
      confirmText: isSuspending ? "Yes, Suspend" : "Yes, Activate",
      cancelText: "Cancel",
      type: isSuspending ? "warning" : "info",
      onConfirm: async () => {
        setStatusUpdating(true);
        try {
          await api.patch(`/api/admin/customers/${customer._id}/status`, {
            status: newStatus,
          });
          setCustomer((prev) => ({ ...prev, accountStatus: newStatus }));
          toast.success(`Customer status changed to ${newStatus}`, "Status Updated");
        } catch (err) {
          toast.error(err.message || "Failed to update customer status", "Update Failed");
        } finally {
          setStatusUpdating(false);
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="p-12 text-center bg-white border border-slate-200 rounded-3xl animate-pulse text-xs text-slate-400">
        Loading customer profile...
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm max-w-md mx-auto my-12">
        <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">Customer Not Found</h3>
        <Button className="mt-4 rounded-xl" onClick={() => navigate("/admin/customers")}>
          Return to Customers
        </Button>
      </div>
    );
  }

  const hasProfileUpdate = Boolean(customer.profileUpdatedAt);
  const isSuspended = customer.accountStatus === "suspended";

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back Button */}
      <div className="flex items-center justify-between">
        <Link
          to="/admin/customers"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-brand-green-700 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Customer Registry
        </Link>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={isSuspended ? "primary" : "outline"}
            onClick={handleStatusToggle}
            isLoading={statusUpdating}
            className={`rounded-xl text-xs ${
              isSuspended ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "text-red-600 hover:bg-red-50 border-red-200"
            }`}
          >
            {isSuspended ? (
              <span className="flex items-center gap-1">
                <UserCheck className="w-4 h-4" /> Reactivate Account
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <UserX className="w-4 h-4" /> Suspend Customer
              </span>
            )}
          </Button>

          <Link
            to={`/admin/chats?customer=${customer._id}`}
            className="px-3 py-1.5 bg-brand-green-600 hover:bg-brand-green-700 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center gap-1.5"
          >
            <MessageSquare className="w-4 h-4" /> Open Chat
          </Link>
        </div>
      </div>

      {/* Customer Header Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <Avatar
              src={getAvatarUrl(customer)}
              alt={`${customer.firstName || "Customer"} ${customer.lastName || ""}`.trim()}
              size={64}
              fallback={getInitials(customer, "C")}
              className="rounded-2xl bg-brand-green-100 text-brand-green-900 border-2 border-brand-green-200 shadow-sm text-lg"
            />

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {customer.firstName} {customer.lastName}
                </h1>
                {hasProfileUpdate && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded-full shadow-xs">
                    <Sparkles className="w-3 h-3 text-emerald-600" /> Profile Updated
                  </span>
                )}
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    isSuspended
                      ? "bg-red-100 text-red-800 border border-red-200"
                      : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isSuspended ? "bg-red-600" : "bg-emerald-600"}`} />
                  {isSuspended ? "Suspended" : "Active"}
                </span>
              </div>

              <p className="text-xs font-bold text-brand-green-700">
                {customer.profile?.companyName || "Commercial Wholesale Account"}
              </p>
              <p className="text-[11px] text-slate-400">
                Customer ID: <span className="font-mono">{customer._id}</span> &bull; Member since {new Date(customer.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {hasProfileUpdate && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-xs text-emerald-900 space-y-1">
              <p className="font-extrabold flex items-center gap-1 text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Recent Profile Update
              </p>
              <p className="text-[11px] text-emerald-700">
                Modified on {new Date(customer.profileUpdatedAt).toLocaleString()}
              </p>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 border-t border-slate-100 pt-5 mt-6 overflow-x-auto">
          {[
            { id: "overview", label: "Overview", icon: Users },
            { id: "orders", label: `Orders (${orders.length})`, icon: Package },
            { id: "invoices", label: `Invoices (${invoices.length})`, icon: FileText },
            { id: "activity", label: `Audit Trail (${activities.length})`, icon: Activity },
            ...(["admin", "subAdmin", "superadmin", "super_admin"].includes(customer?.role)
              ? [{ id: "admin-activity", label: `Admin Action Log (${adminActivities.length})`, icon: Shield }]
              : []),
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 outline-none ${
                  active
                    ? "bg-brand-green-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Contents */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2.5">
              Contact & Authentication Details
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Email Address</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> {customer.email}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Telephone</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" /> {customer.phone || "Not specified"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Account Role</span>
                <span className="font-semibold text-slate-800 uppercase">{customer.role}</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2.5">
              Business & Logistics Destination
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Company / Store Name</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  {customer.profile?.companyName || "N/A"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Business Sector</span>
                <span className="font-semibold text-slate-800">{customer.profile?.businessType || "Wholesale Buyer"}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Delivery Address</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {customer.profile?.address || "Warehouse pickup"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Location</span>
                <span className="font-semibold text-slate-800">
                  {customer.profile?.city || ""}, {customer.profile?.state || ""} &bull; {customer.profile?.country || "Nigeria"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "orders" && (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          {orders.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No orders placed by this customer yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {orders.map((ord) => (
                <div key={ord._id} className="p-4 flex items-center justify-between text-xs hover:bg-slate-50 transition">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900">{ord.orderNumber}</span>
                      <Badge status={ord.status} className="text-[9px]" />
                    </div>
                    <p className="text-slate-500 text-[11px]">
                      {new Date(ord.createdAt).toLocaleDateString()} &bull; {ord.items?.length || 0} item(s)
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-slate-900">{formatCurrency(ord.totalAmount)}</p>
                    <p className="text-[10px] text-slate-400">{ord.paymentStatus}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "invoices" && (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          {invoices.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No invoices issued for this customer yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {invoices.map((inv) => (
                <div key={inv._id} className="p-4 flex items-center justify-between text-xs hover:bg-slate-50 transition">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900">{inv.invoiceNumber}</span>
                      <Badge status={inv.status} className="text-[9px]" />
                    </div>
                    <p className="text-slate-500 text-[11px]">
                      Issued {new Date(inv.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <p className="font-black text-brand-green-800">{formatCurrency(inv.total || inv.totalAmount)}</p>
                      <p className="text-[10px] text-slate-400">{inv.status}</p>
                    </div>
                    <button
                      onClick={() => downloadInvoicePDF(inv._id)}
                      className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-brand-green-700 rounded-lg transition"
                      title="Download Invoice PDF"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "activity" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">
            Customer Audit Trail
          </h3>
          {activities.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-4">No audit logs recorded for this customer.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {activities.map((act) => (
                <div key={act._id} className="py-3 flex items-start justify-between gap-4 text-xs">
                  <div>
                    <p className="font-bold text-slate-800">{act.description}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Action: <strong className="text-brand-green-700">{act.action}</strong>
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                    {new Date(act.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "admin-activity" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Shield className="w-4 h-4 text-brand-green-600" /> Admin Action & Update Log
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Every action, modification, stamp, and system update recorded by {customer.firstName} {customer.lastName}.
              </p>
            </div>
            <span className="text-xs font-bold bg-brand-green-100 text-brand-green-800 px-3 py-1 rounded-full">
              {adminActivities.length} Actions Recorded
            </span>
          </div>

          {adminActivities.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 font-medium">
              No activity logs recorded by this admin user yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {adminActivities.map((act) => (
                <div key={act._id} className="py-3.5 flex items-start justify-between gap-4 text-xs hover:bg-slate-50/60 p-2 rounded-xl transition">
                  <div className="space-y-1">
                    <p className="font-bold text-slate-900">{act.description}</p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span className="px-2 py-0.5 bg-slate-100 font-mono text-[10px] font-bold text-slate-700 rounded-md">
                        {act.action}
                      </span>
                      {act.targetType && (
                        <span>Target: <strong>{act.targetType}</strong></span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0 font-medium whitespace-nowrap">
                    {new Date(act.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerDetail;
