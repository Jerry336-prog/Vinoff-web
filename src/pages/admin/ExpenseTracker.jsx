import React, { useState, useEffect, useContext } from "react";
import api from "../../services/api";
import { formatCurrency } from "../../utils/formatCurrency";
import Button from "../../components/ui/Button";
import { useToast } from "../../context/ToastContext";
import { AuthContext } from "../../context/AuthContext";
import { unwrapApiRecord, unwrapApiList } from "../../utils/apiResponse";
import { downloadExpenseEvidencePDF } from "../../utils/generatePDF";
import {
  Wallet,
  Plus,
  Trash2,
  CheckCircle,
  Calendar,
  History,
  Stamp,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Lock,
  ChevronRight,
  FileSpreadsheet,
  Download,
  FileText,
  ExternalLink,
  Image as ImageIcon,
  UploadCloud,
  Eye,
  Paperclip,
  X,
  RefreshCw,
} from "lucide-react";

export const ExpenseTracker = () => {
  const { toast, showModal } = useToast();
  const { user } = useContext(AuthContext);

  const [ledger, setLedger] = useState(null);
  const [historyLedgers, setHistoryLedgers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeView, setActiveView] = useState("today"); // 'today' | 'history'

  // Selected Day Details Modal State
  const [selectedHistoryLedger, setSelectedHistoryLedger] = useState(null);
  const [loadingDayDetails, setLoadingDayDetails] = useState(false);
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);

  // Form states for line item
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("expense"); // 'expense' | 'income'
  const [isSubmittingItem, setIsSubmittingItem] = useState(false);

  // Form state for opening balance (if zero / edit)
  const [openingBalanceInput, setOpeningBalanceInput] = useState("");
  const [isUpdatingOpening, setIsUpdatingOpening] = useState(false);
  const [isClosingDay, setIsClosingDay] = useState(false);

  const handleOpenDayDetails = async (historyItem) => {
    setSelectedHistoryLedger(historyItem);
    setLoadingDayDetails(true);
    try {
      const dateStr = historyItem.date ? historyItem.date.split("T")[0] : historyItem.date;
      const res = await api.get(`/api/admin/expenses/day/${dateStr}`);
      const dayData = res.data?.ledger || res.data?.data || res.data;
      if (dayData) {
        setSelectedHistoryLedger(dayData);
      }
    } catch (err) {
      console.warn("Could not refetch day ledger details, using cached record:", err);
    } finally {
      setLoadingDayDetails(false);
    }
  };

  const handleDownloadPDF = async (targetLedger) => {
    if (!targetLedger) return;
    setIsDownloadingPDF(true);
    try {
      await downloadExpenseEvidencePDF(targetLedger);
    } catch (err) {
      toast.error(err.message || "Failed to download evidence PDF", "Download Error");
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  const handleUploadEvidence = async (e, dateStr) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingEvidence(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("evidence", files[i]);
    }

    try {
      const targetDate = dateStr ? dateStr.split("T")[0] : "";
      const endpoint = targetDate
        ? `/api/admin/expenses/${targetDate}/evidence`
        : `/api/admin/expenses/evidence`;
      const res = await api.post(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const updatedLedger = res.data?.ledger || res.data?.data;
      if (updatedLedger) {
        if (selectedHistoryLedger) {
          setSelectedHistoryLedger(updatedLedger);
        }
        if (activeView === "today") {
          setLedger(updatedLedger);
        }
      }
      toast.success("Receipt / evidence file uploaded successfully", "Upload Complete");
    } catch (err) {
      toast.error(err.message || "Failed to upload evidence receipt", "Upload Error");
    } finally {
      setUploadingEvidence(false);
    }
  };

  const fetchTodayLedger = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/admin/expenses/today");
      const record = unwrapApiRecord(res);
      setLedger(record);
      if (record?.openingBalance !== undefined) {
        setOpeningBalanceInput(record.openingBalance.toString());
      }
    } catch (err) {
      console.error("Failed to load today's expense ledger:", err);
      toast.error("Could not fetch expense tracker data", "Error");
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get("/api/admin/expenses/history");
      setHistoryLedgers(unwrapApiList(res));
    } catch (err) {
      console.error("Failed to fetch expense history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayLedger();
  }, []);

  const handleAddLineItem = async (e) => {
    e.preventDefault();
    if (!description.trim() || !amount || Number(amount) <= 0) {
      toast.error("Please enter a valid description and positive amount", "Validation Error");
      return;
    }

    setIsSubmittingItem(true);
    try {
      const res = await api.post("/api/admin/expenses/item", {
        description: description.trim(),
        amount: Number(amount),
        type,
      });
      const updated = unwrapApiRecord(res);
      setLedger(updated);
      setDescription("");
      setAmount("");
      toast.success(
        `${type === "expense" ? "Expense" : "Income"} item added to today's ledger`,
        "Item Recorded"
      );
    } catch (err) {
      toast.error(err.message || "Failed to add entry", "Error");
    } finally {
      setIsSubmittingItem(false);
    }
  };

  const handleRemoveItem = (itemId) => {
    showModal({
      title: "Remove Entry",
      message: "Are you sure you want to remove this line item from today's ledger?",
      confirmText: "Yes, Remove",
      cancelText: "Cancel",
      type: "warning",
      onConfirm: async () => {
        try {
          const res = await api.delete(`/api/admin/expenses/item/${itemId}`);
          const updated = unwrapApiRecord(res);
          setLedger(updated);
          toast.success("Line item removed successfully", "Removed");
        } catch (err) {
          toast.error(err.message || "Failed to remove item", "Error");
        }
      },
    });
  };

  const handleCloseAndStamp = () => {
    const adminName = user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "Admin";

    showModal({
      title: "Close & Stamp Day Ledger",
      message: `You are about to close today's ledger and stamp it as Verified & Approved by ${adminName}. Closed ledgers are locked for records. Do you wish to proceed?`,
      confirmText: "Stamp & Save Ledger",
      cancelText: "Cancel",
      type: "info",
      onConfirm: async () => {
        setIsClosingDay(true);
        try {
          const res = await api.post("/api/admin/expenses/close", {});
          const updated = unwrapApiRecord(res);
          setLedger(updated);
          toast.success(`Ledger officially closed and stamped by ${adminName}`, "Ledger Stamped");
        } catch (err) {
          toast.error(err.message || "Failed to close ledger", "Error");
        } finally {
          setIsClosingDay(false);
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="p-12 text-center bg-white border border-slate-200 rounded-3xl animate-pulse text-xs text-slate-400">
        Loading Daily Expense Tracker...
      </div>
    );
  }

  const isClosed = ledger?.status === "closed";
  const lineItems = ledger?.lineItems || [];
  const expensesList = lineItems.filter((i) => i.type === "expense");
  const incomeList = lineItems.filter((i) => i.type === "income");

  return (
    <div className="space-y-5 sm:space-y-6 max-w-6xl mx-auto pb-12 px-1 sm:px-0">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white border border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-3.5 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-brand-green-600/30 border border-brand-green-500/40 text-brand-green-400 rounded-2xl flex items-center justify-center shrink-0 shadow-xs">
              <Wallet className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-2xl font-black tracking-tight text-white">
                  Daily Expense Tracker & Ledger
                </h1>
                <span
                  className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 ${
                    isClosed
                      ? "bg-slate-800 text-emerald-400 border border-emerald-500/30"
                      : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse"
                  }`}
                >
                  {isClosed ? (
                    <>
                      <Lock className="w-3 h-3 text-emerald-400" />
                      <span>Closed & Stamped</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3 h-3 text-emerald-300" />
                      <span>Active Today</span>
                    </>
                  )}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Log daily business expenses, opening cash balance, income entries, and approve final closing ledger.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center w-full sm:w-auto gap-2 shrink-0">
            <button
              onClick={() => {
                setActiveView("today");
              }}
              className={`px-3.5 py-2.5 text-xs font-bold rounded-xl transition text-center ${
                activeView === "today"
                  ? "bg-brand-green-600 text-white shadow-sm"
                  : "bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700"
              }`}
            >
              Today's Sheet
            </button>
            <button
              onClick={() => {
                setActiveView("history");
                fetchHistory();
              }}
              className={`px-3.5 py-2.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
                activeView === "history"
                  ? "bg-brand-green-600 text-white shadow-sm"
                  : "bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700"
              }`}
            >
              <History className="w-3.5 h-3.5" /> Past Ledgers
            </button>
            {activeView === "today" && ledger && (
              <button
                type="button"
                disabled={isDownloadingPDF}
                onClick={() => handleDownloadPDF(ledger)}
                className="px-3.5 py-2.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-white disabled:opacity-50 shadow-sm"
                title="Download today's daily expense statement as PDF"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isDownloadingPDF ? "Downloading..." : "Download Daily PDF"}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {activeView === "today" && (
        <>
          {/* Top Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                Opening Balance
              </span>
              <p className="text-lg sm:text-xl font-black text-slate-900 mt-1 truncate">
                {formatCurrency(ledger?.openingBalance || 0)}
              </p>
              <span className="text-[10px] text-slate-400 mt-1 block">Carried over or initial balance</span>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
              <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider block flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5" /> Total Income
              </span>
              <p className="text-lg sm:text-xl font-black text-emerald-700 mt-1 truncate">
                +{formatCurrency(ledger?.totalIncome || 0)}
              </p>
              <span className="text-[10px] text-slate-400 mt-1 block">{incomeList.length} entry(ies)</span>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
              <span className="text-[10px] font-extrabold text-red-600 uppercase tracking-wider block flex items-center gap-1">
                <ArrowDownRight className="w-3.5 h-3.5" /> Total Expenses
              </span>
              <p className="text-lg sm:text-xl font-black text-red-700 mt-1 truncate">
                -{formatCurrency(ledger?.totalExpenses || 0)}
              </p>
              <span className="text-[10px] text-slate-400 mt-1 block">{expensesList.length} entry(ies)</span>
            </div>

            <div className="col-span-2 lg:col-span-1 bg-gradient-to-br from-brand-green-950 to-slate-900 text-white border border-brand-green-900 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-extrabold text-brand-yellow-400 uppercase tracking-wider block">
                Closing Balance
              </span>
              <p className="text-xl sm:text-2xl font-black text-white mt-1 truncate">
                {formatCurrency(ledger?.closingBalance || 0)}
              </p>
              <span className="text-[10px] text-slate-400 mt-1 block">Opening + Income - Expenses</span>
            </div>
          </div>

          {/* Admin Stamp & Lock Banner if Closed */}
          {isClosed ? (
            <div className="bg-emerald-50 border-2 border-emerald-300/80 rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-md">
                  <Stamp className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-emerald-950 flex items-center gap-2">
                    OFFICIALLY STAMPED & VERIFIED BY ADMIN
                  </h3>
                  <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
                    Stamped by: <strong className="font-extrabold text-emerald-950">{ledger?.stampedByAdmin || "Admin"}</strong> on{" "}
                    {new Date(ledger?.stampedAt || ledger?.updatedAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-900 bg-white border border-emerald-300 px-3.5 py-2 rounded-xl shadow-2xs w-full sm:w-auto text-center">
                Ledger Finalized & Locked
              </span>
            </div>
          ) : (
            <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
                  <Stamp className="w-4 h-4 text-brand-green-600" /> Admin Approval & Stamp
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Once all day transactions are logged, click "Stamp & Save Ledger" to record your admin identity ({user?.firstName} {user?.lastName}) and lock today's totals.
                </p>
              </div>
              <Button
                onClick={handleCloseAndStamp}
                isLoading={isClosingDay}
                className="w-full sm:w-auto bg-brand-green-600 hover:bg-brand-green-700 text-white rounded-xl text-xs font-bold px-5 py-2.5 shrink-0 shadow-xs flex items-center justify-center gap-2"
              >
                <Stamp className="w-4 h-4" /> Stamp & Save Today's Ledger
              </Button>
            </div>
          )}

          {/* Form to Add Entry */}
          {!isClosed && (
            <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 border-b border-slate-100 pb-2.5">
                + Add Daily Entry (Expense or Income)
              </h3>
              <form onSubmit={handleAddLineItem} className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-end">
                <div className="sm:col-span-3">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Entry Type
                  </label>
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setType("expense")}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                        type === "expense"
                          ? "bg-red-600 text-white shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Expense (-)
                    </button>
                    <button
                      type="button"
                      onClick={() => setType("income")}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                        type === "income"
                          ? "bg-emerald-600 text-white shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Income (+)
                    </button>
                  </div>
                </div>

                <div className="sm:col-span-5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Description / Purpose of Money
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g., Generator Fuel, Logistics, Repairs..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-brand-green-600 focus:outline-none"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Amount (₦)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="5000"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-brand-green-600 focus:outline-none"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <Button
                    type="submit"
                    isLoading={isSubmittingItem}
                    className="w-full bg-brand-green-600 hover:bg-brand-green-700 text-white rounded-xl text-xs font-bold py-2.5 justify-center"
                  >
                    <Plus className="w-4 h-4 mr-1 inline" /> Add Entry
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Line Items Table */}
          <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xs">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Today's Transaction Log ({lineItems.length})
              </h3>
              <span className="text-[11px] text-slate-400 font-medium">
                {new Date(ledger?.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>

            {lineItems.length === 0 ? (
              <div className="p-8 sm:p-12 text-center text-xs text-slate-400 italic">
                No expense or income entries added for today yet. Use the form above to add line items.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {lineItems.map((item) => (
                  <div
                    key={item._id}
                    className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                          item.type === "expense"
                            ? "bg-red-100 text-red-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {item.type === "expense" ? "-" : "+"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-900 leading-snug break-words">{item.description}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Added by {item.createdBy?.firstName || "Admin"} &bull;{" "}
                          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 border-slate-100/60 pt-2 sm:pt-0">
                      <span className="text-[10px] sm:hidden text-slate-400 font-semibold uppercase">Amount:</span>
                      <div className="flex items-center gap-3">
                        <span
                          className={`font-mono font-black text-sm ${
                            item.type === "expense" ? "text-red-600" : "text-emerald-600"
                          }`}
                        >
                          {item.type === "expense" ? "-" : "+"}{formatCurrency(item.amount)}
                        </span>

                        {!isClosed && (
                          <button
                            onClick={() => handleRemoveItem(item._id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Delete entry"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {activeView === "history" && (
        <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Historical Expense Ledgers
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Click any day's ledger to inspect tracked line items, view uploaded receipts, and download certified evidence.
              </p>
            </div>
            <button
              onClick={fetchHistory}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
              title="Refresh past ledgers"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {historyLoading ? (
            <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
              Loading past ledgers...
            </div>
          ) : historyLedgers.length === 0 ? (
            <div className="p-8 sm:p-12 text-center text-xs text-slate-400 italic">
              No closed historical ledgers found.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {historyLedgers.map((item) => (
                <div
                  key={item._id}
                  onClick={() => handleOpenDayDetails(item)}
                  className="py-4 px-3 sm:px-4 -mx-3 sm:-mx-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-brand-green-50/40 rounded-2xl transition cursor-pointer group"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-black text-slate-900 group-hover:text-brand-green-800 text-sm transition">
                        {new Date(item.date).toLocaleDateString(undefined, {
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <span
                        className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded-full ${
                          item.status === "closed"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : "bg-amber-100 text-amber-800 border border-amber-200"
                        }`}
                      >
                        {item.status === "closed" ? "Closed & Stamped" : "Open"}
                      </span>
                      {item.evidence && item.evidence.length > 0 && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                          <Paperclip className="w-2.5 h-2.5" />
                          {item.evidence.length} receipt{item.evidence.length > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Stamped By: <strong className="text-slate-700">{item.stampedByAdmin || "System Admin"}</strong> &bull;{" "}
                      {item.lineItems?.length || 0} transaction{item.lineItems?.length === 1 ? "" : "s"} &bull;{" "}
                      Opening: <span className="font-mono text-slate-600">{formatCurrency(item.openingBalance || 0)}</span>
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 border-slate-100/60 pt-2 sm:pt-0">
                    <div className="text-left sm:text-right">
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Closing Balance</p>
                      <p className="font-black text-brand-green-800 text-sm">
                        {formatCurrency(item.closingBalance)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadPDF(item);
                        }}
                        disabled={isDownloadingPDF}
                        className="px-2.5 py-1.5 bg-brand-green-50 hover:bg-brand-green-100 text-brand-green-800 font-extrabold rounded-xl transition text-[11px] flex items-center gap-1 border border-brand-green-200"
                        title="Download daily expense statement as PDF"
                      >
                        <Download className="w-3 h-3" />
                        Download PDF
                      </button>

                      <div className="p-1.5 text-slate-400 group-hover:text-brand-green-700 transition">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Day Ledger Details Modal */}
      {selectedHistoryLedger && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto">
          <div className="max-w-3xl w-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-scale-up max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 sm:p-6 border-b border-slate-800 flex items-start justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-green-600/30 border border-brand-green-500/40 text-brand-green-400 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-white">
                      Daily Expense Ledger
                    </h3>
                    <span
                      className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded-full ${
                        selectedHistoryLedger.status === "closed"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      }`}
                    >
                      {selectedHistoryLedger.status === "closed" ? "Audited & Closed" : "Open Ledger"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(selectedHistoryLedger.date).toLocaleDateString(undefined, {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })} &bull; Stamped by {selectedHistoryLedger.stampedByAdmin || "Admin"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadPDF(selectedHistoryLedger)}
                  disabled={isDownloadingPDF}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition text-xs flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  title="Download daily expense statement PDF"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">
                    {isDownloadingPDF ? "Downloading..." : "Download PDF"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedHistoryLedger(null)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
              {loadingDayDetails ? (
                <div className="p-10 text-center text-slate-400 animate-pulse">
                  Refreshing day transactions and attached receipts...
                </div>
              ) : (
                <>
                  {/* Financial Metrics Cards with Robust Inflow/Outflow Calculation */}
                  {(() => {
                    const lItems = Array.isArray(selectedHistoryLedger.lineItems) ? selectedHistoryLedger.lineItems : [];
                    const calculatedIncome = lItems
                      .filter((i) => i.type === "income")
                      .reduce((acc, i) => acc + Number(i.amount || 0), 0);
                    const calculatedExpenses = lItems
                      .filter((i) => i.type === "expense")
                      .reduce((acc, i) => acc + Number(i.amount || 0), 0);
                    const inflowVal = Number(selectedHistoryLedger.totalIncome ?? calculatedIncome);
                    const outflowVal = Number(selectedHistoryLedger.totalExpenses ?? selectedHistoryLedger.totalExpense ?? calculatedExpenses);
                    const openBal = Number(selectedHistoryLedger.openingBalance || 0);
                    const netVal = Number(selectedHistoryLedger.netAmount ?? (inflowVal - outflowVal));
                    const closeBal = Number(selectedHistoryLedger.closingBalance ?? (openBal + netVal));

                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
                          <span className="text-[9px] font-extrabold uppercase text-slate-400 block">
                            Opening Balance
                          </span>
                          <span className="text-xs sm:text-sm font-black text-slate-800 mt-1 block">
                            {formatCurrency(openBal)}
                          </span>
                        </div>

                        <div className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-3">
                          <span className="text-[9px] font-extrabold uppercase text-emerald-700 block">
                            Total Inflow
                          </span>
                          <span className="text-xs sm:text-sm font-black text-emerald-800 mt-1 block">
                            +{formatCurrency(inflowVal)}
                          </span>
                        </div>

                        <div className="bg-red-50/50 border border-red-200 rounded-2xl p-3">
                          <span className="text-[9px] font-extrabold uppercase text-red-700 block">
                            Total Outflow
                          </span>
                          <span className="text-xs sm:text-sm font-black text-red-800 mt-1 block">
                            -{formatCurrency(outflowVal)}
                          </span>
                        </div>

                        <div className="bg-brand-green-50 border border-brand-green-200 rounded-2xl p-3">
                          <span className="text-[9px] font-extrabold uppercase text-brand-green-700 block">
                            Closing Balance
                          </span>
                          <span className="text-xs sm:text-sm font-black text-brand-green-950 mt-1 block">
                            {formatCurrency(closeBal)}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Line Items Breakdown */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h4 className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">
                        Tracked Line Items ({selectedHistoryLedger.lineItems?.length || 0})
                      </h4>
                    </div>

                    {(!selectedHistoryLedger.lineItems || selectedHistoryLedger.lineItems.length === 0) ? (
                      <p className="text-slate-400 italic text-center py-4 bg-slate-50 rounded-2xl">
                        No individual line items tracked for this day.
                      </p>
                    ) : (
                      <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
                        {selectedHistoryLedger.lineItems.map((item, idx) => (
                          <div
                            key={item._id || idx}
                            className="p-3 sm:p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition"
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                                  item.type === "expense"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-emerald-100 text-emerald-700"
                                }`}
                              >
                                {item.type === "expense" ? "-" : "+"}
                              </span>
                              <div>
                                <p className="font-bold text-slate-900">{item.description}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  {item.category && (
                                    <span className="font-semibold text-slate-600 mr-1.5">
                                      [{item.category}]
                                    </span>
                                  )}
                                  Recorded by {item.createdBy?.firstName || "Admin"} &bull;{" "}
                                  {item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }) : ""}
                                </p>
                              </div>
                            </div>

                            <span
                              className={`font-mono font-black text-xs sm:text-sm ${
                                item.type === "expense" ? "text-red-600" : "text-emerald-600"
                              }`}
                            >
                              {item.type === "expense" ? "-" : "+"}
                              {formatCurrency(item.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Attached Receipts Section */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div>
                        <h4 className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                          <Paperclip className="w-3.5 h-3.5 text-brand-green-700" />
                          Attached Receipts &amp; Documents (
                          {selectedHistoryLedger.evidence?.length || 0})
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Invoices, bank payment receipts, and voucher scans.
                        </p>
                      </div>

                      {/* Upload Receipt Input */}
                      <label className="relative cursor-pointer px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition text-[11px] flex items-center gap-1.5 border border-slate-200">
                        <UploadCloud className="w-3.5 h-3.5 text-slate-600" />
                        <span>{uploadingEvidence ? "Uploading..." : "Attach Receipt"}</span>
                        <input
                          type="file"
                          multiple
                          accept="image/*,.pdf"
                          onChange={(e) => handleUploadEvidence(e, selectedHistoryLedger.date)}
                          disabled={uploadingEvidence}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                      </label>
                    </div>

                    {(!selectedHistoryLedger.evidence || selectedHistoryLedger.evidence.length === 0) ? (
                      <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center space-y-1.5">
                        <FileText className="w-6 h-6 text-slate-400 mx-auto" />
                        <p className="text-slate-500 font-semibold text-xs">
                          No receipts attached to this day's record yet.
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Use the "Attach Receipt" button above to upload photo receipts or invoice PDFs.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selectedHistoryLedger.evidence.map((ev, i) => (
                          <div
                            key={ev._id || i}
                            className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center gap-3 hover:bg-white transition shadow-2xs"
                          >
                            <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                              {ev.url && (ev.url.endsWith(".pdf") || ev.filename?.endsWith(".pdf")) ? (
                                <FileText className="w-6 h-6 text-red-500" />
                              ) : (
                                <img
                                  src={ev.url}
                                  alt={ev.filename || "Receipt"}
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-extrabold text-slate-800 text-xs truncate">
                                {ev.filename || `Receipt File ${i + 1}`}
                              </p>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {ev.uploadedAt ? new Date(ev.uploadedAt).toLocaleDateString() : "Attached"}
                              </p>
                              <div className="flex items-center gap-2 mt-1.5">
                                <a
                                  href={ev.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] font-bold text-brand-green-700 hover:underline flex items-center gap-1"
                                >
                                  <ExternalLink className="w-2.5 h-2.5" /> View
                                </a>
                                <a
                                  href={ev.url}
                                  download={ev.filename || `Receipt-${i + 1}`}
                                  className="text-[10px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                                >
                                  <Download className="w-2.5 h-2.5" /> Download
                                </a>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-200 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <Stamp className="w-4 h-4 text-brand-green-700" />
                <span>
                  Official Vinoff Ledger Stamp &bull; {selectedHistoryLedger.stampedByAdmin || "Superadmin"}
                </span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="secondary"
                  onClick={() => setSelectedHistoryLedger(null)}
                  className="rounded-xl px-4 py-2 text-xs flex-1 sm:flex-initial"
                >
                  Close
                </Button>
                <Button
                  variant="primary"
                  onClick={() => handleDownloadPDF(selectedHistoryLedger)}
                  disabled={isDownloadingPDF}
                  className="rounded-xl px-4 py-2 text-xs flex-1 sm:flex-initial flex items-center justify-center gap-1.5"
                  icon={Download}
                >
                  {isDownloadingPDF ? "Generating PDF..." : "Download Daily Statement (PDF)"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseTracker;

