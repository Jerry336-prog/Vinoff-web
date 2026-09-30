import React, { useState, useEffect, useRef, useContext } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import api from "../../services/api";
import { createIdempotencyKey, withIdempotencyKey } from "../../services/idempotency";
import { formatCurrency } from "../../utils/formatCurrency";
import Badge from "../../components/ui/Badge";
import {
  ArrowLeft,
  Package,
  Calendar,
  CreditCard,
  FileText,
  Upload,
  MessageSquare,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Download,
  Building,
  Truck,
  Image as ImageIcon,
  ExternalLink,
} from "lucide-react";
import Button from "../../components/ui/Button";

const STATUS_STEPS = [
  "Pending Payment",
  "Awaiting Confirmation",
  "Payment Confirmed",
  "Processing",
  "Ready for Delivery",
  "Shipped",
  "Completed",
];

export const OrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const isAdmin =
    user?.role === "admin" ||
    user?.role === "subAdmin" ||
    user?.role === "superadmin" ||
    user?.role === "super_admin";

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Payment upload state
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [uploadError, setUploadError] = useState("");
  const paymentUploadKeyRef = useRef(null);

  const fetchOrder = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/orders/${id}`);
      setOrder(res.data);
    } catch (err) {
      setError(err.message || "Failed to load order details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScreenshotFile(file);
    paymentUploadKeyRef.current = createIdempotencyKey("payment-proof");
    setPreviewUrl(URL.createObjectURL(file));
    setUploadError("");
  };

  const handleUploadPayment = async () => {
    if (!screenshotFile) {
      setUploadError("Please select a payment screenshot image first.");
      return;
    }

    setUploading(true);
    setUploadError("");
    setUploadSuccess("");

    try {
      const formData = new FormData();
      formData.append("screenshot", screenshotFile);

      const uploadKey = paymentUploadKeyRef.current || createIdempotencyKey("payment-proof");
      paymentUploadKeyRef.current = uploadKey;
      const res = await api.post(`/api/orders/${id}/payment`, formData, withIdempotencyKey(uploadKey));
      setOrder(res.data);
      setUploadSuccess("Payment screenshot successfully submitted! Awaiting admin verification.");
      setScreenshotFile(null);
    } catch (err) {
      setUploadError(err.message || "Failed to upload payment screenshot.");
    } finally {
      setUploading(false);
    }
  };

  const currentStepIndex = order
    ? STATUS_STEPS.indexOf(order.status)
    : -1;

  if (loading) {
    return (
      <div className="p-12 text-center bg-white border border-slate-200 rounded-3xl animate-pulse text-xs text-slate-400">
        Loading order details...
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm max-w-md mx-auto my-12">
        <ShieldAlert className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">Order Not Found</h3>
        <p className="text-xs text-slate-500 mt-1">{error || "Could not locate order."}</p>
        <Button
          className="mt-4 rounded-xl"
          onClick={() => navigate("/orders")}
        >
          Back to Orders
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5 sm:space-y-6 px-1 sm:px-0">
      {/* Top Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <Link
          to={isAdmin ? "/admin/orders" : "/orders"}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-brand-green-700 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          {isAdmin ? "Back to Admin Orders Desk" : "Back to All Orders"}
        </Link>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link
              to={`/admin/orders?order=${order.orderNumber}`}
              className="inline-flex items-center justify-center gap-1.5 text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 px-3.5 py-2 rounded-xl shadow-xs transition"
            >
              <ExternalLink className="w-4 h-4 text-amber-700" />
              Open in Admin Order Desk
            </Link>
          )}

          <Link
            to={`/chat?orderId=${order._id}`}
            className="inline-flex items-center justify-center gap-1.5 text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-xl shadow-xs transition"
          >
            <MessageSquare className="w-4 h-4 text-brand-green-600" />
            {isAdmin ? "Chat with Customer" : "Message Admin about Order"}
          </Link>
        </div>
      </div>

      {/* Header Banner */}
      <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Wholesale Order Details
            </span>
            <div className="flex flex-wrap items-center gap-2.5 mt-1">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono">
                {order.orderNumber}
              </h1>
              <Badge status={order.status} className="text-xs" />
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              Placed on {new Date(order.createdAt).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          </div>

          <div className="text-left sm:text-right border-t sm:border-t-0 border-slate-100/60 pt-3 sm:pt-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Total Payable
            </span>
            <p className="text-2xl sm:text-3xl font-black text-brand-green-950">
              {formatCurrency(order.totalAmount)}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Payment Status:{" "}
              <strong className="text-slate-800 uppercase">{order.paymentStatus}</strong>
            </p>
          </div>
        </div>

        {/* Order Lifecycle Stepper */}
        {order.status !== "Cancelled" && (
          <div className="pt-5">
            <div className="overflow-x-auto pb-2 scrollbar-none">
              <div className="flex items-center min-w-[620px] justify-between relative">
                <div className="absolute left-0 top-3.5 h-0.5 w-full bg-slate-100 -z-0" />
                {STATUS_STEPS.map((step, idx) => {
                  const isCompleted = currentStepIndex >= idx;
                  const isCurrent = currentStepIndex === idx;

                  return (
                    <div
                      key={step}
                      className="flex flex-col items-center text-center relative z-10 px-2"
                    >
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          isCompleted
                            ? "bg-brand-green-600 text-white shadow"
                            : "bg-slate-200 text-slate-500"
                        } ${isCurrent ? "ring-4 ring-brand-green-100" : ""}`}
                      >
                        {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                      </div>
                      <span
                        className={`text-[10px] mt-1.5 font-bold max-w-[85px] leading-tight ${
                          isCurrent
                            ? "text-brand-green-800 font-extrabold"
                            : isCompleted
                            ? "text-slate-700"
                            : "text-slate-400"
                        }`}
                      >
                        {step}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Products + Payment Proof Box */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Products List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Package className="w-4 h-4 text-brand-green-600" />
              Order Items ({order.items?.length || 0})
            </h3>

            <div className="divide-y divide-slate-100">
              {order.items?.map((item, index) => (
                <div key={index} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center text-slate-400 font-bold text-xs">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        item.name?.charAt(0) || "P"
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-800">{item.name}</h4>
                      <p className="text-[11px] text-slate-400">
                        {item.quantity} {item.unit || "carton(s)"} &times; {formatCurrency(item.wholesalePrice || item.price)}
                      </p>
                    </div>
                  </div>

                  <p className="text-sm font-black text-slate-900 shrink-0">
                    {formatCurrency(item.subtotal || (item.quantity * (item.wholesalePrice || item.price)))}
                  </p>
                </div>
              ))}
            </div>

            {/* Financial Totals */}
            <div className="border-t border-slate-100 pt-4 space-y-2 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-700">{formatCurrency(order.subtotal)}</span>
              </div>
              {Number(order.deliveryFee) > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>Delivery & Logistics Fee</span>
                  <span className="font-semibold text-slate-700">{formatCurrency(order.deliveryFee)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-100">
                <span>Total Amount</span>
                <span className="text-brand-green-950">{formatCurrency(order.totalAmount)}</span>
              </div>
            </div>

            {order.notes && (
              <div className="bg-slate-50 rounded-2xl p-3.5 text-xs text-slate-600">
                <strong className="block text-[10px] uppercase text-slate-400 font-bold mb-1">
                  Order Delivery Notes
                </strong>
                {order.notes}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Payment Proof & Actions */}
        <div className="space-y-6">
          {/* Payment Proof Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-brand-yellow-600" />
              Payment Verification
            </h3>

            {uploadSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{uploadSuccess}</span>
              </div>
            )}

            {uploadError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-red-600" />
                <span>{uploadError}</span>
              </div>
            )}

            {order.paymentScreenshot?.url ? (
              <div className="space-y-3">
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 group">
                  <img
                    src={order.paymentScreenshot.url}
                    alt="Payment Screenshot"
                    className="w-full h-44 object-cover"
                  />
                  <a
                    href={order.paymentScreenshot.url}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5"
                  >
                    <ExternalLink className="w-4 h-4" /> View Full Image
                  </a>
                </div>

                <div className="bg-slate-50 rounded-2xl p-3 text-xs space-y-1">
                  <p className="font-bold text-slate-700 flex items-center gap-1.5">
                    {order.paymentStatus === "Confirmed" ? (
                      <span className="text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Payment Confirmed
                      </span>
                    ) : (
                      <span className="text-amber-700 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-600" /> Awaiting Payment Confirmation
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Uploaded: {new Date(order.paymentScreenshot.uploadedAt || order.updatedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  Please transfer <strong className="text-slate-900">{formatCurrency(order.totalAmount)}</strong> to the Vinoff commercial bank account, then upload your transaction screenshot below.
                </p>

                <div className="border-2 border-dashed border-slate-200 hover:border-brand-green-500 rounded-2xl p-4 text-center transition bg-slate-50">
                  <input
                    type="file"
                    id="screenshot-upload"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <label
                    htmlFor="screenshot-upload"
                    className="cursor-pointer block space-y-1.5"
                  >
                    <Upload className="w-6 h-6 text-brand-green-600 mx-auto" />
                    <span className="text-xs font-bold text-slate-700 block">
                      {screenshotFile ? screenshotFile.name : "Select Transfer Slip / Screenshot"}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Supports JPG, PNG, WEBP (Max 5MB)
                    </span>
                  </label>
                </div>

                {previewUrl && (
                  <div className="rounded-xl overflow-hidden border border-slate-200 max-h-36">
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}

                <Button
                  onClick={handleUploadPayment}
                  isLoading={uploading}
                  disabled={!screenshotFile}
                  className="w-full rounded-xl"
                  size="sm"
                  icon={Upload}
                >
                  Upload Payment Screenshot
                </Button>
              </div>
            )}
          </div>

          {/* Invoice Card */}
          {order.invoice && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                Linked Invoice
              </h3>
              <div className="flex items-center justify-between text-xs">
                <div>
                  <p className="font-mono font-bold text-slate-900">
                    {order.invoice.invoiceNumber || "INV-AVAILABLE"}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Status: <strong className="text-slate-700">{order.invoice.status || "Pending"}</strong>
                  </p>
                </div>
                <Link
                  to={`/invoices/${order.invoice._id || order.invoice.id || order.invoice}`}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition"
                >
                  View Invoice
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
