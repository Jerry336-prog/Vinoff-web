import React, { useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CartContext } from "../../context/CartContext";
import { formatCurrency } from "../../utils/formatCurrency";
import {
  Trash2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  ShoppingCart,
} from "lucide-react";
import Button from "../../components/ui/Button";
import useCloudinaryUpload from "../../hooks/useCloudinaryUpload";
import { showModal } from "../../services/ui/modal";

export const Cart = () => {
  const {
    cartItems,
    updateQuantity,
    toggleItemMode,
    removeFromCart,
    clearCart,
    subtotal,
    MIN_ORDER_THRESHOLD,
    meetsMinThreshold,
    dbUpdateOrderPaymentScreenshot,
    refreshCart,
  } = useContext(CartContext);

  const navigate = useNavigate();
  const { upload: uploadImage, loading: uploadLoading } = useCloudinaryUpload();

  const handleCheckout = () => {
    if (meetsMinThreshold) {
      navigate("/checkout");
    }
  };

  const handlePaymentScreenshot = async (file, orderId) => {
    if (!file) return;
    try {
      const res = await uploadImage(file, "payments");
      // attach to order locally or call service to save
      await dbUpdateOrderPaymentScreenshot(orderId, res.url);
      await refreshCart();
      await showModal({
        title: "Upload Success",
        message: "Payment proof uploaded successfully",
      });
    } catch (err) {
      console.error("Payment upload failed", err);
      await showModal({
        title: "Upload Failed",
        message: "Failed to upload payment screenshot: " + (err.message || err),
      });
    }
  };

  const shipping = 15.0; // Mock delivery freight
  const total = subtotal + shipping;

  if (cartItems.length === 0) {
    return (
      <div className="text-center py-16 bg-white border border-slate-200 rounded-3xl shadow-sm">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <ShoppingCart className="w-8 h-8 text-slate-300" />
        </div>
        <h3 className="font-bold text-slate-800 text-lg">Your Cart is Empty</h3>
        <p className="text-slate-500 text-xs mt-1.5 max-w-xs mx-auto">
          Add bulk household toiletries or liquid sanitizers to meet the
          wholesale threshold.
        </p>
        <Link to="/shop" className="mt-6 inline-block">
          <Button variant="primary" className="rounded-xl p-3">
            Browse Catalog Shelf
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">
          Wholesale Cart
        </h2>
        <p className="text-xs text-slate-500 font-medium">
          Verify your items, purchase modes, and thresholds below.
        </p>
      </div>

      {/* Threshold Warning Banner */}
      {!meetsMinThreshold && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-4 flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5.5 h-5.5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-xs tracking-tight uppercase">
              Minimum Wholesale Order Threshold Not Met
            </h4>
            <p className="text-xs text-amber-700 mt-1 leading-relaxed">
              Your subtotal is <strong>{formatCurrency(subtotal)}</strong>. A
              minimum value of{" "}
              <strong>{formatCurrency(MIN_ORDER_THRESHOLD)}</strong> is required
              to check out. Add{" "}
              <strong>{formatCurrency(MIN_ORDER_THRESHOLD - subtotal)}</strong>{" "}
              worth of items.
            </p>
            <Link
              to="/shop"
              className="mt-2.5 inline-block text-xs font-bold text-amber-900 underline hover:text-amber-950"
            >
              Go back to shop shelf &rarr;
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            <div className="divide-y divide-slate-100">
              {cartItems.map((item) => {
                const price = item.isCarton ? item.cartonPrice : item.unitPrice;
                const itemTotal = price * item.quantity;

                return (
                  <div
                    key={`${item.id}-${item.isCarton}`}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    {/* Item Info */}
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden border border-slate-200/50 flex-shrink-0">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-800 text-sm truncate">
                          {item.name}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-[10px] text-slate-400 font-semibold uppercase">
                            {item.category}
                          </span>
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                          <span className="text-[10px] text-brand-green-700 font-bold bg-brand-green-50 px-2 py-0.5 rounded-md">
                            {item.isCarton ? `Carton pack` : `Single pieces`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Mode Toggle, Qty, Price */}
                    <div className="flex flex-wrap items-center justify-between sm:justify-end gap-4.5">
                      {/* Toggle Package Type */}
                      <button
                        onClick={() => toggleItemMode(item.id, item.isCarton)}
                        className="text-[10px] font-bold text-slate-500 hover:text-brand-green-600 bg-slate-50 hover:bg-brand-green-50/50 border border-slate-200 rounded-lg px-2.5 py-1.5 transition"
                        title="Change between Cartons / Units"
                      >
                        Buy {item.isCarton ? "Units" : "Cartons"}
                      </button>

                      {/* Quantity Selector */}
                      <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50">
                        <button
                          onClick={() =>
                            updateQuantity(
                              item.id,
                              item.isCarton,
                              item.quantity - 1,
                            )
                          }
                          className="px-2.5 py-1 text-slate-500 hover:text-brand-green-600 font-bold text-sm"
                        >
                          -
                        </button>
                        <span className="w-6 text-center text-xs font-bold text-slate-800">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(
                              item.id,
                              item.isCarton,
                              item.quantity + 1,
                            )
                          }
                          className="px-2.5 py-1 text-slate-500 hover:text-brand-green-600 font-bold text-sm"
                        >
                          +
                        </button>
                      </div>

                      {/* Item Total Price */}
                      <div className="text-right w-24">
                        <p className="text-sm font-black text-slate-900">
                          {formatCurrency(itemTotal)}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {formatCurrency(price)} /{" "}
                          {item.isCarton ? "ctn" : "unit"}
                        </p>
                      </div>

                      {/* Delete item button */}
                      <button
                        onClick={() => removeFromCart(item.id, item.isCarton)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Clear Cart Button */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 text-right">
              <button
                onClick={clearCart}
                className="text-xs font-semibold text-red-500 hover:text-red-700"
              >
                Clear Entire Cart
              </button>
            </div>
          </div>
        </div>

        {/* Order Summary Checkout Card */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-sm tracking-wide uppercase border-b border-slate-100 pb-3">
              Order Subtotal
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span>Subtotal (Wholesale)</span>
                <span className="font-bold text-slate-800">
                  {formatCurrency(subtotal)}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>VAT (7.5%)</span>
                <span className="font-bold text-slate-800">
                  {formatCurrency(0)}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>Estimated Freight Fee</span>
                <span className="font-bold text-slate-800">
                  {formatCurrency(shipping)}
                </span>
              </div>
              <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-sm font-black text-slate-900">
                <span>Grand Total</span>
                <span className="text-base text-brand-green-700">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>

            <Button
              variant="primary"
              onClick={handleCheckout}
              disabled={!meetsMinThreshold}
              className="w-full py-3.5 rounded-2xl mt-4"
              icon={ArrowRight}
            >
              Proceed to Wire Details
            </Button>

            <div className="bg-slate-50 border border-slate-200/50 rounded-xl p-3 text-[10px] text-slate-500 leading-relaxed flex gap-2">
              <ShieldCheck className="w-4 h-4 text-brand-green-600 flex-shrink-0" />
              <span>
                By proceeding, you will generate a wholesale invoice. Wire
                payment instructions and screenshot attachments can be completed
                on the next page.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
