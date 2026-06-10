import React, { useState, useEffect } from "react";
import {
  dbGetOrders,
  dbUpdateOrderStatus,
  dbGetInvoiceById,
  dbGetOrdersByCustomer,
  dbAttachInvoiceToOrder,
} from "../../services/firebase/db";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../services/firebase/config";
import { formatCurrency } from "../../utils/formatCurrency";
import Badge from "../../components/ui/Badge";
import InvoiceForm from "../../modules/invoice/components/InvoiceForm";
import { useInvoice } from "../../modules/invoice/hooks/useInvoice";
import {
  ClipboardList,
  MessageSquare,
  Image,
  X,
  ArrowRight,
  FilePlus,
  Eye,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { showModal } from "../../services/ui/modal";

export const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedScreenshot, setSelectedScreenshot] = useState(null);

  // Invoice states
  const [prefillData, setPrefillData] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const { getCustomerInvoices, createInvoice, updateInvoice } = useInvoice();
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const allowedStatuses = ["Pending", "Paid", "Overdue"];

  const navigate = useNavigate();

  const fetchOrdersAndInvoices = async () => {
    try {
      const ordersData = await dbGetOrders();
      setOrders(ordersData);

      // Fetch generated invoices
      const invSnap = await getDocs(collection(db, "invoices"));
      const invList = invSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setInvoices(invList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrdersAndInvoices();

    // Poll for updates every 4 seconds to reflect external status changes
    const interval = setInterval(() => {
      fetchOrdersAndInvoices();
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await dbUpdateOrderStatus(orderId, newStatus);
      await fetchOrdersAndInvoices();
    } catch (err) {
      await showModal({
        title: "Update Failed",
        message: "Failed to update: " + err.message,
        tone: "danger",
      });
    }
  };

  const handleGenerateInvoiceClick = async (order) => {
    // Generate invoice from order items, attach to order, and refresh
    try {
      const prefill = {
        customerId: order.customerId || "customer-1",
        customerName: order.customerName || "Retail Buyer",
        businessName: order.businessName || "Wholesale Outlet",
        orderId: order.id,
        items: (order.items || []).map((item) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          isCarton: !!item.isCarton,
          cartonPrice:
            Number(item.cartonPrice) ||
            (item.isCarton ? Number(item.price || 0) : 0),
          unitPrice:
            Number(item.unitPrice) ||
            (!item.isCarton ? Number(item.price || 0) : 0),
          unitsPerCarton: Number(item.unitsPerCarton) || 12,
        })),
        discount: order.discount || 0,
        deposit: order.deposit || 0,
        status: order.status === "Paid" ? "Paid" : "Pending",
        notes: `Generated automatically from Order Reference: ${order.id}`,
      };

      const created = await createInvoice(prefill);
      await dbAttachInvoiceToOrder(order.id, created.id, created.invoiceNumber);
      // Keep order status in sync (no forced change here)
      await fetchOrdersAndInvoices();
      await showModal({
        title: "Invoice Created",
        message: "Invoice generated and attached: " + created.invoiceNumber,
      });
    } catch (e) {
      console.error(e);
      await showModal({
        title: "Generate Failed",
        message: "Failed to generate invoice: " + (e.message || e),
      });
    }
  };

  const handleViewInvoiceClick = (invoice) => {
    navigate(`/admin/invoices/${invoice.id}`);
  };

  const handleInvoiceSaveSuccess = () => {
    fetchOrdersAndInvoices();
  };

  const handleAttachLatestInvoice = async (order) => {
    try {
      const invoices = await getCustomerInvoices(order.customerId);
      if (!invoices || invoices.length === 0) {
        await showModal({
          title: "No Invoices Found",
          message: "No invoices found for this customer.",
          tone: "warning",
        });
        return;
      }
      const latest = invoices[0];
      await dbAttachInvoiceToOrder(order.id, latest.id, latest.invoiceNumber);
      await fetchOrdersAndInvoices();
      await showModal({
        title: "Invoice Attached",
        message: "Invoice attached to order: " + latest.invoiceNumber,
      });
    } catch (e) {
      console.error(e);
      await showModal({
        title: "Attach Failed",
        message: "Failed to attach invoice: " + (e.message || e),
      });
    }
  };

  const statusOptions = [
    "Pending Payment",
    "Paid",
    "Processing",
    "Shipped",
    "Cancelled",
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-brand-green-700" />
          Wholesale Order Manager
        </h2>
        <p className="text-xs text-slate-500 font-medium">
          Verify bank payment confirmation slips, update packaging stages, and
          launch customer chat channels.
        </p>
      </div>

      {loading ? (
        <p className="text-slate-500 animate-pulse text-xs font-semibold">
          Syncing orders...
        </p>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 font-extrabold border-b border-slate-100 bg-slate-50">
                  <th className="py-3.5 px-4">Order Reference</th>
                  <th className="py-3.5 px-4">Client Detail</th>
                  <th className="py-3.5 px-4 text-right">Grand Total</th>
                  <th className="py-3.5 px-4 text-center">Payment Slip</th>
                  <th className="py-3.5 px-4 text-center">Order Status</th>
                  <th className="py-3.5 px-4 text-center">Digital Invoice</th>
                  <th className="py-3.5 px-4 text-center">Channel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {orders.map((o) => {
                  // Find if an invoice is already generated for this order
                  const linkedInvoice = invoices.find(
                    (inv) => inv.orderId === o.id,
                  );

                  return (
                    <tr key={o.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-4 px-4 font-mono text-slate-900 font-bold">
                        {o.id}
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-extrabold text-slate-800 leading-tight">
                          {o.customerName}
                        </p>
                        <p className="text-[10px] text-slate-400 uppercase font-semibold">
                          {o.businessName}
                        </p>
                      </td>
                      <td className="py-4 px-4 text-right text-slate-900 font-black font-mono">
                        {formatCurrency(o.total)}
                      </td>
                      <td className="py-4 px-4 text-center">
                        {o.paymentScreenshot ? (
                          <button
                            onClick={() =>
                              setSelectedScreenshot(o.paymentScreenshot)
                            }
                            className="inline-flex items-center gap-1 bg-brand-green-50 text-brand-green-700 border border-brand-green-200 px-2 py-1 rounded-lg hover:bg-brand-green-100 transition text-[10px]"
                          >
                            <Image className="w-3.5 h-3.5" />
                            View Receipt
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[10px] italic">
                            Not attached
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <select
                          value={o.status}
                          onChange={(e) =>
                            handleStatusChange(o.id, e.target.value)
                          }
                          className="bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-green-500"
                        >
                          {allowedStatuses.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Linked Invoice Cell */}
                      <td className="py-4 px-4 text-center">
                        {linkedInvoice ? (
                          <button
                            onClick={() =>
                              handleViewInvoiceClick(linkedInvoice)
                            }
                            className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 hover:underline font-mono text-[10px] font-bold"
                          >
                            <Eye className="w-3.5 h-3.5 text-emerald-600" />
                            {linkedInvoice.invoiceNumber}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleGenerateInvoiceClick(o)}
                            className="inline-flex items-center gap-1 bg-brand-green-700 hover:bg-brand-green-900 text-white font-extrabold text-[10px] px-2.5 py-1.5 rounded-lg transition shadow-2xs"
                          >
                            <FilePlus className="w-3.5 h-3.5" />
                            Gen Invoice
                          </button>
                        )}
                      </td>

                      <td className="py-4 px-4 text-center">
                        <Link
                          to="/admin/chats"
                          onClick={() => {
                            // Prefill active room in localStorage or pass state
                            localStorage.setItem(
                              "vinoff_admin_selected_chat",
                              o.customerId,
                            );
                          }}
                          className="inline-flex items-center gap-1 text-brand-green-700 hover:text-brand-green-800 hover:underline text-[10px]"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          Chat
                        </Link>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleAttachLatestInvoice(o)}
                            className="inline-flex items-center gap-1 bg-brand-green-50 text-brand-green-700 border border-brand-green-200 px-2 py-1 rounded-lg text-[10px] font-bold"
                          >
                            Attach Latest
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment Screenshot Modal Overlay */}
      {selectedScreenshot && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl max-w-xl w-full p-6 space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-extrabold text-slate-800 text-xs tracking-wide uppercase">
                WIRE TRANSFER SLIP VIEW
              </h4>
              <button
                onClick={() => setSelectedScreenshot(null)}
                className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden border border-slate-200 max-h-[400px] flex items-center justify-center bg-slate-50">
              <img
                src={selectedScreenshot}
                alt="Payment Transfer Receipt"
                className="max-h-[380px] w-auto object-contain"
              />
            </div>

            <div className="text-right">
              <button
                onClick={() => setSelectedScreenshot(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INVOICE MODALS */}
      <InvoiceForm
        isOpen={isFormOpen}
        initialData={prefillData}
        onClose={() => {
          setIsFormOpen(false);
          setPrefillData(null);
        }}
        onSave={handleInvoiceSaveSuccess}
      />
    </div>
  );
};

export default Orders;
