import React, { useContext, useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { CartContext } from "../../context/CartContext";
import { AuthContext } from "../../context/AuthContext";
import { useBusiness } from "../../context/BusinessContext";
import api from "../../services/api";
import { payInPopup } from "../../services/paystack";
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
} from "lucide-react";
import { playNotificationChime } from "../../utils/soundEffects";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";

export const Checkout = () => {
  const { cartItems, clearCart, subtotal } = useContext(CartContext);
  const { user, refreshUser } = useContext(AuthContext);
  const { businessInfo, bankDetails: contextBankDetails } = useBusiness();
  const navigate = useNavigate();

  const [paymentMethod, setPaymentMethod] = useState(
    user?.isVipCreditPartner ? "credit" : "paystack"
  );
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [orderConfirmed, setOrderConfirmed] = useState(null);
  const orderSubmissionKeyRef = useRef(null);
  const pendingOrderRef = useRef(null);
  const submittingRef = useRef(false);
  const paymentSubmissionKeyRef = useRef(null);

  // Ensure latest VIP Credit Partner status is loaded when entering Checkout
  useEffect(() => {
    refreshUser?.().then((freshUser) => {
      if (freshUser?.isVipCreditPartner) {
        setPaymentMethod("credit");
      }
    });
  }, [refreshUser]);

  useEffect(() => {
    if (user?.isVipCreditPartner) {
      setPaymentMethod((prev) => (prev === "paystack" ? "credit" : prev));
    }
  }, [user?.isVipCreditPartner]);

  const [bankDetails, setBankDetails] = useState({
    bankName: contextBankDetails?.bankName || "Guaranty Trust Bank (GTB)",
    accountName: contextBankDetails?.accountName || "Vinoff Wholesales Ltd",
    accountNumber: contextBankDetails?.accountNumber || "0123456789",
    instructions: contextBankDetails?.instructions || "",
  });

  useEffect(() => {
    if (contextBankDetails?.bankName) {
      setBankDetails(contextBankDetails);
    }
  }, [contextBankDetails]);

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

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    if (cartItems.length === 0 || submittingRef.current) return;

    if (storeStatus?.isOpen === false) {
      setErrorMsg(
        storeStatus.bannerMessage ||
          "The store is temporarily closed for orders and warehouse stock-taking. Please check back soon."
      );
      return;
    }

    submittingRef.current = true;
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

      const isCreditOrder = Boolean(user?.isVipCreditPartner && paymentMethod === "credit");

      const payload = {
        items,
        deliveryAddress: deliveryAddress || user?.profile?.address || "Warehouse Pickup",
        notes: notes.trim(),
        isCreditOrder,
        paymentMethod: isCreditOrder ? "credit" : "paystack",
      };

      // 2. Post order
      if (!pendingOrderRef.current) {
        const res = await api.post("/api/orders", payload, withIdempotencyKey(orderKey));
        const responseData = res.data?.data || res.data;
        pendingOrderRef.current = responseData?.order || responseData;
      }
      const createdOrder = pendingOrderRef.current;
      if (Boolean(createdOrder.isCreditOrder) !== isCreditOrder) {
        throw new Error('This checkout has already started. Select the original payment option to resume it.');
      }

      // Play audio notification chime
      try {
        playNotificationChime();
      } catch (error) { console.warn('Notification sound unavailable:', error.message); }

      if (!isCreditOrder) {
        await payInPopup({ orderId: createdOrder._id || createdOrder.id });
        setOrderConfirmed(createdOrder);
        clearCart();
        navigate(`/orders/${createdOrder._id || createdOrder.id}`);
        return;
      }

      setOrderConfirmed(createdOrder);
      clearCart();
      refreshUser?.();
    } catch (err) {
      console.error("Order submission failed:", err);
      setErrorMsg(err.message || "Failed to place order. Please verify quantities and try again.");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  if (orderConfirmed) {
    const isCreditConfirmed =
      orderConfirmed.paymentStatus === "On Credit" ||
      orderConfirmed.isCreditOrder ||
      orderConfirmed.paymentMethod === "credit";
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
              {isCreditConfirmed ? "VIP Credit Order Approved!" : "Order Placed Successfully!"}
            </h2>
            <p className="text-xs font-mono font-bold text-brand-green-800 bg-brand-green-50 px-3.5 py-1.5 rounded-full inline-block">
              Order #{orderConfirmed.orderNumber || orderConfirmed._id}
            </p>
            <div className="pt-2">
              <span className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full ${
                isCreditConfirmed
                  ? "bg-rose-100 text-rose-800 border border-rose-200"
                  : isAwaitingConfirmation
                  ? "bg-amber-100 text-amber-800"
                  : "bg-blue-100 text-blue-800"
              }`}>
                ● Status: {isCreditConfirmed ? "Processing (On VIP Credit)" : (orderConfirmed.status || "Pending Payment")}
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto pt-2">
              {isCreditConfirmed
                ? "Your wholesale order has been placed on your VIP Credit Partner facility and added to your active Credit Invoices ledger. Packaging has started immediately."
                : isAwaitingConfirmation
                ? "Payment is verified automatically by Paystack."
                : "Your order is currently in 'Pending Payment' status. Open your order to complete payment with Paystack."}
            </p>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              variant="primary"
              className="w-full sm:w-auto px-6 py-3.5 text-sm font-bold rounded-2xl shadow-sm"
              onClick={() => navigate(`/orders/${orderConfirmed._id || orderConfirmed.id}`)}
              icon={Package}
            >
              View Order Details
            </Button>
            {isCreditConfirmed ? (
              <Button
                variant="outline"
                className="w-full sm:w-auto px-6 py-3.5 text-sm font-bold rounded-2xl text-rose-700 border-rose-200 hover:bg-rose-50"
                onClick={() => navigate("/credit-invoices")}
                icon={FileText}
              >
                View Credit Ledger
              </Button>
            ) : (
              <Button
                variant="outline"
                className="w-full sm:w-auto px-6 py-3.5 text-sm font-bold rounded-2xl text-slate-700 border-slate-200"
                onClick={() => navigate("/chat")}
                icon={MessageSquare}
              >
                Support Chat
              </Button>
            )}
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
              {user?.isVipCreditPartner ? "Payment & Credit Options" : "Pay securely with Paystack"}
            </h3>

            {user?.isVipCreditPartner && (
              <div className="space-y-2">
                <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider block">
                  Select Settlement Method
                </label>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("credit")}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-2 ${
                      paymentMethod === "credit"
                        ? "bg-amber-50/90 border-amber-400 ring-2 ring-amber-400/25 shadow-xs"
                        : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <div>
                      <span className="inline-flex items-center gap-1.5 text-xs font-black text-slate-900">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        Order on VIP Credit Facility
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Instant wholesale fulfillment. Amount is added to your Credit Invoices ledger in NGN.
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-200/80 text-amber-950 shrink-0">
                      VIP Partner
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("paystack")}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-2 ${
                      paymentMethod === "paystack"
                        ? "bg-brand-green-50/90 border-brand-green-500 ring-2 ring-brand-green-500/20 shadow-xs"
                        : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <div>
                      <span className="inline-flex items-center gap-1.5 text-xs font-black text-slate-900">
                        <span className="w-2 h-2 rounded-full bg-brand-green-600" />
                        Pay with Paystack
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Pay securely with automatic confirmation.
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {paymentMethod === "credit" && user?.isVipCreditPartner ? (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600">
                    VIP Credit Partner Summary
                  </span>
                  <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md">
                    Active Facility
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 pt-1">
                  <span>Current Credit Owing:</span>
                  <strong className="font-mono text-slate-900">{formatCurrency(user?.outstandingCredit || 0)}</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>This Credit Order:</span>
                  <strong className="font-mono text-rose-600">+{formatCurrency(estimatedTotal)}</strong>
                </div>
                <div className="flex justify-between text-slate-900 font-black pt-2 border-t border-slate-200 text-xs">
                  <span>New Credit Balance:</span>
                  <strong className="font-mono text-brand-green-800">
                    {formatCurrency(Number(user?.outstandingCredit || 0) + Number(estimatedTotal || 0))}
                  </strong>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-brand-green-50/70 border border-brand-green-100 rounded-2xl p-4 text-xs space-y-2">
                  <p className="font-extrabold text-brand-green-950">Secure payment with Paystack</p>
                  <p className="text-brand-green-900">Continue to Paystack to pay using the available payment methods. Your payment and invoice update automatically after verification.</p>
                </div>
              </>
            )}

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
                : paymentMethod === "credit" && user?.isVipCreditPartner
                ? "Place Order on VIP Credit"
                : "Confirm Wholesale Order"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Checkout;
