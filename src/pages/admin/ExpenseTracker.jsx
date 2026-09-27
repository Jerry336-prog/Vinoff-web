import React, { useState, useEffect, useContext } from "react";
import api from "../../services/api";
import { formatCurrency } from "../../utils/formatCurrency";
import Button from "../../components/ui/Button";
import { useToast } from "../../context/ToastContext";
import { AuthContext } from "../../context/AuthContext";
import { unwrapApiRecord, unwrapApiList } from "../../utils/apiResponse";
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
} from "lucide-react";

export const ExpenseTracker = () => {
  const { toast, showModal } = useToast();
  const { user } = useContext(AuthContext);

  const [ledger, setLedger] = useState(null);
  const [historyLedgers, setHistoryLedgers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeView, setActiveView] = useState("today"); // 'today' | 'history'

  // Form states for line item
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("expense"); // 'expense' | 'income'
  const [isSubmittingItem, setIsSubmittingItem] = useState(false);

  // Form state for opening balance (if zero / edit)
  const [openingBalanceInput, setOpeningBalanceInput] = useState("");
  const [isUpdatingOpening, setIsUpdatingOpening] = useState(false);
  const [isClosingDay, setIsClosingDay] = useState(false);

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

          <div className="grid grid-cols-2 w-full sm:w-auto gap-2 shrink-0">
            <button
              onClick={() => {
                setActiveView("today");
              }}
              className={`px-4 py-2.5 text-xs font-bold rounded-xl transition text-center ${
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
              className={`px-4 py-2.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
                activeView === "history"
                  ? "bg-brand-green-600 text-white shadow-sm"
                  : "bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700"
              }`}
            >
              <History className="w-3.5 h-3.5" /> Past Ledgers
            </button>
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
                Net Closing Balance
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
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-3">
            Historical Expense Ledgers
          </h3>

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
                <div key={item._id} className="py-3.5 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-black text-slate-900">
                        {new Date(item.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${
                          item.status === "closed"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {item.status === "closed" ? "Closed & Stamped" : "Open"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Stamped By: <strong className="text-slate-700">{item.stampedByAdmin || "N/A"}</strong> &bull; {item.lineItems?.length || 0} transaction(s)
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 border-slate-100/60 pt-2 sm:pt-0">
                    <span className="text-[10px] sm:hidden text-slate-400 font-semibold uppercase">Closing:</span>
                    <div className="text-right">
                      <p className="hidden sm:block text-[10px] text-slate-400 uppercase font-bold">Closing Balance</p>
                      <p className="font-black text-brand-green-800 text-sm">
                        {formatCurrency(item.closingBalance)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ExpenseTracker;
