import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../services/api";
import { formatCurrency } from "../../utils/formatCurrency";
import Badge from "../../components/ui/Badge";
import {
  Package,
  Search,
  Filter,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Upload,
} from "lucide-react";
import Button from "../../components/ui/Button";

export const OrdersList = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const navigate = useNavigate();

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/orders");
      const list = res.data?.items || res.data || [];
      setOrders(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const statuses = [
    "All",
    "Pending Payment",
    "Awaiting Confirmation",
    "Payment Confirmed",
    "Processing",
    "Ready for Delivery",
    "Shipped",
    "Completed",
    "Cancelled",
  ];

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.items?.some((i) =>
        i.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );

    const matchesStatus =
      statusFilter === "All" || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-brand-green-700" />
            My Wholesale Orders
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            View orders, upload payment confirmation slips, and track dispatch status.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search order number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold focus:ring-2 focus:ring-brand-green-500 outline-none"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>
          <Link
            to="/shop"
            className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 bg-brand-green-600 hover:bg-brand-green-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            New Order
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {statuses.map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all outline-none ${
              statusFilter === st
                ? "bg-brand-green-600 text-white shadow-sm"
                : "bg-white hover:bg-slate-100 border border-slate-200 text-slate-600"
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-3xl animate-pulse text-xs text-slate-400">
          Syncing order history...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <Package className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-base font-bold text-slate-700">No Orders Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {searchTerm || statusFilter !== "All"
              ? "No orders matched your filter criteria."
              : "You have not placed any wholesale orders yet."}
          </p>
          <Link
            to="/shop"
            className="inline-flex items-center gap-1.5 mt-4 px-4 py-2.5 bg-brand-green-600 text-white rounded-xl text-xs font-bold hover:bg-brand-green-700 transition shadow-sm"
          >
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <div
              key={order._id}
              onClick={() => navigate(`/orders/${order._id}`)}
              className="bg-white border border-slate-200 hover:border-brand-green-300 rounded-3xl p-5 shadow-sm hover:shadow-md transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-black text-sm text-slate-900">
                    {order.orderNumber}
                  </span>
                  <Badge status={order.status} className="text-[10px]" />
                  {order.paymentScreenshot?.url && order.status === "Awaiting Confirmation" && (
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                      Proof Uploaded
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                  <span>
                    Placed on:{" "}
                    <strong className="text-slate-700">
                      {new Date(order.createdAt).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </strong>
                  </span>
                  <span>&bull;</span>
                  <span>
                    Items:{" "}
                    <strong className="text-slate-700">
                      {order.items?.length || 0} product(s)
                    </strong>
                  </span>
                  {order.invoice && (
                    <>
                      <span>&bull;</span>
                      <span className="text-brand-green-700 font-bold">
                        Invoice: {order.invoice.invoiceNumber || "Attached"}
                      </span>
                    </>
                  )}
                </div>

                {/* Items preview */}
                <p className="text-xs text-slate-600 line-clamp-1">
                  {order.items
                    ?.map((item) => `${item.quantity}x ${item.name}`)
                    .join(", ")}
                </p>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-5 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                <div className="text-left md:text-right">
                  <p className="text-base font-black text-slate-900">
                    {formatCurrency(order.totalAmount)}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Payment: <strong className="text-slate-600">{order.paymentStatus}</strong>
                  </p>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  icon={ArrowRight}
                  className="rounded-xl shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/orders/${order._id}`);
                  }}
                >
                  View
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrdersList;
