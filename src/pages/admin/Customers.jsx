import React, { useState, useEffect } from "react";
import { dbGetOrders, dbGetAllUsers } from "../../services/firebase/db";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../../services/firebase/config";
import { formatCurrency } from "../../utils/formatCurrency";
import InvoiceStatusBadge from "../../modules/invoice/components/InvoiceStatusBadge";
import InvoiceViewer from "../../modules/invoice/components/InvoiceViewer";
import {
  Users,
  Mail,
  Phone,
  ShoppingCart,
  X,
  Eye,
  Download,
  FileText,
  Landmark,
  Clock,
  Landmark as DollarIcon,
} from "lucide-react";
import Avatar from "../../components/ui/Avatar";

export const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Profile Drawer States
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerInvoices, setCustomerInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [activeTab, setActiveTab] = useState("invoices"); // default to invoices tab as requested

  // Viewer Modal State
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  useEffect(() => {
    // Fetch all users and all orders in parallel
    Promise.all([dbGetAllUsers(), dbGetOrders()])
      .then(([usersData, ordersData]) => {
        // Filter users to only include customers
        const customerUsers = usersData.filter((u) => u.role === "customer");

        // Create a map of order aggregates by customerId
        const orderStatsMap = {};
        ordersData.forEach((o) => {
          if (!o.customerId) return;
          if (!orderStatsMap[o.customerId]) {
            orderStatsMap[o.customerId] = {
              ordersCount: 0,
              totalSpend: 0,
            };
          }
          orderStatsMap[o.customerId].ordersCount += 1;
          if (o.status !== "Cancelled" && o.status !== "Pending Payment") {
            orderStatsMap[o.customerId].totalSpend += Number(o.total) || 0;
          }
        });

        // Map customer users to include their order statistics
        const customersList = customerUsers.map((u) => {
          const stats = orderStatsMap[u.uid] || {
            ordersCount: 0,
            totalSpend: 0,
          };
          return {
            id: u.uid,
            name: u.name || "Retail Buyer",
            businessName: u.businessName || "Wholesale Storefront",
            email: u.email || "",
            phone: u.phone || "",
            ordersCount: stats.ordersCount,
            totalSpend: stats.totalSpend,
            avatarUrl: u.avatarUrl, // include avatarUrl in the customer data
          };
        });

        setCustomers(customersList);
      })
      .catch((err) => {
        console.error("Error loading registry:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  // Fetch invoices for a selected customer
  const handleCustomerClick = async (customer) => {
    setSelectedCustomer(customer);
    setActiveTab("invoices");
    setLoadingInvoices(true);

    try {
      const q = query(
        collection(db, "invoices"),
        where("customerId", "==", customer.id)
      );
      const snap = await getDocs(q);
      const list = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      
      // Sort client-side to avoid requiring a composite index in Firestore
      list.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      
      setCustomerInvoices(list);
    } catch (error) {
      console.error("Error fetching customer invoices:", error);
      setCustomerInvoices([]);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const handleViewInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setIsViewerOpen(true);
  };

  return (
    <div className="space-y-6 relative">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <Users className="w-5 h-5 text-brand-green-700" />
          Wholesale Customers Registry
        </h2>
        <p className="text-xs text-slate-500 font-medium">
          Verify buyer business credentials, contact phone listings, and total
          client expenditure statistics.
        </p>
      </div>

      {loading ? (
        <p className="text-slate-500 animate-pulse text-xs font-semibold">
          Syncing customers list...
        </p>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 font-extrabold border-b border-slate-100 bg-slate-50">
                  <th className="py-3.5 px-4">Representative</th>
                  <th className="py-3.5 px-4">Business Outlet</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4">Contact Phone</th>
                  <th className="py-3.5 px-4 text-center">Orders Count</th>
                  <th className="py-3.5 px-4 text-right">Aggregated Spend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {customers.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => handleCustomerClick(c)}
                    className="hover:bg-slate-50/50 cursor-pointer transition"
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-550 font-bold border border-slate-200">
                          {c.avatarUrl ? (
                            <Avatar src={c.avatarUrl} alt={c.name} size={32} />
                          ) : (
                            c.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <span className="font-extrabold text-slate-900">
                          {c.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 font-bold text-brand-green-800 uppercase tracking-wide">
                      {c.businessName}
                    </td>
                    <td className="py-4 px-4 text-slate-500 flex items-center gap-1 font-medium">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      {c.email}
                    </td>
                    <td className="py-4 px-4 text-slate-500">
                      <span className="flex items-center gap-1 font-medium">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {c.phone}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center text-slate-900 font-bold">
                      {c.ordersCount} requests
                    </td>
                    <td className="py-4 px-4 text-right text-brand-green-700 font-black font-mono">
                      {formatCurrency(c.totalSpend)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CUSTOMER DETAILED PROFILE SLIDING DRAWER OVERLAY */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex justify-end z-45 animate-fade-in">
          <div className="bg-white border-l border-slate-200 w-full max-w-xl h-full flex flex-col shadow-2xl animate-slide-left p-6 space-y-6">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold border border-slate-200">
                  {selectedCustomer?.avatarUrl ? (
                    <Avatar
                      src={selectedCustomer.avatarUrl}
                      alt={selectedCustomer.name}
                      size={36}
                    />
                  ) : (
                    selectedCustomer.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm tracking-tight">
                    {selectedCustomer.name}
                  </h3>
                  <p className="text-[10px] text-slate-450 uppercase font-bold tracking-wide mt-0.5">
                    {selectedCustomer.businessName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-200/80 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick stats grid */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-200/50 p-4 rounded-2xl text-xs font-semibold text-slate-750">
              <div className="space-y-1">
                <span className="block text-[9px] text-slate-400 font-extrabold uppercase">
                  Contact Details
                </span>
                <p className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />{" "}
                  {selectedCustomer.email}
                </p>
                <p className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />{" "}
                  {selectedCustomer.phone}
                </p>
              </div>
              <div className="space-y-1 text-right">
                <span className="block text-[9px] text-slate-400 font-extrabold uppercase">
                  Total Spend
                </span>
                <p className="text-sm font-black text-brand-green-700 font-mono">
                  {formatCurrency(selectedCustomer.totalSpend)}
                </p>
                <p className="text-[10px] text-slate-500 font-medium">
                  From {selectedCustomer.ordersCount} requests
                </p>
              </div>
            </div>

            {/* Tabs Selector */}
            <div className="flex border-b border-slate-150 gap-4">
              <button
                onClick={() => setActiveTab("invoices")}
                className={`pb-2 text-xs font-extrabold uppercase border-b-2 transition ${
                  activeTab === "invoices"
                    ? "border-brand-green-600 text-brand-green-700"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                Invoices Ledger
              </button>
              <button
                onClick={() => setActiveTab("details")}
                className={`pb-2 text-xs font-extrabold uppercase border-b-2 transition ${
                  activeTab === "details"
                    ? "border-brand-green-600 text-brand-green-700"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                Outlet Details
              </button>
            </div>

            {/* Drawer Tab Content */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {activeTab === "invoices" ? (
                loadingInvoices ? (
                  <p className="text-slate-500 animate-pulse text-xs font-semibold p-4">
                    Syncing customer ledgers...
                  </p>
                ) : customerInvoices.length === 0 ? (
                  <div className="text-center p-8 border border-dashed border-slate-200 rounded-2xl">
                    <p className="text-slate-400 text-xs italic">
                      No invoices issued for this buyer outlet yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {customerInvoices.map((inv) => {
                      const date = inv.createdAt?.seconds
                        ? new Date(
                            inv.createdAt.seconds * 1000,
                          ).toLocaleDateString()
                        : new Date().toLocaleDateString();

                      return (
                        <div
                          key={inv.id}
                          className="border border-slate-200/80 rounded-2xl p-4 bg-white hover:border-brand-green-300 transition flex items-center justify-between text-xs"
                        >
                          <div className="space-y-1">
                            <p className="font-bold text-slate-800 flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-slate-450" />
                              {inv.invoiceNumber}
                            </p>
                            <p className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Issued: {date}
                            </p>
                            <div className="pt-1">
                              <InvoiceStatusBadge
                                status={inv.status}
                                className="text-[8px] py-0 px-1.5"
                              />
                            </div>
                          </div>

                          <div className="text-right space-y-1.5">
                            <div>
                              <p className="font-extrabold text-slate-500 text-[10px]">
                                Total:{" "}
                                <span className="font-mono text-slate-805">
                                  {formatCurrency(inv.total)}
                                </span>
                              </p>
                              <p className="font-black text-slate-800 text-[10px]">
                                Bal:{" "}
                                <span className="font-mono text-emerald-650">
                                  {formatCurrency(inv.balance)}
                                </span>
                              </p>
                            </div>

                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => handleViewInvoice(inv)}
                                className="p-1 hover:bg-slate-100 text-slate-500 hover:text-brand-green-700 rounded-lg transition border border-slate-200/60"
                                title="Inspect Invoice Details"
                              >
                                <Eye className="w-3 h-3" />
                              </button>
                              {inv.pdfUrl && (
                                <a
                                  href={inv.pdfUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1 hover:bg-slate-100 text-slate-500 hover:text-brand-green-700 rounded-lg transition border border-slate-200/60"
                                  title="Download PDF link"
                                >
                                  <Download className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                <div className="bg-slate-50 border border-slate-200/50 p-5 rounded-2xl space-y-4 text-xs font-semibold text-slate-750">
                  <h4 className="font-extrabold text-slate-900 border-b border-slate-200 pb-1.5">
                    Storefront Registry Metadata
                  </h4>
                  <p>
                    Customer UID:{" "}
                    <span className="font-mono font-bold text-slate-600 block mt-1">
                      {selectedCustomer.id}
                    </span>
                  </p>
                  <p>
                    Rep Name:{" "}
                    <span className="text-slate-800 font-bold block mt-1">
                      {selectedCustomer.name}
                    </span>
                  </p>
                  <p>
                    Registered Company:{" "}
                    <span className="text-slate-800 font-bold block mt-1">
                      {selectedCustomer.businessName}
                    </span>
                  </p>
                  <p>
                    Account Clearance:{" "}
                    <span className="text-emerald-700 font-black block mt-1">
                      APPROVED BULK MERCHANT
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Invoice Viewer Modal */}
      {selectedInvoice && (
        <InvoiceViewer
          invoice={selectedInvoice}
          isOpen={isViewerOpen}
          onClose={() => {
            setIsViewerOpen(false);
            setSelectedInvoice(null);
          }}
          onSaveSuccess={() => handleCustomerClick(selectedCustomer)}
        />
      )}
    </div>
  );
};

export default Customers;
