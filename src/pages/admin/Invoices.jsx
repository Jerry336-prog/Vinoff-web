import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { formatCurrency } from "../../utils/formatCurrency";
import Badge from "../../components/ui/Badge";
import { AuthContext } from "../../context/AuthContext";
import {
  FileText,
  Search,
  Plus,
  Printer,
  Download,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  DollarSign,
  User,
  Trash2,
  X,
  Building,
  Check,
} from "lucide-react";
import Button from "../../components/ui/Button";
import { downloadInvoicePDF } from "../../utils/generatePDF";
import { toast } from "../../context/ToastContext";
import { unwrapApiList, unwrapApiRecord } from "../../utils/apiResponse";

const ALLOWED_STATUSES = ["Draft", "Pending", "Paid", "Cancelled"];

export const Invoices = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Create Invoice Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState({
    customerId: "",
    items: [{ description: "", quantity: 1, unitPrice: 0, total: 0 }],
    discount: 0,
    deliveryFee: 5000,
    notes: "",
    dueDate: "",
    status: "Pending",
  });

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/invoices");
      const list = unwrapApiList(res);
      setInvoices(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Failed to load invoices:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();

    // Also fetch customers and products for custom invoice creation
    api.get("/api/admin/customers")
      .then((res) => {
        const list = unwrapApiList(res);
        setCustomers(Array.isArray(list) ? list : []);
      })
      .catch(console.error);

    api.get("/api/products")
      .then((res) => {
        const list = unwrapApiList(res);
        setProducts(Array.isArray(list) ? list : []);
      })
      .catch(console.error);
  }, []);

  const [downloadingId, setDownloadingId] = useState(null);

  const handleStatusUpdate = async (invoiceId, newStatus) => {
    try {
      const adminName = user?.name || "System Admin";
      await api.patch(`/api/invoices/${invoiceId}`, { status: newStatus, issuedBy: adminName });
      setInvoices((prev) =>
        prev.map((inv) => ((inv._id || inv.id) === invoiceId ? { ...inv, status: newStatus, issuedBy: adminName } : inv))
      );
      toast.success(`Invoice status updated to '${newStatus}' & stamped by ${adminName}`, "Status Updated");
    } catch (err) {
      toast.error(err.message || "Failed to update invoice status", "Update Failed");
    }
  };

  const handleDownload = async (invoiceId) => {
    setDownloadingId(invoiceId);
    try {
      await downloadInvoicePDF(invoiceId);
    } catch (err) {
      // toast error handled inside downloadInvoicePDF
    } finally {
      setDownloadingId(null);
    }
  };

  // Custom Invoice Form Handlers
  const handleAddItem = () => {
    setCreateForm((prev) => ({
      ...prev,
      items: [...prev.items, { productId: "", unitType: "carton", description: "", quantity: 1, unitPrice: 0, total: 0 }],
    }));
  };

  const handleRemoveItem = (index) => {
    setCreateForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleProductSelect = (index, selectedId, selectedUnitType = "carton") => {
    const product = products.find((p) => (p.id || p._id) === selectedId);
    setCreateForm((prev) => {
      const updated = [...prev.items];
      if (!product) {
        updated[index] = {
          ...updated[index],
          productId: "",
          unitType: selectedUnitType,
        };
        return { ...prev, items: updated };
      }

      const ctnPrice = Number(product.cartonPrice || product.wholesalePrice || product.price) || 0;
      const pcsPrice =
        Number(product.unitPrice) ||
        (product.unitsPerCarton ? Math.round(ctnPrice / Number(product.unitsPerCarton)) : Math.round(ctnPrice / 12));

      const isPieces = selectedUnitType === "pieces" || selectedUnitType === "pcs";
      const unitPrice = isPieces ? pcsPrice : ctnPrice;
      const unitLabel = isPieces ? "(Pieces)" : "(CTN)";
      const description = `${product.name} ${unitLabel}`;
      const qty = Number(updated[index].quantity) || 1;

      updated[index] = {
        ...updated[index],
        productId: product.id || product._id,
        unitType: isPieces ? "pieces" : "carton",
        description,
        unitPrice,
        quantity: qty,
        total: qty * unitPrice,
      };

      return { ...prev, items: updated };
    });
  };

  const handleItemChange = (index, field, value) => {
    setCreateForm((prev) => {
      const updated = [...prev.items];
      updated[index] = { ...updated[index], [field]: value };
      const qty = Number(updated[index].quantity) || 0;
      const price = Number(updated[index].unitPrice) || 0;
      updated[index].total = qty * price;
      return { ...prev, items: updated };
    });
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.customerId) {
      toast.warning("Please select a wholesale customer.", "Customer Required");
      return;
    }

    if (createForm.items.length === 0 || !createForm.items[0].description) {
      toast.warning("Please enter at least one invoice item with a description.", "Items Required");
      return;
    }

    setSubmitting(true);
    try {
      const adminName = user?.name || "System Admin";
      const payload = {
        customer: createForm.customerId,
        items: createForm.items.map((i) => ({
          description: i.description,
          quantity: Number(i.quantity) || 1,
          unitPrice: Number(i.unitPrice) || 0,
          total: (Number(i.quantity) || 1) * (Number(i.unitPrice) || 0),
        })),
        discount: Number(createForm.discount) || 0,
        deliveryFee: Number(createForm.deliveryFee) || 0,
        notes: createForm.notes,
        dueDate: createForm.dueDate || undefined,
        status: createForm.status,
        issuedBy: adminName,
      };

      const res = await api.post("/api/invoices", payload);
      setInvoices((prev) => [unwrapApiRecord(res), ...prev].filter(Boolean));
      setIsCreateOpen(false);
      setCreateForm({
        customerId: "",
        items: [{ description: "", quantity: 1, unitPrice: 0, total: 0 }],
        discount: 0,
        deliveryFee: 5000,
        notes: "",
        dueDate: "",
        status: "Pending",
      });
      toast.success(`Custom wholesale invoice created & stamped by ${adminName}!`, "Invoice Generated");
    } catch (err) {
      toast.error(err.message || "Failed to create custom invoice", "Creation Failed");
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = invoices.filter((inv) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      inv.invoiceNumber?.toLowerCase().includes(term) ||
      inv.customer?.firstName?.toLowerCase().includes(term) ||
      inv.customer?.lastName?.toLowerCase().includes(term) ||
      inv.customer?.email?.toLowerCase().includes(term) ||
      inv.customer?.profile?.companyName?.toLowerCase().includes(term);

    const matchesStatus =
      statusFilter === "All" || inv.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-green-700" />
            Wholesale Invoicing System
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Issue automated and custom wholesale invoices with strict compliance: Draft, Pending, Paid, Cancelled.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-60">
            <input
              type="text"
              placeholder="Search invoice or store..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold focus:ring-2 focus:ring-brand-green-500 outline-none"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          <Button
            size="sm"
            variant="primary"
            icon={Plus}
            onClick={() => setIsCreateOpen(true)}
            className="rounded-xl shrink-0"
          >
            Create Invoice
          </Button>
        </div>
      </div>

      {/* Strict Filter Tabs */}
      <div className="flex items-center gap-2">
        {["All", ...ALLOWED_STATUSES].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              statusFilter === st
                ? "bg-brand-green-600 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Invoices Table */}
      {loading ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-3xl animate-pulse text-xs text-slate-400">
          Syncing invoice database...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm">
          <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">No Invoices Found</p>
          <p className="text-xs text-slate-400 mt-1">No invoices matched your filter criteria.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 font-extrabold border-b border-slate-100 bg-slate-50/70">
                  <th className="py-4 px-5">Invoice #</th>
                  <th className="py-4 px-4">Issued To</th>
                  <th className="py-4 px-4">Date Issued</th>
                  <th className="py-4 px-4">Issued By</th>
                  <th className="py-4 px-4 text-right">Total Payable</th>
                  <th className="py-4 px-4 text-center">Status</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {filtered.map((inv) => {
                  const cachedStamp = localStorage.getItem(`vinoff_invoice_stamp_${inv._id || inv.id}`);
                  const issuer =
                    inv.issuedBy ||
                    cachedStamp ||
                    (typeof inv.createdBy === "object"
                      ? (inv.createdBy?.name || `${inv.createdBy?.firstName || ""} ${inv.createdBy?.lastName || ""}`.trim())
                      : inv.createdBy);

                  return (
                    <tr
                      key={inv._id || inv.id}
                      onClick={() => navigate(`/admin/invoices/${inv._id || inv.id}`)}
                      className="hover:bg-slate-50/70 transition cursor-pointer"
                    >
                      <td className="py-4 px-5 font-mono font-black text-slate-900 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400" />
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-bold text-slate-900 leading-tight">
                          {inv.customer?.firstName} {inv.customer?.lastName}
                        </p>
                        <p className="text-[10px] text-slate-400 uppercase font-semibold">
                          {inv.customer?.profile?.companyName || "Commercial Buyer"}
                        </p>
                      </td>
                      <td className="py-4 px-4 text-slate-500 font-medium">
                        {new Date(inv.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-4 text-slate-700 font-bold">
                        {issuer ? (
                          <span className="text-brand-green-800">{issuer}</span>
                        ) : (
                          <span className="text-slate-400 font-medium italic">[Unconfirmed]</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right text-slate-900 font-black">
                        {formatCurrency(inv.total || inv.totalAmount)}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <Badge status={inv.status} className="text-[10px]" />
                      </td>
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {inv.status === "Pending" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusUpdate(inv._id || inv.id, "Paid");
                              }}
                              className="p-1.5 hover:bg-emerald-50 text-emerald-600 rounded-lg transition"
                              title="Mark as Paid & Stamp Admin Name"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}

                          {inv.status !== "Cancelled" && inv.status !== "Paid" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusUpdate(inv._id || inv.id, "Cancelled");
                              }}
                              className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition"
                              title="Cancel Invoice"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(inv._id || inv.id);
                            }}
                            disabled={downloadingId === (inv._id || inv.id)}
                            className={`p-1.5 rounded-lg transition ${
                              downloadingId === (inv._id || inv.id)
                                ? "bg-brand-green-50 text-brand-green-600 animate-pulse"
                                : "hover:bg-slate-100 text-slate-500 hover:text-brand-green-700"
                            }`}
                            title="Download Official Vinoff PDF"
                          >
                            <Download className="w-4 h-4" />
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

      {/* Create Custom Invoice Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg tracking-tight">
                  Generate Custom Invoice
                </h3>
                <p className="text-xs text-slate-400">
                  Issue an official commercial invoice directly to a wholesale buyer.
                </p>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {/* Customer Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                  Select Customer *
                </label>
                <select
                  value={createForm.customerId}
                  onChange={(e) => setCreateForm({ ...createForm, customerId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-semibold focus:ring-2 focus:ring-brand-green-500 outline-none"
                  required
                >
                  <option value="">-- Choose Wholesale Buyer --</option>
                  {customers.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.firstName} {c.lastName} &bull; {c.profile?.companyName || c.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* Line Items */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                    Invoice Line Items
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs font-bold text-brand-green-700 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Item
                  </button>
                </div>

                {createForm.items.map((item, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                      <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                        Item #{idx + 1}
                      </span>
                      {createForm.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      {/* Product Select (Description) */}
                      <div className="sm:col-span-6 space-y-1">
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                          Select Product *
                        </label>
                        <select
                          value={item.productId || ""}
                          onChange={(e) => handleProductSelect(idx, e.target.value, item.unitType || "carton")}
                          className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-brand-green-500 outline-none"
                        >
                          <option value="">-- Choose Product --</option>
                          {products.map((p) => (
                            <option key={p.id || p._id} value={p.id || p._id}>
                              {p.name} ({p.category})
                            </option>
                          ))}
                        </select>
                        {/* Option for custom description if needed */}
                        {(!item.productId) && (
                          <input
                            type="text"
                            placeholder="Or type custom item description..."
                            value={item.description}
                            onChange={(e) => handleItemChange(idx, "description", e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-3 text-xs font-semibold mt-1 outline-none"
                            required
                          />
                        )}
                      </div>

                      {/* Packaging Unit (Carton vs Pieces) */}
                      <div className="sm:col-span-3 space-y-1">
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                          Packaging Unit *
                        </label>
                        <select
                          value={item.unitType || "carton"}
                          onChange={(e) => {
                            const newUnit = e.target.value;
                            if (item.productId) {
                              handleProductSelect(idx, item.productId, newUnit);
                            } else {
                              handleItemChange(idx, "unitType", newUnit);
                            }
                          }}
                          className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-brand-green-500 outline-none"
                        >
                          <option value="carton">Carton (CTN)</option>
                          <option value="pieces">Pieces (Pcs)</option>
                        </select>
                      </div>

                      {/* Quantity */}
                      <div className="sm:col-span-3 space-y-1">
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                          Quantity *
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-brand-green-500 outline-none"
                          required
                        />
                      </div>
                    </div>

                    {/* Auto Price & Subtotal */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase">Unit Price:</span>
                        <input
                          type="number"
                          min="0"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(idx, "unitPrice", e.target.value)}
                          className="w-24 bg-white border border-slate-200 rounded-lg py-1 px-2 text-xs font-bold text-slate-800 text-right outline-none focus:ring-1 focus:ring-brand-green-500"
                        />
                        <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">(Auto-filled)</span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Total:</span>
                        <span className="font-mono font-black text-brand-green-950 text-sm">
                          {formatCurrency((Number(item.quantity) || 1) * (Number(item.unitPrice) || 0))}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Financials: Discount, Delivery, Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                    Discount (₦)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={createForm.discount}
                    onChange={(e) => setCreateForm({ ...createForm, discount: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold focus:ring-2 focus:ring-brand-green-500 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                    Delivery Fee (₦)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={createForm.deliveryFee}
                    onChange={(e) => setCreateForm({ ...createForm, deliveryFee: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold focus:ring-2 focus:ring-brand-green-500 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                    Initial Status
                  </label>
                  <select
                    value={createForm.status}
                    onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold focus:ring-2 focus:ring-brand-green-500 outline-none"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Draft">Draft</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>
              </div>

              {/* Due Date & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                    Payment Due Date
                  </label>
                  <input
                    type="date"
                    value={createForm.dueDate}
                    onChange={(e) => setCreateForm({ ...createForm, dueDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold focus:ring-2 focus:ring-brand-green-500 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                    Invoice Terms / Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Special promo batch delivery"
                    value={createForm.notes}
                    onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold focus:ring-2 focus:ring-brand-green-500 outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={submitting}
                  className="rounded-xl"
                >
                  Generate Invoice
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoices;
