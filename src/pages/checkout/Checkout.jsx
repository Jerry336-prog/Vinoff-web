import { useContext, useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { CartContext } from "../../context/CartContext";
import { AuthContext } from "../../context/AuthContext";
import { calculateInvoice } from "../../services/invoice/invoiceEngine";
import { uploadMedia } from "../../services/cloudinary/upload";
import { dbCreateOrder } from "../../services/firebase/db";
import { formatCurrency } from "../../utils/formatCurrency";
import {
  FileText,
  Landmark,
  Upload,
  CheckCircle2,
  MessageSquare,
  Loader2,
} from "lucide-react";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { showModal } from "../../services/ui/modal";

export const Checkout = () => {
  const { cartItems, clearCart } = useContext(CartContext);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [screenshot, setScreenshot] = useState(null);
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState(null);

  // Derived state calculations to avoid state duplication in useEffect (Vite React 19 CAS)
  const invoice =
    cartItems.length > 0 ? calculateInvoice(cartItems, 0.075, 15.0) : null;

  // Redirection handling
  useEffect(() => {
    if (cartItems.length === 0 && !orderConfirmed) {
      navigate("/cart");
    }
  }, [cartItems.length, navigate, orderConfirmed]);

  const handleScreenshotChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScreenshot(file);
    setUploading(true);
    try {
      const url = await uploadMedia(file);
      setScreenshotUrl(url);
    } catch (err) {
      console.error(err);
      await showModal({
        title: "Upload Failed",
        message: "Failed to upload screenshot. Please try again.",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitOrder = async () => {
    if (!invoice || !user) return;

    setSubmitting(true);
    try {
      const orderPayload = {
        customerId: user.uid,
        customerName: user.name,
        businessName: user.businessName,
        items: invoice.items.map((item) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          isCarton: item.isCarton,
          unitsPerCarton: item.unitsPerCarton,
          price: item.price,
          total: item.total,
        })),
        subtotal: invoice.subtotal,
        vat: invoice.vatAmount,
        shipping: invoice.shipping,
        total: invoice.grandTotal,
        invoiceNumber: invoice.invoiceNumber,
        paymentScreenshot: screenshotUrl || null,
      };

      const createdOrder = await dbCreateOrder(orderPayload);
      setOrderConfirmed(createdOrder);
      clearCart();
    } catch (err) {
      console.error(err);
      await showModal({
        title: "Submit Failed",
        message: "Error submitting order: " + err.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (orderConfirmed) {
    return (
      <div className="max-w-md mx-auto text-center py-16 px-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-6">
        <div className="w-16 h-16 rounded-full bg-brand-green-100 text-brand-green-700 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-9 h-9" />
        </div>
        <div className="space-y-2">
          <h3 className="font-extrabold text-slate-800 text-xl tracking-tight">
            Order Placed Successfully!
          </h3>
          <p className="text-xs text-brand-yellow-800 bg-brand-yellow-50 px-3 py-1 rounded-full font-bold inline-block">
            Order Ref: {orderConfirmed.id}
          </p>
          <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto pt-2">
            Your wholesale request has been submitted. We've notified support in
            your live chat room. Once our team approves the transfer, shipment
            will begin.
          </p>
        </div>

        <div className="pt-4 flex flex-col gap-2">
          <Link to="/chat">
            <Button
              variant="primary"
              className="w-full rounded-xl"
              icon={MessageSquare}
            >
              Go to Support Chat
            </Button>
          </Link>
          <Link to="/shop">
            <Button variant="outline" className="w-full rounded-xl">
              Return to Catalog
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!invoice) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">
          Wholesale Settlement
        </h2>
        <p className="text-xs text-slate-500 font-medium">
          Verify your items invoice and submit wire transfer receipt.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-start">
        {/* Invoice View Sheet */}
        <div className="md:col-span-3 bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">
                PROFORMA INVOICE
              </h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                No: {invoice.invoiceNumber}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-full font-bold">
                Awaiting Wire
              </span>
            </div>
          </div>

          {/* Issuer details */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="font-bold text-slate-500 uppercase text-[9px] tracking-wider">
                Supplier
              </p>
              <p className="font-extrabold text-slate-800">
                Vinoff Wholesales Ltd
              </p>
              <p className="text-slate-500 mt-0.5">
                Warehouse Unit A, Industrial Estate
              </p>
            </div>
            <div>
              <p className="font-bold text-slate-500 uppercase text-[9px] tracking-wider">
                Buyer Outlet
              </p>
              <p className="font-extrabold text-slate-800">{user?.name}</p>
              <p className="text-slate-500 mt-0.5 truncate">
                {user?.businessName}
              </p>
            </div>
          </div>

          {/* Date lines */}
          <div className="grid grid-cols-2 gap-4 text-[10px] bg-slate-50 rounded-xl p-3 border border-slate-100">
            <div>
              <span className="text-slate-400 font-semibold">Date issued:</span>
              <span className="font-bold text-slate-700 ml-1">
                {invoice.dateIssued}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold">Due Terms:</span>
              <span className="font-bold text-slate-700 ml-1">
                {invoice.dueDate} (5 days)
              </span>
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide">
              Ordered Items
            </h4>
            <div className="divide-y divide-slate-100 border-t border-b border-slate-100">
              {invoice.items.map((item) => (
                <div
                  key={item.id}
                  className="py-2.5 flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-bold text-slate-800 truncate max-w-[200px] sm:max-w-xs">
                      {item.name}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {item.quantity} x {item.isCarton ? "Carton" : "Unit"} @{" "}
                      {formatCurrency(item.price)}
                    </p>
                  </div>
                  <span className="font-bold text-slate-900">
                    {formatCurrency(item.total)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Subtotal blocks */}
          <div className="space-y-1.5 text-xs text-slate-500 text-right max-w-xs ml-auto">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-bold text-slate-800">
                {formatCurrency(invoice.subtotal)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>VAT (7.5%)</span>
              <span className="font-bold text-slate-800">
                {formatCurrency(0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Estimated Freight</span>
              <span className="font-bold text-slate-800">
                {formatCurrency(invoice.shipping)}
              </span>
            </div>
            <div className="flex justify-between text-sm font-black text-slate-900 border-t border-slate-100 pt-2">
              <span>Invoice Total</span>
              <span className="text-brand-green-700">
                {formatCurrency(invoice.grandTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* Bank & Attachment uploads */}
        <div className="md:col-span-2 space-y-6">
          {/* Wire accounts */}
          <Card title="Wire Details" className="border-brand-green-200">
            <div className="space-y-4">
              <div className="flex gap-2.5 items-start">
                <Landmark className="w-5.5 h-5.5 text-brand-green-700 mt-0.5 flex-shrink-0" />
                <div className="text-xs">
                  <p className="font-extrabold text-slate-800">
                    {invoice.paymentInstructions.bankName}
                  </p>
                  <p className="text-slate-500 mt-0.5">
                    Account Name:{" "}
                    <strong>{invoice.paymentInstructions.accountName}</strong>
                  </p>
                  <div className="flex items-center gap-1.5 mt-2 bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 max-w-[200px]">
                    <span className="font-mono font-bold text-slate-800">
                      {invoice.paymentInstructions.accountNumber}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed border-t border-slate-100 pt-3">
                Send exact invoice amount{" "}
                <strong>{formatCurrency(invoice.grandTotal)}</strong>. Submit
                transfer slip snapshot below to activate order verification.
              </p>
            </div>
          </Card>

          {/* Screenshot submit card */}
          <Card title="Payment slip upload">
            <div className="space-y-4 text-center">
              {screenshotUrl ? (
                <div className="space-y-3">
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 max-h-36">
                    <img
                      src={screenshotUrl}
                      alt="Slip"
                      className="w-full object-cover"
                    />
                  </div>
                  <button
                    onClick={() => {
                      setScreenshot(null);
                      setScreenshotUrl("");
                    }}
                    className="text-[10px] font-bold text-red-500 hover:underline"
                  >
                    Delete & Re-upload
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-200 hover:border-brand-green-400 rounded-2xl p-5 transition cursor-pointer relative group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleScreenshotChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    disabled={uploading}
                  />
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 group-hover:text-brand-green-600 transition">
                      {uploading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Upload className="w-5 h-5" />
                      )}
                    </div>
                    <p className="text-xs font-bold text-slate-700">
                      {uploading
                        ? "Uploading receipt slip..."
                        : "Upload Transfer slip"}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      PNG, JPG up to 5MB
                    </p>
                  </div>
                </div>
              )}

              <Button
                variant="primary"
                onClick={handleSubmitOrder}
                isLoading={submitting}
                className="w-full py-3 rounded-xl mt-4"
              >
                Confirm Wire Settlement
              </Button>

              <p className="text-[9px] text-slate-400 leading-relaxed">
                * You can also skip upload and message the screenshot in the
                Support Chat later.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
