import React, { useState, useEffect, useContext, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import { formatCurrency } from "../../utils/formatCurrency";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import ExportButton from "../../components/exports/ExportButton";
import { downloadInvoicePDF } from "../../utils/generatePDF";
import { unwrapApiList } from "../../utils/apiResponse";
import { fetchInvoiceForExport, hasInvoiceStamp, isInvoiceStampRequiredError, showInvoiceStampNotice } from '../../services/invoice/downloadAccess';
import { showModal } from '../../services/ui/modal';
import {
  CreditCard,
  FileText,
  Download,
  Printer,
  Eye,
  MessageSquare,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Search,
  ShieldCheck,
} from "lucide-react";

export const CreditInvoices = () => {
  const { user, refreshUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [tabFilter, setTabFilter] = useState("active"); // "active" | "settled" | "all"
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchCreditInvoices = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get("/api/invoices?limit=100");
      const allInvoices = unwrapApiList(res);
      const list = Array.isArray(allInvoices) ? allInvoices : [];
      setInvoices(list);
      if (refreshUser && !silent) {
        refreshUser().catch(() => {});
      }
    } catch (err) {
      console.error("Failed to fetch credit invoices:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreditInvoices();
    const refresh = () => { if (document.visibilityState === 'visible') fetchCreditInvoices(true); };
    const timer = window.setInterval(refresh, 15000);
    window.addEventListener('focus', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, []);

  // Credit invoices are those marked isCredit === true OR status === "On Credit"
  const allCreditInvoices = useMemo(() => {
    return invoices.filter(
      (inv) => inv.isCredit === true || inv.status === "On Credit"
    );
  }, [invoices]);

  const activeCreditInvoices = useMemo(() => {
    return allCreditInvoices.filter(
      (inv) => inv.status !== "Paid" && inv.status !== "Cancelled"
    );
  }, [allCreditInvoices]);

  const settledCreditInvoices = useMemo(() => {
    return allCreditInvoices.filter((inv) => inv.status === "Paid");
  }, [allCreditInvoices]);

  const totalOutstandingCredit = useMemo(() => {
    return activeCreditInvoices.reduce(
      (sum, inv) => sum + Number(inv.total || inv.totalAmount || 0),
      0
    );
  }, [activeCreditInvoices]);

  const totalSettledCredit = useMemo(() => {
    return settledCreditInvoices.reduce(
      (sum, inv) => sum + Number(inv.total || inv.totalAmount || 0),
      0
    );
  }, [settledCreditInvoices]);

  const displayedInvoices = useMemo(() => {
    const baseList =
      tabFilter === "active"
        ? activeCreditInvoices
        : tabFilter === "settled"
        ? settledCreditInvoices
        : allCreditInvoices;

    if (!searchTerm.trim()) return baseList;
    const term = searchTerm.toLowerCase();
    return baseList.filter(
      (inv) =>
        inv.invoiceNumber?.toLowerCase().includes(term) ||
        inv.order?.orderNumber?.toLowerCase().includes(term) ||
        inv.items?.some((i) =>
          (i.description || i.name || "").toLowerCase().includes(term)
        )
    );
  }, [tabFilter, activeCreditInvoices, settledCreditInvoices, allCreditInvoices, searchTerm]);

  const handleDownload = async (e, inv) => {
    e.stopPropagation();
    const invId = inv._id || inv.id;
    setDownloadingId(invId);
    try {
      await downloadInvoicePDF(inv);
    } catch (err) {
      // Handled inside downloadInvoicePDF
    } finally {
      setDownloadingId(null);
    }
  };

  const handlePrint = async (e, inv) => {
    e.stopPropagation();
    try {
      await fetchInvoiceForExport(inv);
    } catch (err) {
      if (isInvoiceStampRequiredError(err)) await showInvoiceStampNotice();
      else await showModal({ title: 'Print Failed', message: err.message || 'Could not prepare invoice for printing.', tone: 'danger' });
      return;
    }
    const invId = inv._id || inv.id;
    navigate(`/invoices/${invId}`);
    setTimeout(() => {
      window.print();
    }, 600);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Link
            to="/shop"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-brand-green-700 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-2xs transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Store
          </Link>
          <Link
            to="/invoices"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-brand-green-700 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-2xs transition"
          >
            <FileText className="w-4 h-4 text-brand-green-600" />
            Regular Invoices History
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(user?._id || user?.id) && (
            <ExportButton
              key={user._id || user.id}
              kind="credit-invoices"
              customerId={user._id || user.id}
              customerName={user.name}
              label="Export Credit Invoices"
              defaultFormat="zip"
            />
          )}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold w-fit">
            <span>VIP Credit Partner Facility</span>
          </div>
        </div>
      </div>

      {/* Clean Corporate Credit Ledger Header Card (No Gradients) */}
      <div className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-bold text-brand-green-700 uppercase tracking-wider">
              <CreditCard className="w-4 h-4" />
              <span>{user?.businessName || user?.name} &bull; Credit Statement</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              VIP Credit Facility &amp; Invoices
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Your total outstanding credit is calculated across all active credit invoices below. Once an invoice is settled and confirmed by Admin, its amount is automatically deducted from your credit balance and archived in your regular invoices history.
            </p>
          </div>

          {/* Total Outstanding Credit Summary Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 min-w-[260px] space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Total Outstanding Credit
              </span>
              {totalOutstandingCredit > 0 ? (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                  Owing Balance
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Cleared
                </span>
              )}
            </div>
            <p
              className={`text-2xl sm:text-3xl font-black tracking-tight font-mono ${
                totalOutstandingCredit > 0 ? "text-rose-600" : "text-slate-900"
              }`}
            >
              {formatCurrency(totalOutstandingCredit)}
            </p>
            <p className="text-[11px] text-slate-500">
              Across <strong className="text-slate-800">{activeCreditInvoices.length}</strong> active credit invoice(s)
            </p>
          </div>
        </div>

        {/* 3 Clean Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                Active Unpaid Credit
              </p>
              <p
                className={`text-lg font-black mt-0.5 font-mono ${
                  totalOutstandingCredit > 0 ? "text-rose-600" : "text-slate-900"
                }`}
              >
                {formatCurrency(totalOutstandingCredit)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                Settled &amp; Deducted Credit
              </p>
              <p className="text-lg font-black text-emerald-700 mt-0.5 font-mono">
                {formatCurrency(totalSettledCredit)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                Total Credit Invoices Issued
              </p>
              <p className="text-lg font-black text-slate-900 mt-0.5">
                {allCreditInvoices.length} Invoice(s)
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
              <FileText className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar & Search */}
      <div className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-2xl p-3.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setTabFilter("active")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              tabFilter === "active"
                ? "bg-brand-green-700 text-white"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <span>Active Credit Invoices</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                tabFilter === "active"
                  ? "bg-white/20 text-white"
                  : "bg-rose-100 text-rose-800"
              }`}
            >
              {activeCreditInvoices.length}
            </span>
          </button>

          <button
            onClick={() => setTabFilter("settled")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              tabFilter === "settled"
                ? "bg-brand-green-700 text-white"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <span>Settled History (Deducted)</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                tabFilter === "settled"
                  ? "bg-white/20 text-white"
                  : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {settledCreditInvoices.length}
            </span>
          </button>

          <button
            onClick={() => setTabFilter("all")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              tabFilter === "all"
                ? "bg-brand-green-700 text-white"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            All Credit Records ({allCreditInvoices.length})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Search credit invoice # or item..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-brand-green-500 outline-none"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2" aria-label="Approved credit allowance">{[['Approved Credit Limit', Number(user?.creditLimit || 0)], ['Available Credit', Math.max(0, Number(user?.creditLimit || 0) - Number(user?.outstandingCredit || 0))]].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">{formatCurrency(value)}</p></div>)}</section>
      {/* Credit Invoices List */}
      {loading ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl animate-pulse text-xs text-slate-500 shadow-2xs">
          Syncing VIP credit invoices...
        </div>
      ) : displayedInvoices.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-2xs space-y-3">
          <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-600">
            <CreditCard className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            {tabFilter === "active"
              ? "No Outstanding Credit Invoices"
              : "No Credit Invoices Found"}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            {tabFilter === "active"
              ? "You currently have ₦0 in unpaid credit invoices. When you place an order using your VIP Credit Facility at checkout, each invoice will appear here and total up in your header."
              : "No credit invoices match your current filter."}
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Button
              size="sm"
              variant="primary"
              onClick={() => navigate("/shop")}
              className="rounded-xl"
            >
              Browse Wholesale Catalog
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("/invoices")}
              className="rounded-xl"
            >
              View All Invoices History
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3.5">
          {displayedInvoices.map((inv, index) => {
            const invId = inv._id || inv.id;
            const amount = Number(inv.total || inv.totalAmount || 0);
            const isPaid = inv.status === "Paid";
            const orderId = inv.order?._id || inv.order?.id || inv.order;
            const orderNumber = inv.order?.orderNumber;

            return (
              <div
                key={invId}
                onClick={() => navigate(`/invoices/${invId}`)}
                className="group bg-white hover:bg-slate-50/60 border border-slate-200 hover:border-brand-green-400 rounded-2xl p-5 shadow-2xs transition-all cursor-pointer"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Invoice Identity & Items Breakdown */}
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-brand-green-900 text-brand-yellow-400 text-[11px] font-black">
                        #{index + 1}
                      </span>
                      <span className="font-mono font-black text-base text-slate-900">
                        {inv.invoiceNumber}
                      </span>
                      <Badge
                        status={isPaid ? "Paid" : "On Credit"}
                        className="text-[10px]"
                      />
                      {isPaid && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Deducted from Credit &bull; Archived in History
                        </span>
                      )}
                      {orderNumber && (
                        <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-lg">
                          Order #{orderNumber}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                      <span>
                        Issued: <strong className="text-slate-700">{new Date(inv.createdAt).toLocaleDateString()}</strong>
                      </span>
                      <span>
                        Due: <strong className="text-slate-700">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "VIP Credit Terms"}</strong>
                      </span>
                      <span>
                        Items: <strong className="text-slate-700">{inv.items?.length || 0} line item(s)</strong>
                      </span>
                      {inv.creditSettledAt && (
                        <span className="text-emerald-700 font-bold">
                          Settled on: {new Date(inv.creditSettledAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {/* Preview of Items on this Credit Invoice */}
                    {Array.isArray(inv.items) && inv.items.length > 0 && (
                      <div className="pt-1 flex flex-wrap gap-1.5">
                        {inv.items.slice(0, 4).map((item, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold bg-slate-100/90 text-slate-700 border border-slate-200/70 px-2.5 py-1 rounded-xl"
                          >
                            <strong>{item.quantity}&times;</strong> {item.description || item.name}
                          </span>
                        ))}
                        {inv.items.length > 4 && (
                          <span className="text-[11px] font-bold text-slate-400 px-2 py-1">
                            +{inv.items.length - 4} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right: Credit Amount on this Invoice & Full Regular Actions */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-3 border-t lg:border-t-0 border-slate-200/60 pt-3 lg:pt-0 shrink-0">
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                        {isPaid ? "Settled Credit Amount" : "Credit on this Invoice"}
                      </span>
                      <p
                        className={`text-xl sm:text-2xl font-black font-mono ${
                          isPaid ? "text-emerald-700 line-through decoration-emerald-400/60" : "text-rose-700"
                        }`}
                      >
                        {formatCurrency(amount)}
                      </p>
                    </div>

                    {/* Full Regular Invoice Actions: View, Download PDF, Print, Settle/Chat */}
                    <div
                      className="flex flex-wrap items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        size="sm"
                        variant="outline"
                        icon={Eye}
                        onClick={() => navigate(`/invoices/${invId}`)}
                        className="rounded-xl text-xs py-1.5 px-3 bg-white/90 hover:bg-white"
                      >
                        View Invoice
                      </Button>

                      <Button
                        size="sm"
                        variant="primary"
                        icon={Download}
                        isLoading={downloadingId === invId}
                        disabled={!hasInvoiceStamp(inv)}
                        onClick={(e) => handleDownload(e, inv)}
                        className="rounded-xl text-xs py-1.5 px-3"
                      >
                        Download PDF
                      </Button>

                      <button
                        type="button"
                        onClick={(e) => handlePrint(e, inv)}
                        disabled={!hasInvoiceStamp(inv)}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                        title="Print Invoice"
                      >
                        <Printer className="w-4 h-4" />
                      </button>

                      {!isPaid && orderId && (
                        <button
                          type="button"
                          onClick={() => navigate(`/orders/${orderId}`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition"
                          title="Pay with Paystack to Settle Credit"
                        >
                          <CreditCard className="w-3.5 h-3.5 text-amber-700" />
                          <span>Settle / Pay</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          navigate(orderId ? `/chat?orderId=${orderId}` : "/chat")
                        }
                        className="p-2 rounded-xl bg-brand-green-50 hover:bg-brand-green-100 text-brand-green-800 border border-brand-green-200 transition"
                        title="Message Admin about this Credit Invoice"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CreditInvoices;
