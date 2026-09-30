import React, { useContext, useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { CartContext } from "../../context/CartContext";
import { AuthContext } from "../../context/AuthContext";
import api from "../../services/api";
import { createIdempotencyKey, withIdempotencyKey } from "../../services/idempotency";
import { formatCurrency } from "../../utils/formatCurrency";
import {
  FileText,
  Landmark,
  Upload,
  CheckCircle2,
  MessageSquare,
  Loader2,
  ArrowRight,
  ShieldAlert,
  AlertTriangle,
  MapPin,
  Clock,
  Package,
  MessageCircle,
} from "lucide-react";
import { playNotificationChime } from "../../utils/soundEffects";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";

export const Checkout = () => {
  const { cartItems, clearCart, subtotal } = useContext(CartContext);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [screenshotFile, setScreenshotFile] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [orderConfirmed, setOrderConfirmed] = useState(null);
  const [orderWhatsappUrl, setOrderWhatsappUrl] = useState(null);
  const orderSubmissionKeyRef = useRef(null);
  const paymentSubmissionKeyRef = useRef(null);

  const [bankDetails, setBankDetails] = useState({
    bankName: "Guaranty Trust Bank (GTB)",
    accountName: "Vinoff Wholesales Ltd",
    accountNumber: "0123456789",
    instructions: "",
  });

  useEffect(() => {
    if (user?.profile?.address) {
      const addr = [
        user.profile.address,
        user.profile.city,
        user.profile.state,
      ]
        .filter(Boolean)
        .join(", ");
      setDeliveryAddress(addr);
    }
  }, [user]);

  const [storeStatus, setStoreStatus] = useState({ isOpen: true, bannerMessage: "" });

  // Fetch bank details and store operational status from admin settings
  useEffect(() => {
    api.get("/api/settings/bank-details")
      .then((res) => {
        const data = res.data?.data || res.data || res;
        if (data?.bankName) setBankDetails(data);
      })
      .catch(() => {});

    api.get("/api/settings/store-status")
      .then((res) => {
        const data = res.data?.data || res.data || res;
        if (data && typeof data.isOpen === "boolean") {
          setStoreStatus(data);
        }
      })
      .catch(() => {});
  }, []);

  // If cart is empty and order is not confirmed, redirect
  useEffect(() => {
    if (cartItems.length === 0 && !orderConfirmed) {
      navigate("/cart");
    }
  }, [cartItems.length, navigate, orderConfirmed]);

  const estimatedTotal = subtotal;

  const handleScreenshotSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScreenshotFile(file);
    setScreenshotPreview(URL.createObjectURL(file));
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    if (cartItems.length === 0) return;

    if (storeStatus?.isOpen === false) {
      setErrorMsg(
        storeStatus.bannerMessage ||
          "The store is temporarily closed for orders and warehouse stock-taking. Please check back soon."
      );
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      // Keep the key when the browser/client retries this checkout request.
      const orderKey = orderSubmissionKeyRef.current || createIdempotencyKey("order");
      orderSubmissionKeyRef.current = orderKey;
      // 1. Prepare items payload for Express API with explicit Carton vs Pieces mode
      const items = cartItems.map((item) => ({
        product: item.id || item._id,
        quantity: Number(item.quantity) || 1,
        isCarton: item.isCarton !== false,
        unitType: item.isCarton !== false ? "cartons" : "pieces",
        price: item.isCarton !== false ? (item.cartonPrice || item.price) : (item.unitPrice || item.price),
        name: item.name,
      }));

      const payload = {
        items,
        deliveryAddress: deliveryAddress || user?.profile?.address || "Warehouse Pickup",
        notes: notes.trim(),
      };

      // 2. Post order
      const res = await api.post("/api/orders", payload, withIdempotencyKey(orderKey));
      const responseData = res.data?.data || res.data;
      const createdOrder = responseData?.order || responseData;
      const waUrl = responseData?.whatsappUrl || res.data?.whatsappUrl || null;

      // Play audio notification chime
      try {
        playNotificationChime();
      } catch (_) {}

      // Automatically dispatch WhatsApp notification to store owner if enabled
      if (waUrl) {
        setOrderWhatsappUrl(waUrl);
        try {
          window.open(waUrl, "_blank");
        } catch (_) {}
      }

      // 3. If customer attached a payment screenshot, upload it now
      if (screenshotFile && createdOrder?._id) {
        try {
          const formData = new FormData();
          formData.append("screenshot", screenshotFile);
          const paymentKey = paymentSubmissionKeyRef.current || createIdempotencyKey("payment-proof");
          paymentSubmissionKeyRef.current = paymentKey;
          const paymentRes = await api.post(
            `/api/orders/${createdOrder._id}/payment`,
            formData,
            withIdempotencyKey(paymentKey),
          );
          setOrderConfirmed(paymentRes.data?.order || paymentRes.data || createdOrder);
        } catch (payErr) {
          console.warn("Screenshot upload error:", payErr);
          setOrderConfirmed(createdOrder);
        }
      } else {
        setOrderConfirmed(createdOrder);
      }

      clearCart();
    } catch (err) {
      console.error("Order submission failed:", err);
      setErrorMsg(err.message || "Failed to place order. Please verify quantities and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (orderConfirmed) {
    const isAwaitingConfirmation =
      orderConfirmed.status === "Awaiting Confirmation" ||
      orderConfirmed.paymentStatus === "Submitted";

    return (
      <div className="max-w-xl mx-auto py-12 px-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-sm space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-brand-green-100 text-brand-green-700 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <h2 className="font-extrabold text-slate-900 text-2xl tracking-tight">
              Order Placed Successfully!
            </h2>
            <p className="text-xs font-mono font-bold text-brand-green-800 bg-brand-green-50 px-3.5 py-1.5 rounded-full inline-block">
              Order #{orderConfirmed.orderNumber || orderConfirmed._id}
            </p>
            <div className="pt-2">
              <span className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full ${
                isAwaitingConfirmation
                  ? "bg-amber-100 text-amber-800"
                  : "bg-blue-100 text-blue-800"
              }`}>
                ● Status: {orderConfirmed.status || "Pending Payment"}
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto pt-2">
              {isAwaitingConfirmation
                ? "Your payment screenshot has been uploaded. Our accounting admin will confirm the transaction shortly."
                : "Your order is currently in 'Pending Payment' status. Please upload your transfer screenshot to initiate packaging."}
            </p>
          </div>

          {orderWhatsappUrl && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
              <span className="text-xs font-black text-emerald-900 block flex items-center justify-center gap-1.5">
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                WhatsApp Order Dispatch Alert
              </span>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                Send real-time order details and proof directly to the warehouse dispatch WhatsApp line:
              </p>
              <a
                href={orderWhatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Notify Store Owner on WhatsApp</span>
              </a>
            </div>
          )}

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              variant="primary"
              className="w-full sm:w-auto px-6 py-3.5 text-sm font-bold rounded-2xl shadow-sm"
              onClick={() => navigate(`/orders/${orderConfirmed._id || orderConfirmed.id}`)}
              icon={Package}
            >
              View Order Details
            </Button>
            <Button
              variant="outline"
              className="w-full sm:w-auto px-6 py-3.5 text-sm font-bold rounded-2xl text-slate-700 border-slate-200"
              onClick={() => navigate("/chat")}
              icon={MessageSquare}
            >
              Support Chat
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">
          Checkout & Order Confirmation
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Review your wholesale carton selection, specify logistics instructions, and confirm your order.
        </p>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold p-4 rounded-2xl flex items-center gap-2.5">
          <ShieldAlert className="w-5 h-5 shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Items & Logistics */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items Summary Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-3 flex items-center justify-between">
              <span>Order Items ({cartItems.length})</span>
              <Link to="/cart" className="text-brand-green-700 font-bold hover:underline normal-case">
                Edit Cart
              </Link>
            </h3>

            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1">
              {cartItems.map((item, idx) => {
                const itemPrice = item.isCarton ? (item.cartonPrice || item.price) : (item.unitPrice || item.price);
                const lineTotal = itemPrice * item.quantity;
                return (
                  <div key={idx} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-800">{item.name}</h4>
                      <p className="text-[11px] text-slate-400">
                        {item.quantity} &times; {formatCurrency(itemPrice)}{" "}
                        {item.isCarton ? `(Carton of ${item.unitsPerCarton || 1})` : "(Individual Unit)"}
                      </p>
                    </div>
                    <p className="text-xs sm:text-sm font-black text-slate-900 shrink-0">
                      {formatCurrency(lineTotal)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Delivery & Logistics Details */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-brand-green-600" />
              Delivery & Destination Details
            </h3>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                  Destination Address *
                </label>
                <input
                  type="text"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Street Address, City, State"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-brand-green-500 outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                  Order Delivery Notes / Truck Offloading Instructions
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Offload at main warehouse bay 2 between 9am and 3pm"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-brand-green-500 outline-none resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Bank Info & Payment Proof */}
        <div className="space-y-6">
          {/* Payment & Wire Details */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Landmark className="w-4 h-4 text-brand-yellow-600" />
              Bank Transfer Information
            </h3>

            <div className="bg-brand-green-50/70 border border-brand-green-100 rounded-2xl p-4 text-xs space-y-1.5">
              <p className="font-extrabold text-brand-green-950">{bankDetails.bankName}</p>
              <div className="flex justify-between text-brand-green-900">
                <span>Account Name:</span>
                <strong className="font-mono">{bankDetails.accountName}</strong>
              </div>
              <div className="flex justify-between text-brand-green-900">
                <span>Account Number:</span>
                <strong className="font-mono text-sm font-black">{bankDetails.accountNumber}</strong>
              </div>
              {bankDetails.instructions && (
                <p className="text-brand-green-700 pt-1 italic text-[11px]">{bankDetails.instructions}</p>
              )}
            </div>

            {/* Optional screenshot upload during checkout */}
            <div className="space-y-2 pt-1">
              <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider block">
                Attach Payment Screenshot (Optional now, or upload later)
              </label>
              <div className="border-2 border-dashed border-slate-200 hover:border-brand-green-500 rounded-2xl p-3 text-center transition bg-slate-50">
                <input
                  type="file"
                  id="checkout-screenshot"
                  accept="image/*"
                  onChange={handleScreenshotSelect}
                  className="hidden"
                />
                <label htmlFor="checkout-screenshot" className="cursor-pointer block text-center">
                  <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                  <span className="text-xs font-bold text-slate-700 block truncate">
                    {screenshotFile ? screenshotFile.name : "Select Screenshot"}
                  </span>
                </label>
              </div>

              {screenshotPreview && (
                <div className="rounded-xl overflow-hidden border border-slate-200 max-h-24">
                  <img src={screenshotPreview} alt="Screenshot preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            {/* Order Price Summary */}
            <div className="border-t border-slate-100 pt-4 space-y-2 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Cart Subtotal</span>
                <span className="font-bold text-slate-800">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-100">
                <span>Grand Total</span>
                <span className="text-brand-green-950">{formatCurrency(estimatedTotal)}</span>
              </div>
            </div>

            {/* Vacation Mode / Store Closed Warning */}
            {storeStatus?.isOpen === false && (
              <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-900 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <div className="space-y-0.5">
                  <strong className="block font-black uppercase tracking-wider text-[10px]">
                    Orders Temporarily Paused
                  </strong>
                  <p className="leading-relaxed">
                    {storeStatus.bannerMessage ||
                      "Our warehouse is currently restocking. Online checkout is paused temporarily."}
                  </p>
                </div>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={storeStatus?.isOpen === false || submitting}
              isLoading={submitting}
              className="w-full rounded-2xl mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
              icon={ArrowRight}
            >
              {storeStatus?.isOpen === false
                ? "Checkout Paused (Store in Vacation Mode)"
                : "Confirm Wholesale Order"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Checkout;
