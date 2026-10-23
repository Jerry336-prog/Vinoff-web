import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from '../../context/AuthContext';
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../../services/api";
import { createIdempotencyKey, withIdempotencyKey } from "../../services/idempotency";
import { formatCurrency } from "../../utils/formatCurrency";
import Badge from "../../components/ui/Badge";
import {
  ClipboardList,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  MessageSquare,
  FileText,
  AlertTriangle,
  Image as ImageIcon,
  Check,
  X,
  User,
} from "lucide-react";
import Button from "../../components/ui/Button";
import ExportButton from "../../components/exports/ExportButton";
import { useToast, toast } from "../../context/ToastContext";

const ORDER_STATUSES = ["Pending Payment", "Processing", "Delivered", "Cancelled"];

export const Orders = () => {
  const { can } = useContext(AuthContext);
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get("order") || searchParams.get("search") || "";
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    const q = searchParams.get("order") || searchParams.get("search");
    if (q) {
      setSearchTerm(q);
    }
  }, [searchParams]);

  // Screenshot review modal
  const [selectedScreenshot, setSelectedScreenshot] = useState(null);

  // Status updating state
  const [updatingId, setUpdatingId] = useState(null);

  const navigate = useNavigate();

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/orders");
      const list = res.data?.items || res.data || [];
      setOrders(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Failed to load admin orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const { toast, showModal } = useToast();

  const handleStatusChange = async (orderId, newStatus) => {
    setUpdatingId(orderId);
    try {
      const res = await api.patch(
        `/api/orders/${orderId}/status`,
        { status: newStatus },
        withIdempotencyKey(createIdempotencyKey(`order-status-${orderId}-${newStatus}`)),
      );
      const updatedOrder = res.data?.order || res.data;
      setOrders((prev) =>
        prev.map((o) => (o._id === orderId ? { ...o, status: newStatus } : o))
      );
      toast.success(`Order status updated to '${newStatus}'`, "Status Updated");
    } catch (err) {
      toast.error(err.message || "Failed to update order status", "Update Failed");
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      order.orderNumber?.toLowerCase().includes(term) ||
      order.customer?.firstName?.toLowerCase().includes(term) ||
      order.customer?.lastName?.toLowerCase().includes(term) ||
      order.customer?.email?.toLowerCase().includes(term) ||
      order.customer?.profile?.companyName?.toLowerCase().includes(term);

    const matchesStatus =
      statusFilter === "All" || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-5 sm:space-y-6 px-1 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-brand-green-700" />
            Wholesale Order Processing Desk
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5 leading-relaxed">
            Review orders and Paystack payment status, manage processing, and confirm delivery.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0">
          <ExportButton kind="orders" />
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search order #, customer, store..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-brand-green-500 outline-none"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none flex-nowrap">
        {["All", ...ORDER_STATUSES].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all outline-none shrink-0 ${
              statusFilter === st
                ? "bg-brand-green-600 text-white shadow-xs"
                : "bg-white hover:bg-slate-50 border border-slate-200 text-slate-600"
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="p-12 text-center bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl animate-pulse text-xs text-slate-400">
          Syncing order records...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center shadow-xs">
          <ClipboardList className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">No Orders Found</p>
          <p className="text-xs text-slate-400 mt-1">No orders matched the selected filter criteria.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const hasScreenshot = Boolean(order.paymentScreenshot?.url);
            const isAwaitingConfirmation = order.status === "Awaiting Confirmation";
            const isCreditOrder = order.isCreditOrder || order.paymentStatus === "On Credit";
            const isCustomerOwing =
              Number(order.customer?.outstandingCredit || 0) > 0 ||
              Boolean(order.customer?.isOwingCredit) ||
              order.paymentStatus === "On Credit";
            const customerId = order.customer?._id || order.customer?.id || order.customerId;

            return (
              <div
                key={order._id}
                className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs hover:border-brand-green-300 transition space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-black text-sm text-slate-900">
                        {order.orderNumber}
                      </span>
                      <Badge status={order.status} className="text-[10px]" />
                      {isCreditOrder && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
                          VIP Credit ({order.paymentStatus || "On Credit"})
                        </span>
                      )}
                      {hasScreenshot && (
                        <button
                          onClick={() => setSelectedScreenshot(order.paymentScreenshot)}
                          className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100/90 text-amber-900 hover:bg-amber-200 px-2.5 py-0.5 rounded-full transition"
                        >
                          <ImageIcon className="w-3 h-3" /> Historical Receipt
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed flex flex-wrap items-center gap-1.5">
                      <span>Placed on: {new Date(order.createdAt).toLocaleString()} &bull;</span>
                      <span className="font-bold text-slate-700 inline-flex items-center gap-1">
                        {order.customer?.firstName} {order.customer?.lastName}
                        {isCustomerOwing && (
                          <span
                            className="inline-block w-2 h-2 rounded-full bg-red-600 shrink-0"
                            title="VIP Customer Owing Credit"
                          />
                        )}
                      </span>
                      {order.customer?.profile?.companyName ? (
                        <span>({order.customer.profile.companyName})</span>
                      ) : null}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    {/* Confirm Payment Action */}


                    {/* Status Dropdown */}
                    <select
                      value={order.status}
                      disabled={!can('orders.manage') || updatingId === order._id}
                      onChange={(e) => handleStatusChange(order._id, e.target.value)}
                      className="bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl py-1.5 px-3 focus:ring-2 focus:ring-brand-green-500 outline-none flex-1 sm:flex-initial"
                    >
                      {ORDER_STATUSES.filter(s => s !== 'Payment Confirmed' || order.paymentStatus === 'Confirmed').map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>

                    <Link
                      to={customerId ? `/admin/chats?customer=${customerId}` : "/admin/chats"}
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition shrink-0"
                      title="Open Customer Chat"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </Link>

                    {order.customer?._id && (
                      <Link
                        to={`/admin/customers/${order.customer._id}`}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition shrink-0"
                        title="View Customer Profile"
                      >
                        <User className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                </div>

                {/* Items and Amounts */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="md:col-span-2 space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      Ordered Products ({order.items?.length || 0})
                    </span>
                    <div className="space-y-1">
                      {order.items?.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-slate-700">
                          <span>
                            {item.quantity}x {item.name} ({item.unit || "carton"})
                          </span>
                          <span className="font-semibold text-slate-900">
                            {formatCurrency(item.subtotal || (item.quantity * (item.wholesalePrice || item.price)))}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-50/70 rounded-2xl p-3.5 space-y-1.5 border border-slate-100">
                    <div className="flex justify-between text-slate-500">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(order.subtotal)}</span>
                    </div>
                    {Number(order.deliveryFee) > 0 && (
                      <div className="flex justify-between text-slate-500">
                        <span>Delivery:</span>
                        <span>{formatCurrency(order.deliveryFee)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-black text-slate-900 pt-1.5 border-t border-slate-200">
                      <span>Total:</span>
                      <span className="text-brand-green-950 text-sm">
                        {formatCurrency(order.totalAmount)}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 text-right mt-0.5">
                      Payment Status: <strong className="text-slate-700 uppercase">{order.paymentStatus}</strong>
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Screenshot Review Modal */}
      {selectedScreenshot && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-brand-yellow-600" />
                Historical Payment Receipt
              </h3>
              <button
                onClick={() => setSelectedScreenshot(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 max-h-[70vh] flex items-center justify-center">
              <img
                src={selectedScreenshot.url}
                alt="Payment proof"
                className="w-full h-auto max-h-[65vh] object-contain"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <a
                href={selectedScreenshot.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-brand-green-700 hover:underline flex items-center gap-1"
              >
                Open Original in New Tab <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedScreenshot(null)}
                className="rounded-xl"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
