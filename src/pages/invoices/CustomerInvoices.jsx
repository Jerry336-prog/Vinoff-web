import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../services/api";
import { formatCurrency } from "../../utils/formatCurrency";
import Badge from "../../components/ui/Badge";
import {
  FileText,
  Search,
  Download,
  Printer,
  Eye,
  Calendar,
  DollarSign,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import Button from "../../components/ui/Button";
import { downloadInvoicePDF } from "../../utils/generatePDF";
import { toast } from "../../context/ToastContext";

export const CustomerInvoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [downloadingId, setDownloadingId] = useState(null);
  const navigate = useNavigate();

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/invoices");
      const list = res.data?.items || res.data || [];
      setInvoices(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Failed to fetch invoices:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleDownload = async (e, invoiceId) => {
    e.stopPropagation();
    setDownloadingId(invoiceId);
    try {
      await downloadInvoicePDF(invoiceId);
    } catch (err) {
      // toast error handled inside downloadInvoicePDF
    } finally {
      setDownloadingId(null);
    }
  };

  const allowedStatuses = ["All", "Draft", "Pending", "Paid", "Cancelled"];

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.items?.some((i) =>
        (i.description || i.name)?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    const matchesStatus =
      statusFilter === "All" || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-brand-green-700" />
            My Invoices
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            View transaction invoices, tax documentation, and download official receipts.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Search invoice number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold focus:ring-2 focus:ring-brand-green-500 outline-none"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {allowedStatuses.map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all outline-none whitespace-nowrap ${
              statusFilter === st
                ? "bg-brand-green-600 text-white shadow-sm"
                : "bg-white hover:bg-slate-100 border border-slate-200 text-slate-600"
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Invoice Table / List */}
      {loading ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-3xl animate-pulse text-xs text-slate-400">
          Syncing invoices...
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm">
          <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <h3 className="text-base font-bold text-slate-700">No Invoices Found</h3>
          <p className="text-xs text-slate-400 mt-1">
            {searchTerm || statusFilter !== "All"
              ? "No invoices match your selected filters."
              : "Invoices will be automatically generated upon order submission."}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead>
                <tr className="text-slate-400 font-extrabold border-b border-slate-100 bg-slate-50/70">
                  <th className="py-4 px-5">Invoice #</th>
                  <th className="py-4 px-4">Date Issued</th>
                  <th className="py-4 px-4">Due Date</th>
                  <th className="py-4 px-4 text-right">Subtotal</th>
                  <th className="py-4 px-4 text-right">Total Payable</th>
                  <th className="py-4 px-4 text-center">Status</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {filteredInvoices.map((inv) => (
                  <tr
                    key={inv._id}
                    onClick={() => navigate(`/invoices/${inv._id}`)}
                    className="hover:bg-slate-50/70 transition cursor-pointer"
                  >
                    <td className="py-4 px-5 font-mono font-black text-slate-900 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-400" />
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-4 px-4 text-slate-500 font-medium">
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4 text-slate-500 font-medium">
                      {inv.dueDate
                        ? new Date(inv.dueDate).toLocaleDateString()
                        : "On Receipt"}
                    </td>
                    <td className="py-4 px-4 text-right text-slate-600">
                      {formatCurrency(inv.subtotal)}
                    </td>
                    <td className="py-4 px-4 text-right text-slate-900 font-black">
                      {formatCurrency(inv.total || inv.totalAmount)}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <Badge status={inv.status} className="text-[10px]" />
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => handleDownload(e, inv._id)}
                          disabled={downloadingId === inv._id}
                          className={`p-1.5 rounded-lg transition ${
                            downloadingId === inv._id
                              ? "bg-brand-green-50 text-brand-green-600 animate-pulse"
                              : "hover:bg-slate-100 text-slate-500 hover:text-brand-green-700"
                          }`}
                          title="Download Official Vinoff PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl text-[11px] py-1 px-2.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/invoices/${inv._id}`);
                          }}
                        >
                          View
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerInvoices;
