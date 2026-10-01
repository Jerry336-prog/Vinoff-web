import React, { useState, useEffect, useContext } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import api from "../../services/api";
import { createIdempotencyKey, withIdempotencyKey } from "../../services/idempotency";
import { formatCurrency } from "../../utils/formatCurrency";
import Badge from "../../components/ui/Badge";
import { AuthContext } from "../../context/AuthContext";
import {
  ArrowLeft,
  FileText,
  Download,
  Printer,
  ExternalLink,
  Pencil,
  Share2,
  Trash2,
  X,
  Plus,
  CheckCircle2,
} from "lucide-react";
import Button from "../../components/ui/Button";
import { downloadInvoicePDF, createInvoicePDFFile } from "../../utils/generatePDF";
import { useToast } from "../../context/ToastContext";
import { unwrapApiList, unwrapApiRecord } from "../../utils/apiResponse";

export const CustomerInvoiceDetails = () => {
  const { toast, showModal, showPrompt } = useToast();
  const { user } = useContext(AuthContext);
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdminView = location.pathname.startsWith("/admin");

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [editForm, setEditForm] = useState({
    items: [],
    discount: 0,
    deliveryFee: 0,
    notes: "",
    dueDate: "",
    status: "Pending",
  });

  const [products, setProducts] = useState([]);
  const [bankDetails, setBankDetails] = useState({
    bankName: "Guaranty Trust Bank (GTB)",
    accountName: "Vinoff Wholesales Ltd",
    accountNumber: "0123456789",
    instructions: "",
  });

  useEffect(() => {
    const fetchInvoice = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/api/invoices/${id}`);
        const data = unwrapApiRecord(res);
        const cachedStamp = localStorage.getItem(`vinoff_invoice_stamp_${id}`);
        if (cachedStamp && !data.issuedBy && !data.createdBy) {
          data.issuedBy = cachedStamp;
        }
        setInvoice(data);
      } catch (err) {
        setError(err.message || "Failed to load invoice");
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();

    api.get("/api/settings/bank-details")
      .then((res) => {
        const data = res.data?.data || res.data || res;
        if (data?.bankName) setBankDetails(data);
      })
      .catch(() => {});

    api.get("/api/products")
      .then((res) => setProducts(unwrapApiList(res) || []))
      .catch(console.error);
  }, [id]);

  const handleEditProductSelect = (index, selectedId, selectedUnitType = "carton") => {
    const product = products.find((p) => (p.id || p._id) === selectedId);
    setEditForm((prev) => {
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

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    if (!invoice) return;
    setDownloading(true);
    try {
      await downloadInvoicePDF(invoice);
    } catch (err) {
      // Toast error handled inside downloadInvoicePDF
    } finally {
      setDownloading(false);
    }
  };

  const handleConfirmAndStampInvoice = async () => {
    const adminName = user?.name || "Jerry Admin";

    try {
      setSaving(true);
      const res = await api.patch(
        `/api/invoices/${invoice._id || invoice.id}`,
        { status: "Paid", issuedBy: adminName },
        withIdempotencyKey(createIdempotencyKey(`invoice-paid-${invoice._id || invoice.id}`)),
      );

      const updatedRecord = unwrapApiRecord(res);

      try {
        localStorage.setItem(`vinoff_invoice_stamp_${invoice._id || invoice.id}`, adminName);
      } catch (e) {
        console.error(e);
      }

      const updated = {
        ...(invoice || {}),
        ...(updatedRecord || {}),
        status: "Paid",
        issuedBy: adminName,
        createdBy: {
          ...(invoice?.createdBy || {}),
          name: adminName,
          firstName: adminName,
        },
      };

      setInvoice(updated);
      toast.success(`Invoice marked as Paid & stamped by ${adminName}`, "Invoice Stamped & Saved");
    } catch (err) {
      toast.error(err.message || "Failed to stamp invoice", "Stamp Failed");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = () => {
    setEditForm({
      items: (invoice.items || []).map((item) => ({
        description: item.description || item.name || "",
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || item.price || 0,
        total: item.total || (Number(item.quantity || 1) * Number(item.unitPrice || item.price || 0)),
      })),
      discount: invoice.discount || 0,
      deliveryFee: 0,
      notes: invoice.notes || "",
      dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().slice(0, 10) : "",
      status: invoice.status || "Pending",
    });
    setIsEditOpen(true);
  };

  const updateEditItem = (index, field, value) => {
    setEditForm((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      const qty = Number(items[index].quantity) || 0;
      const price = Number(items[index].unitPrice) || 0;
      items[index].total = qty * price;
      return { ...prev, items };
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...editForm,
        discount: Number(editForm.discount) || 0,
        deliveryFee: 0,
        dueDate: editForm.dueDate || undefined,
        items: editForm.items.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity) || 1,
          unitPrice: Number(item.unitPrice) || 0,
          total: (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0),
        })),
      };
      const res = await api.patch(
        `/api/invoices/${invoice._id || invoice.id}`,
        payload,
        withIdempotencyKey(createIdempotencyKey(`invoice-edit-${invoice._id || invoice.id}`)),
      );
      setInvoice(unwrapApiRecord(res) || { ...invoice, ...payload });
      setIsEditOpen(false);
      toast.success("Invoice updated successfully.", "Invoice Saved");
    } catch (err) {
      toast.error(err.message || "Could not update invoice", "Update Failed");
    } finally {
      setSaving(false);
    }
  };

  const handleShareToChat = async () => {
    if (!invoice) return;
    const customerId = invoice.customer?._id || invoice.customer?.id || invoice.customerId || invoice.customer;
    if (!customerId) {
      toast.error("This invoice does not have a linked customer.", "Share Failed");
      return;
    }
    setSharing(true);
    try {
      const roomRes = await api.post(
        "/api/chats",
        { customerId },
        withIdempotencyKey(createIdempotencyKey(`invoice-chat-${invoice._id || invoice.id}`)),
      );
      const room = unwrapApiRecord(roomRes);
      const roomId = room?.roomId || room?._id || room?.id;
      if (!roomId) throw new Error("Chat room was not returned by the server.");

      let pdfFile = null;
      try {
        pdfFile = await createInvoicePDFFile(invoice);
      } catch (e) {
        console.warn("Could not create PDF file for attachment:", e);
      }

      const messageText = `Invoice ${invoice.invoiceNumber} is ready. Total payable: ${formatCurrency(invoice.total || invoice.totalAmount)}.`;

      if (pdfFile) {
        const formData = new FormData();
        formData.append("content", messageText);
        formData.append("text", messageText);
        formData.append("invoiceRef", invoice._id || invoice.id);
        formData.append("attachments", pdfFile);
        await api.post(
          `/api/chats/${roomId}/messages`,
          formData,
          withIdempotencyKey(createIdempotencyKey(`invoice-share-${invoice._id || invoice.id}`)),
        );
      } else {
        await api.post(
          `/api/chats/${roomId}/messages`,
          {
            text: messageText,
            content: messageText,
            invoiceRef: invoice._id || invoice.id,
            invoiceId: invoice._id || invoice.id,
          },
          withIdempotencyKey(createIdempotencyKey(`invoice-share-${invoice._id || invoice.id}`)),
        );
      }

      toast.success("Invoice shared to customer chat as PDF.", "Shared as PDF");
      navigate(`/admin/chats?room=${roomId}`);
    } catch (err) {
      toast.error(err.message || "Could not share invoice to chat", "Share Failed");
    } finally {
      setSharing(false);
    }
  };

  const handleDeleteInvoice = () => {
    showModal({
      title: "Delete Invoice",
      message: "This will delete this invoice from the admin invoice records.",
      confirmText: "Delete Invoice",
      cancelText: "Cancel",
      type: "warning",
      onConfirm: async () => {
        try {
          await api.delete(`/api/invoices/${invoice._id || invoice.id}`);
          toast.success("Invoice deleted.", "Deleted");
          navigate("/admin/invoices");
        } catch (err) {
          toast.error(err.message || "Could not delete invoice", "Delete Failed");
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="p-12 text-center bg-white border border-slate-200 rounded-3xl animate-pulse text-xs text-slate-400">
        Loading invoice document...
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm max-w-md mx-auto my-12">
        <FileText className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">Invoice Not Found</h3>
        <p className="text-xs text-slate-500 mt-1">{error || "Could not retrieve invoice."}</p>
        <Button className="mt-4 rounded-xl" onClick={() => navigate(isAdminView ? "/admin/invoices" : "/invoices")}>
          Back to Invoices
        </Button>
      </div>
    );
  }

  const cachedStamp = invoice ? localStorage.getItem(`vinoff_invoice_stamp_${invoice._id || invoice.id}`) : null;

  const adminIssuerName =
    invoice?.issuedBy ||
    cachedStamp ||
    (typeof invoice?.createdBy === "object"
      ? (invoice?.createdBy?.name || `${invoice?.createdBy?.firstName || ""} ${invoice?.createdBy?.lastName || ""}`.trim())
      : invoice?.createdBy);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <Link
          to={isAdminView ? "/admin/invoices" : "/invoices"}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-brand-green-700 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Invoices
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {isAdminView && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleConfirmAndStampInvoice}
                isLoading={saving}
                icon={CheckCircle2}
                className="rounded-xl border-brand-green-200 text-brand-green-800 bg-brand-green-50 hover:bg-brand-green-100 text-xs py-1.5 px-3"
              >
                Stamp &amp; Save
              </Button>
              <Button variant="outline" size="sm" onClick={openEdit} icon={Pencil} className="rounded-xl text-xs py-1.5 px-3">
                Edit
              </Button>
              <Button variant="outline" size="sm" onClick={handleShareToChat} isLoading={sharing} icon={Share2} className="rounded-xl text-xs py-1.5 px-3">
                Share to Chat
              </Button>
              <Button variant="danger" size="sm" onClick={handleDeleteInvoice} icon={Trash2} className="rounded-xl text-xs py-1.5 px-3">
                Delete
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            icon={Printer}
            className="rounded-xl text-xs py-1.5 px-3 hidden sm:inline-flex"
          >
            Print
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleDownload}
            isLoading={downloading}
            icon={Download}
            className="rounded-xl text-xs py-1.5 px-3"
          >
            Download PDF
          </Button>
        </div>
      </div>

      {/* Invoice Document Paper */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-8 md:p-12 shadow-sm space-y-6 sm:space-y-8 relative overflow-hidden print:border-none print:shadow-none print:p-0">
        {/* Invoice Watermark Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none opacity-[0.06] -rotate-12 z-10 overflow-hidden">
          <p className="text-xl sm:text-4xl font-black text-brand-green-800 tracking-widest uppercase text-center leading-tight">
            VINOFF &amp; CO.NIG.LTD
          </p>
          <p className="text-lg sm:text-3xl font-black text-brand-green-800 tracking-widest uppercase text-center leading-tight mt-3">
            VINOFF &amp; CO.NIG.LTD
          </p>
        </div>

        {/* Document Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 sm:gap-6 border-b-2 border-brand-green-800 pb-6 sm:pb-8 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 sm:gap-3">
              <img src="/VinoffLogo.webp" alt="Vinoff Logo" className="w-10 h-10 sm:w-14 sm:h-14 object-contain shrink-0" />
              <span className="text-lg sm:text-xl font-black text-brand-green-950 tracking-tight">
                VINOFF <span className="text-brand-green-600">WHOLESALE</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2 font-medium">
              Commercial Toiletries, Sanitizers & Industrial Detergents
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Email: sales@vinoff.com &bull; Tel: +234 80 1234 5678
            </p>
          </div>

          <div className="text-left sm:text-right space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              COMMERCIAL INVOICE
            </h2>
            <p className="font-mono font-bold text-sm sm:text-base text-brand-green-800">
              #{invoice.invoiceNumber}
            </p>
            <div className="pt-1">
              <Badge status={invoice.status} className="text-xs font-bold" />
            </div>
            <p className="text-xs text-slate-500 pt-1">
              Issued: {new Date(invoice.createdAt).toLocaleDateString()}
            </p>
            {invoice.dueDate && (
              <p className="text-xs text-slate-500">
                Payment Due: {new Date(invoice.dueDate).toLocaleDateString()}
              </p>
            )}

            <div className="pt-1 text-xs font-semibold">
              {adminIssuerName ? (
                <p className="font-extrabold text-brand-green-800">
                  Issued by: <span className="underline">{adminIssuerName}</span>
                </p>
              ) : (
                <div className="flex items-center justify-start sm:justify-end gap-1 text-slate-500">
                  <span>Issued by:</span>
                  <span className="w-24 border-b border-dashed border-slate-300 inline-block text-[10px] text-slate-400 text-center">
                    [Unconfirmed]
                  </span>
                  {isAdminView && (
                    <button
                      onClick={handleConfirmAndStampInvoice}
                      className="ml-1 text-[10px] bg-brand-green-50 text-brand-green-800 border border-brand-green-200 px-2 py-0.5 rounded-md font-bold hover:bg-brand-green-100 transition print:hidden"
                    >
                      Stamp Admin
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Billed To / Shipping Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 bg-slate-50 rounded-2xl p-4 sm:p-6 border border-slate-100">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
              Billed To Customer
            </span>
            <p className="text-sm font-bold text-slate-800">
              {invoice.customer?.firstName} {invoice.customer?.lastName}
            </p>
            {invoice.customer?.profile?.companyName && (
              <p className="text-xs font-semibold text-brand-green-700 mt-0.5">
                {invoice.customer.profile.companyName}
              </p>
            )}
            <p className="text-xs text-slate-500 mt-1">{invoice.customer?.email}</p>
            <p className="text-xs text-slate-500">{invoice.customer?.phone}</p>
          </div>

          <div className="sm:text-right">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
              Order Reference
            </span>
            {invoice.order ? (
              <div>
                <p className="text-xs font-mono font-bold text-slate-800">
                  {invoice.order.orderNumber || "Linked Order"}
                </p>
                <Link
                  to={isAdminView ? "/admin/orders" : `/orders/${invoice.order._id || invoice.order}`}
                  className="text-xs font-bold text-brand-green-700 hover:underline mt-1 inline-flex items-center gap-1 print:hidden"
                >
                  View Order Details <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Direct Admin Invoice</p>
            )}
          </div>
        </div>

        {/* Invoice Line Items */}
        <div className="overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
          <table className="w-full text-left text-xs min-w-[500px]">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-black uppercase tracking-wider">
                <th className="py-3 px-2">Description</th>
                <th className="py-3 px-3 sm:px-4 text-center">Quantity</th>
                <th className="py-3 px-3 sm:px-4 text-right">Unit Price</th>
                <th className="py-3 px-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {(invoice.items || []).map((item, idx) => {
                const rawDescription = item.description || item.name || "Commercial Item";
                let baseName = rawDescription.replace(/\s*\((CTN|Pieces|ctn|pieces|Units|units)\)\s*$/i, "").trim();

                const isPiece =
                  item.isCarton === false ||
                  item.unitType === "pieces" ||
                  item.unitType === "units" ||
                  item.unit === "pieces" ||
                  item.unit === "units" ||
                  item.isPieces === true ||
                  /\(Pieces\)/i.test(rawDescription);

                const tag = isPiece ? "(Pieces)" : "(CTN)";
                const formattedDescription = `${baseName} ${tag}`;
                const unitPrice = Number(item.unitPrice || item.price || 0);

                return (
                  <tr key={idx}>
                    <td className="py-3.5 px-2">
                      <p className="font-bold text-slate-900 leading-tight">{formattedDescription}</p>
                    </td>
                    <td className="py-3.5 px-3 sm:px-4 text-center text-slate-600 font-mono font-bold">
                      {item.quantity}
                    </td>
                    <td className="py-3.5 px-3 sm:px-4 text-right text-slate-600 font-mono font-bold">
                      {formatCurrency(unitPrice)}
                    </td>
                    <td className="py-3.5 px-2 text-right font-black text-slate-900 font-mono">
                      {formatCurrency(item.total || (item.quantity * unitPrice))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 sm:gap-6 pt-4 border-t border-slate-100">
          <div className="max-w-xs text-xs text-slate-500 space-y-1">
            <strong className="block text-[10px] uppercase text-slate-400 font-bold mb-1">
              Payment Information
            </strong>
            <p>Account Name: {bankDetails.accountName}</p>
            <p>Bank: {bankDetails.bankName}</p>
            <p>Account Number: {bankDetails.accountNumber}</p>
            {bankDetails.instructions && (
              <p className="pt-1 text-slate-600 italic">{bankDetails.instructions}</p>
            )}
            {invoice.notes && (
              <p className="pt-2 text-slate-600 italic">Notes: {invoice.notes}</p>
            )}
          </div>

          <div className="w-full sm:w-64 space-y-2 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal:</span>
              <span className="font-semibold text-slate-800">{formatCurrency(invoice.subtotal)}</span>
            </div>
            {Number(invoice.discount) > 0 && (
              <div className="flex justify-between text-red-600 font-semibold">
                <span>Discount:</span>
                <span>-{formatCurrency(invoice.discount)}</span>
              </div>
            )}
            {Number(invoice.deliveryFee) > 0 && (
              <div className="flex justify-between text-slate-500">
                <span>Delivery Fee:</span>
                <span className="font-semibold text-slate-800">{formatCurrency(invoice.deliveryFee)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-black text-brand-green-950 pt-3 border-t-2 border-brand-green-800">
              <span>Total Payable:</span>
              <span>{formatCurrency(invoice.total || invoice.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-8 border-t border-slate-100 text-center text-[11px] text-slate-400">
          Thank you for your business. For billing queries, please contact your Vinoff account administrator.
        </div>
      </div>

      {isAdminView && isEditOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto print:hidden">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">Edit Invoice</h3>
                <p className="text-xs text-slate-500 mt-0.5">{invoice.invoiceNumber}</p>
              </div>
              <button onClick={() => setIsEditOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">Line Items</label>
                  <button
                    type="button"
                    onClick={() => setEditForm((prev) => ({
                      ...prev,
                      items: [...prev.items, { description: "", quantity: 1, unitPrice: 0, total: 0 }],
                    }))}
                    className="text-xs font-bold text-brand-green-700 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Item
                  </button>
                </div>
                {editForm.items.map((item, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                      <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                        Item #{idx + 1}
                      </span>
                      {editForm.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setEditForm((prev) => ({
                            ...prev,
                            items: prev.items.filter((_, itemIndex) => itemIndex !== idx),
                          }))}
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
                          onChange={(e) => handleEditProductSelect(idx, e.target.value, item.unitType || "carton")}
                          className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-brand-green-500 outline-none"
                        >
                          <option value="">-- Choose Product --</option>
                          {products.map((p) => (
                            <option key={p.id || p._id} value={p.id || p._id}>
                              {p.name} ({p.category})
                            </option>
                          ))}
                        </select>
                        {(!item.productId) && (
                          <input
                            type="text"
                            placeholder="Description..."
                            value={item.description}
                            onChange={(e) => updateEditItem(idx, "description", e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-3 text-xs font-semibold mt-1 outline-none"
                            required
                          />
                        )}
                      </div>

                      {/* Packaging Unit (Carton vs Pieces) */}
                      <div className="sm:col-span-3 space-y-1">
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                          Unit Type *
                        </label>
                        <select
                          value={item.unitType || "carton"}
                          onChange={(e) => {
                            const newUnit = e.target.value;
                            if (item.productId) {
                              handleEditProductSelect(idx, item.productId, newUnit);
                            } else {
                              updateEditItem(idx, "unitType", newUnit);
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
                          onChange={(e) => updateEditItem(idx, "quantity", e.target.value)}
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
                          onChange={(e) => updateEditItem(idx, "unitPrice", e.target.value)}
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input type="number" min="0" value={editForm.discount} onChange={(e) => setEditForm({ ...editForm, discount: e.target.value })} placeholder="Discount" className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-green-500" />
                <input type="date" value={editForm.dueDate} onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-green-500" />
                <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-green-500">
                  <option>Draft</option>
                  <option>Pending</option>
                  <option>Paid</option>
                  <option>Cancelled</option>
                </select>
              </div>
              <input value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} placeholder="Notes" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-green-500" />
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <Button size="sm" variant="outline" onClick={() => setIsEditOpen(false)} className="rounded-xl">Cancel</Button>
                <Button size="sm" type="submit" isLoading={saving} className="rounded-xl">Save Invoice</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerInvoiceDetails;
