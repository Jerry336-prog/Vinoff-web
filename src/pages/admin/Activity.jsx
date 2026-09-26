import React, { useState, useEffect } from "react";
import api from "../../services/api";
import {
  Activity as ActivityIcon,
  Search,
  Filter,
  Calendar,
  User,
  ShieldCheck,
  CreditCard,
  Package,
  FileText,
  Clock,
} from "lucide-react";
import Button from "../../components/ui/Button";

export const Activity = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [targetTypeFilter, setTargetTypeFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  const fetchLogs = async (pageNum = 1) => {
    setLoading(true);
    try {
      const params = { page: pageNum, limit: 25 };
      if (targetTypeFilter !== "All") params.targetType = targetTypeFilter;

      const res = await api.get("/api/admin/activity", { params });
      const items = res.data?.items || res.data || [];
      setLogs(Array.isArray(items) ? items : []);
      setPagination(res.pagination || res.meta || null);
    } catch (err) {
      console.error("Failed to load activity logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(page);
  }, [page, targetTypeFilter]);

  const targetTypes = ["All", "Order", "User", "Invoice", "Product", "Chat"];

  const filteredLogs = logs.filter((log) => {
    const term = searchTerm.toLowerCase();
    return (
      log.description?.toLowerCase().includes(term) ||
      log.action?.toLowerCase().includes(term) ||
      log.actor?.firstName?.toLowerCase().includes(term) ||
      log.actor?.lastName?.toLowerCase().includes(term) ||
      log.actor?.email?.toLowerCase().includes(term)
    );
  });

  const getTargetIcon = (targetType) => {
    switch (targetType) {
      case "Order":
        return <Package className="w-4 h-4 text-emerald-600" />;
      case "Invoice":
        return <FileText className="w-4 h-4 text-blue-600" />;
      case "User":
        return <User className="w-4 h-4 text-purple-600" />;
      case "Product":
        return <Package className="w-4 h-4 text-amber-600" />;
      default:
        return <ActivityIcon className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <ActivityIcon className="w-5 h-5 text-brand-green-700" />
            System Audit Trail & Activity Log
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Immutable log of administrative transactions, customer profile updates, and order events.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search description, actor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold focus:ring-2 focus:ring-brand-green-500 outline-none"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>
        </div>
      </div>

      {/* Target Type Filter Tabs */}
      <div className="flex items-center gap-2">
        {targetTypes.map((type) => (
          <button
            key={type}
            onClick={() => {
              setTargetTypeFilter(type);
              setPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              targetTypeFilter === type
                ? "bg-brand-green-600 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-3xl animate-pulse text-xs text-slate-400">
          Syncing audit stream...
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm">
          <ActivityIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">No Activity Logs Found</p>
          <p className="text-xs text-slate-400 mt-1">No logs match your filter criteria.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 font-extrabold border-b border-slate-100 bg-slate-50/70">
                  <th className="py-4 px-5">Target</th>
                  <th className="py-4 px-4">Action</th>
                  <th className="py-4 px-4">Description</th>
                  <th className="py-4 px-4">Actor</th>
                  <th className="py-4 px-5 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {filteredLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/70 transition">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                          {getTargetIcon(log.targetType)}
                        </div>
                        <span className="font-bold text-slate-800">{log.targetType || "System"}</span>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <span className="bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg font-bold text-[11px]">
                        {log.action}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-slate-900 font-medium max-w-md">
                      {log.description}
                    </td>

                    <td className="py-4 px-4">
                      <p className="font-bold text-slate-900 leading-tight">
                        {log.actor?.firstName ? `${log.actor.firstName} ${log.actor.lastName || ''}` : (log.actor?.email || "System")}
                      </p>
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">
                        Role: {log.actor?.role || "System"}
                      </p>
                    </td>

                    <td className="py-4 px-5 text-right text-slate-500 font-medium whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalItems} total logs)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!pagination.hasPrevPage}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-xl text-xs"
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!pagination.hasNextPage}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-xl text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Activity;
