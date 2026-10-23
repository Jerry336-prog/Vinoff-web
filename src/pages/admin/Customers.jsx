import React, { useState, useEffect, useContext, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../services/api";
import { formatCurrency } from "../../utils/formatCurrency";
import {
  Users,
  Search,
  Mail,
  Phone,
  UserCheck,
  UserX,
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  UserMinus,
  Shield,
  MapPin,
  MoreVertical,
  Eye,
  CreditCard,
} from "lucide-react";
import Avatar from "../../components/ui/Avatar";
import Button from "../../components/ui/Button";
import ExportButton from "../../components/exports/ExportButton";
import { useToast } from "../../context/ToastContext";
import { AuthContext } from "../../context/AuthContext";
import { unwrapApiList, unwrapApiRecord } from "../../utils/apiResponse";
import { getAvatarUrl, getInitials } from "../../utils/avatar";

const accountRoleStyles = {
  customer: { label: 'Customer', icon: Users, colors: 'border-slate-200 bg-slate-50 text-slate-600' },
  vip: { label: 'VIP Credit Partner', icon: CreditCard, colors: 'border-teal-200 bg-teal-50 text-teal-800' },
  admin: { label: 'Admin', icon: Shield, colors: 'border-sky-200 bg-sky-50 text-sky-800' },
  superadmin: { label: 'Super Admin', icon: ShieldCheck, colors: 'border-slate-800 bg-slate-800 text-white' },
};

const AccountRoleChip = ({ role, vip = false }) => {
  const key = vip ? 'vip' : ['superadmin', 'super_admin'].includes(role)
    ? 'superadmin' : ['admin', 'subAdmin'].includes(role) ? 'admin' : 'customer';
  const { label, icon: Icon, colors } = accountRoleStyles[key];

  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-1 text-[10px] font-semibold leading-none ${colors}`}>
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      {label}
    </span>
  );
};

export const Customers = () => {
  const { toast, showModal } = useToast();
  const { user: currentUser, isSuperAdmin, refreshUser, can } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const navigate = useNavigate();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let res;
      try {
        res = await api.get("/api/admin/users?limit=100");
      } catch (e) {
        res = await api.get("/api/admin/customers?limit=100");
      }
      const list = unwrapApiList(res);
      setUsers(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  const handleStatusToggle = (e, targetUser) => {
    if (e) e.stopPropagation();
    if (!can('customers.manage')) { toast.warning('Ask the super admin for customer-management permission.'); return; }
    const newStatus = targetUser.accountStatus === "suspended" ? "active" : "suspended";
    const isSuspending = newStatus === "suspended";

    showModal({
      title: isSuspending ? "Suspend User Account" : "Activate User Account",
      message: `Are you sure you want to change ${targetUser.firstName} ${targetUser.lastName}'s account status to '${newStatus}'? ${
        isSuspending ? "The user will be restricted from system actions until reactivated." : ""
      }`,
      confirmText: isSuspending ? "Yes, Suspend" : "Yes, Activate",
      cancelText: "Cancel",
      type: isSuspending ? "warning" : "info",
      onConfirm: async () => {
        setUpdatingId(targetUser._id);
        try {
          await api.patch(`/api/admin/customers/${targetUser._id}/status`, {
            status: newStatus,
          });
          setUsers((prev) =>
            prev.map((u) =>
              u._id === targetUser._id ? { ...u, accountStatus: newStatus } : u
            )
          );
          toast.success(
            `Account status for ${targetUser.firstName} updated to '${newStatus}'`,
            "Status Updated"
          );
        } catch (err) {
          toast.error(err.message || "Failed to update user status", "Update Failed");
        } finally {
          setUpdatingId(null);
        }
      },
    });
  };

  const handleVipCreditToggle = (e, targetUser) => {
    if (e) e.stopPropagation();
    if (!can('customers.manage')) { toast.warning('Ask the super admin for customer-management permission.'); return; }
    const nextVipState = !targetUser.isVipCreditPartner;

    showModal({
      title: nextVipState ? "Grant VIP Credit Partner Status" : "Revoke VIP Credit Partner Status",
      message: nextVipState
        ? `Upgrade ${targetUser.firstName} ${targetUser.lastName} to a VIP Credit Partner? Credit orders require an approved limit. Set or request that limit from their customer profile after granting VIP status.`
        : `Revoke VIP Credit Partner privilege from ${targetUser.firstName} ${targetUser.lastName}? Any existing unpaid credit invoices will still remain on their balance until settled.`,
      confirmText: nextVipState ? "Grant VIP Credit" : "Revoke VIP Credit",
      cancelText: "Cancel",
      type: nextVipState ? "info" : "warning",
      onConfirm: async () => {
        setUpdatingId(targetUser._id);
        try {
          const res = await api.patch(`/api/admin/customers/${targetUser._id}/vip-credit`, {
            isVipCreditPartner: nextVipState,
          });
          const payload = unwrapApiRecord(res);
          const updatedCustomer = payload?.customer || payload;
          setUsers((prev) =>
            prev.map((u) =>
              u._id === targetUser._id
                ? {
                    ...u,
                    isVipCreditPartner: nextVipState,
                    outstandingCredit: updatedCustomer?.outstandingCredit ?? u.outstandingCredit ?? 0,
                    isOwingCredit: Number(updatedCustomer?.outstandingCredit ?? u.outstandingCredit ?? 0) > 0,
                  }
                : u
            )
          );
          refreshUser?.();
          toast.success(
            nextVipState
              ? `${targetUser.firstName} ${targetUser.lastName} is now a VIP Credit Partner!`
              : `VIP Credit Partner status revoked for ${targetUser.firstName} ${targetUser.lastName}`,
            "VIP Credit Updated"
          );
        } catch (err) {
          toast.error(err.message || "Failed to update VIP Credit Partner status", "Update Failed");
        } finally {
          setUpdatingId(null);
        }
      },
    });
  };

  const handleRoleChange = (e, targetUser, newRole) => {
    if (e) e.stopPropagation();
    const isPromoting = newRole === "admin";

    showModal({
      title: isPromoting ? "Promote User to Admin" : "Dismiss Admin to Customer",
      message: isPromoting
        ? `Promote ${targetUser.firstName} ${targetUser.lastName} (${targetUser.email}) to an Admin? This does not grant operational permissions. Assign them under Administration > Staff Permissions after promotion.`
        : `Are you sure you want to dismiss ${targetUser.firstName} ${targetUser.lastName} (${targetUser.email}) from Admin back to a regular Customer?`,
      confirmText: isPromoting ? "Yes, Make Admin" : "Yes, Dismiss Admin",
      cancelText: "Cancel",
      type: isPromoting ? "info" : "warning",
      onConfirm: async () => {
        setUpdatingId(targetUser._id);
        try {
          await api.patch(`/api/admin/users/${targetUser._id}/role`, {
            role: newRole,
          });
          setUsers((prev) =>
            prev.map((u) =>
              u._id === targetUser._id ? { ...u, role: newRole } : u
            )
          );
          toast.success(
            `${targetUser.firstName} ${targetUser.lastName} role updated to '${newRole}'`,
            "Role Updated"
          );
        } catch (err) {
          toast.error(err.message || "Failed to update user role", "Role Update Failed");
        } finally {
          setUpdatingId(null);
        }
      },
    });
  };

  const filtered = users.filter((u) => {
    const fullName = `${u.firstName || ""} ${u.lastName || ""}`.toLowerCase();
    const company = (u.profile?.companyName || u.companyName || "").toLowerCase();
    const email = (u.email || "").toLowerCase();
    const term = searchTerm.toLowerCase();

    const matchesSearch =
      fullName.includes(term) || company.includes(term) || email.includes(term);

    const isOwing = Number(u.outstandingCredit || 0) > 0 || Boolean(u.isOwingCredit);

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "admins" && (u.role === "admin" || u.role === "subAdmin" || u.role === "superadmin")) ||
      (statusFilter === "customers" && u.role === "customer") ||
      (statusFilter === "vip" && Boolean(u.isVipCreditPartner)) ||
      (statusFilter === "owing" && isOwing) ||
      (statusFilter === "active" && u.accountStatus !== "suspended") ||
      (statusFilter === "suspended" && u.accountStatus === "suspended") ||
      (statusFilter === "updated" && u.profileUpdatedAt);

    return matchesSearch && matchesStatus;
  });

  const vipCount = users.filter((u) => u.isVipCreditPartner).length;
  const owingCount = users.filter((u) => Number(u.outstandingCredit || 0) > 0 || u.isOwingCredit).length;

  return (
    <div className="space-y-5 sm:space-y-6 px-1 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-green-700" />
            User & Account Registry
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5 leading-relaxed">
            Manage buyer outlets, VIP Credit Partners, admin accounts, and enforce system security controls.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto shrink-0">
          <ExportButton kind="customers" />
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              placeholder="Search by name, store, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-brand-green-500 outline-none"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none flex-nowrap">
        <button
          onClick={() => setStatusFilter("all")}
          aria-pressed={statusFilter === 'all'}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap shrink-0 ${
            statusFilter === "all"
              ? "bg-slate-800 text-white border border-slate-800"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          All Accounts ({users.length})
        </button>
        <button
          onClick={() => setStatusFilter("vip")}
          aria-pressed={statusFilter === 'vip'}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
            statusFilter === "vip"
              ? "bg-teal-50 text-teal-900 border border-teal-500 ring-1 ring-inset ring-teal-500"
              : "bg-white text-slate-600 hover:bg-teal-50 border border-slate-200"
          }`}
        >
          <span>VIP Credit Partners</span>
          <span className="text-[10px] px-2 py-0.5 bg-teal-50 text-teal-800 rounded-md font-semibold tabular-nums">
            {vipCount}
          </span>
        </button>
        <button
          onClick={() => setStatusFilter("owing")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
            statusFilter === "owing"
              ? "bg-rose-600 text-white shadow-xs"
              : "bg-white text-rose-900 hover:bg-rose-50 border border-rose-200"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
          <span>Owing Credit</span>
          <span className="text-[10px] px-2 py-0.2 bg-rose-100 text-rose-900 rounded-full font-extrabold">
            {owingCount}
          </span>
        </button>
        <button
          onClick={() => setStatusFilter("admins")}
          aria-pressed={statusFilter === 'admins'}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
            statusFilter === "admins"
              ? "bg-sky-50 text-sky-900 border border-sky-500 ring-1 ring-inset ring-sky-500"
              : "bg-white text-slate-600 hover:bg-sky-50 border border-slate-200"
          }`}
        >
          <Shield className="w-3.5 h-3.5 text-sky-700" />
          <span>Admins</span>
          <span className="text-[10px] px-2 py-0.5 bg-sky-50 text-sky-800 rounded-md font-semibold tabular-nums">
            {users.filter((u) => u.role === "admin" || u.role === "subAdmin" || u.role === "superadmin").length}
          </span>
        </button>
        <button
          onClick={() => setStatusFilter("customers")}
          aria-pressed={statusFilter === 'customers'}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap shrink-0 ${
            statusFilter === "customers"
              ? "bg-slate-100 text-slate-900 border border-slate-400 ring-1 ring-inset ring-slate-400"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          Buyers & Outlets ({users.filter((u) => u.role === "customer").length})
        </button>
        <button
          onClick={() => setStatusFilter("updated")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
            statusFilter === "updated"
              ? "bg-emerald-600 text-white shadow-xs"
              : "bg-white text-emerald-900 hover:bg-emerald-50 border border-emerald-200"
          }`}
        >
          <span>Profile Updated</span>
          <span className="text-[10px] px-2 py-0.2 bg-emerald-100 text-emerald-900 rounded-full font-extrabold">
            {users.filter((u) => u.profileUpdatedAt).length}
          </span>
        </button>
        <button
          onClick={() => setStatusFilter("suspended")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap shrink-0 ${
            statusFilter === "suspended"
              ? "bg-red-600 text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          Suspended
        </button>
      </div>

      {/* Users View Container */}
      {loading ? (
        <div className="p-12 text-center bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl animate-pulse text-xs text-slate-400">
          Syncing user accounts...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center shadow-xs">
          <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">No Users Found</p>
          <p className="text-xs text-slate-400 mt-1">No user accounts matched your search criteria.</p>
        </div>
      ) : (
        <>
          {/* Mobile Card List View (< 768px) */}
          <div className="md:hidden space-y-3">
            {filtered.map((u) => {
              const isSuspended = u.accountStatus === "suspended";
              const hasProfileUpdate = Boolean(u.profileUpdatedAt);
              const isSuperadminRole = u.role === "superadmin" || u.role === "super_admin";
              const owingAmount = Number(u.outstandingCredit || 0);
              const isOwing = owingAmount > 0 || Boolean(u.isOwingCredit);

              return (
                <div
                  key={u._id}
                  onClick={() => navigate(`/admin/customers/${u._id}`)}
                  className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs hover:border-brand-green-300 transition cursor-pointer space-y-3 relative"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <Avatar
                          src={getAvatarUrl(u)}
                          alt={`${u.firstName || "User"} ${u.lastName || ""}`.trim()}
                          size={40}
                          fallback={getInitials(u, "U")}
                          className="rounded-xl bg-brand-green-100 text-brand-green-900 shrink-0 border border-brand-green-200"
                        />
                        {isOwing && (
                          <span
                            className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-600 border-2 border-white shadow-xs"
                            title={`Owing Credit: ${formatCurrency(owingAmount)}`}
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-extrabold text-slate-900 text-xs leading-tight truncate flex items-center gap-1.5">
                            <span>{u.firstName} {u.lastName}</span>
                            {isOwing && (
                              <span
                                className="inline-block w-2 h-2 rounded-full bg-red-600 shrink-0"
                                title={`Owing VIP Credit: ${formatCurrency(owingAmount)}`}
                              />
                            )}
                          </p>
                          {u.isVipCreditPartner && (
                            <AccountRoleChip vip />
                          )}
                          {hasProfileUpdate && (
                            <span className="inline-flex items-center text-[9px] font-extrabold bg-emerald-100 text-emerald-900 px-1.5 py-0.2 rounded-full">
                              Updated
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-brand-green-700 font-bold uppercase truncate mt-0.5">
                          {u.profile?.companyName || "Independent Outlet"}
                        </p>
                        {isOwing && (
                          <p className="text-[10px] font-black text-red-600 mt-0.5">
                            ● Owing Credit: {formatCurrency(owingAmount)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === u._id ? null : u._id);
                        }}
                        className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition focus:outline-none"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {openMenuId === u._id && (
                        <div className="absolute right-0 top-8 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-40 text-left">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(null);
                              navigate(`/admin/customers/${u._id}`);
                            }}
                            className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Eye className="w-4 h-4 text-brand-green-600" /> View Details
                          </button>

                          <button
                            onClick={(e) => {
                              setOpenMenuId(null);
                              handleVipCreditToggle(e, u);
                            }}
                            className="w-full text-left px-4 py-2 text-xs font-semibold text-teal-800 hover:bg-teal-50 flex items-center gap-2"
                          >
                            <CreditCard className="w-4 h-4 text-teal-700" />
                            {u.isVipCreditPartner ? "Revoke VIP Credit" : "Make VIP Credit Partner"}
                          </button>

                          {isSuperAdmin && !isSuperadminRole && u._id !== currentUser?._id && (
                            <>
                              {u.role === "customer" ? (
                                <button
                                  onClick={(e) => {
                                    setOpenMenuId(null);
                                    handleRoleChange(e, u, "admin");
                                  }}
                                  className="w-full text-left px-4 py-2 text-xs font-semibold text-sky-800 hover:bg-sky-50 flex items-center gap-2"
                                >
                                  <UserPlus className="w-4 h-4 text-sky-700" /> Make Admin
                                </button>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    setOpenMenuId(null);
                                    handleRoleChange(e, u, "customer");
                                  }}
                                  className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                                >
                                  <UserMinus className="w-4 h-4 text-slate-500" /> Dismiss Admin
                                </button>
                              )}
                            </>
                          )}

                          <button
                            onClick={(e) => {
                              setOpenMenuId(null);
                              handleStatusToggle(e, u);
                            }}
                            className={`w-full text-left px-4 py-2 text-xs font-bold flex items-center gap-2 border-t border-slate-100 ${
                              isSuspended
                                ? "text-emerald-700 hover:bg-emerald-50"
                                : "text-red-600 hover:bg-red-50"
                            }`}
                          >
                            {isSuspended ? (
                              <>
                                <UserCheck className="w-4 h-4 text-emerald-600" /> Activate Account
                              </>
                            ) : (
                              <>
                                <UserX className="w-4 h-4 text-red-600" /> Suspend Account
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 space-y-1 border-t border-slate-100/80 pt-2">
                    <p className="flex items-center gap-1.5 font-medium truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {u.email}
                    </p>
                    {u.phone && (
                      <p className="flex items-center gap-1.5 font-medium">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {u.phone}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1 gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <AccountRoleChip role={u.role} />

                      <button
                        type="button"
                        onClick={(e) => handleVipCreditToggle(e, u)}
                        disabled={updatingId === u._id}
                        className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:cursor-not-allowed disabled:opacity-50 ${
                          u.isVipCreditPartner
                            ? "bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {u.isVipCreditPartner ? "VIP Partner ✓" : "+ Make VIP Partner"}
                      </button>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        isSuspended
                          ? "bg-red-100 text-red-800 border border-red-200"
                          : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isSuspended ? "bg-red-600" : "bg-emerald-600"}`} />
                      {isSuspended ? "Suspended" : "Active"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View (≥ 768px) */}
          <div className="hidden md:block bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-xs">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead>
                  <tr className="text-slate-400 font-extrabold border-b border-slate-100 bg-slate-50/80 uppercase tracking-wider text-[10px]">
                    <th className="py-4 px-5">User / Outlet Name</th>
                    <th className="py-4 px-4">System Role & Credit Tier</th>
                    <th className="py-4 px-4">Contact Info</th>
                    <th className="py-4 px-4">Location</th>
                    <th className="py-4 px-4 text-center">Status</th>
                    <th className="py-4 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {filtered.map((u) => {
                    const isSuspended = u.accountStatus === "suspended";
                    const hasProfileUpdate = Boolean(u.profileUpdatedAt);
                    const isSuperadminRole = u.role === "superadmin" || u.role === "super_admin";
                    const owingAmount = Number(u.outstandingCredit || 0);
                    const isOwing = owingAmount > 0 || Boolean(u.isOwingCredit);

                    return (
                      <tr
                        key={u._id}
                        onClick={() => navigate(`/admin/customers/${u._id}`)}
                        className="hover:bg-slate-50/80 transition cursor-pointer"
                      >
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <div className="relative shrink-0">
                              <Avatar
                                src={getAvatarUrl(u)}
                                alt={`${u.firstName || "User"} ${u.lastName || ""}`.trim()}
                                size={42}
                                fallback={getInitials(u, "U")}
                                className="rounded-xl bg-brand-green-100 text-brand-green-900 shrink-0 border border-brand-green-200"
                              />
                              {isOwing && (
                                <span
                                  className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-600 border-2 border-white shadow-xs"
                                  title={`Owing VIP Credit: ${formatCurrency(owingAmount)}`}
                                />
                              )}
                            </div>
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <p className="font-extrabold text-slate-900 leading-tight flex items-center gap-1.5">
                                  <span>{u.firstName} {u.lastName}</span>
                                  {isOwing && (
                                    <span
                                      className="inline-block w-2 h-2 rounded-full bg-red-600 shrink-0"
                                      title={`Owing VIP Credit: ${formatCurrency(owingAmount)}`}
                                    />
                                  )}
                                </p>
                                {hasProfileUpdate && (
                                  <span className="inline-flex items-center text-[9px] font-extrabold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full">
                                    Updated
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-tight">
                                {u.profile?.companyName || "Independent Outlet"}
                              </p>
                              {isOwing && (
                                <p className="text-[10px] font-black text-red-600">
                                  ● Owing Credit: {formatCurrency(owingAmount)}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex flex-col items-start gap-1">
                            <AccountRoleChip role={u.role} />
                            {u.isVipCreditPartner && (
                              <AccountRoleChip vip />
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-4 space-y-0.5 whitespace-nowrap">
                          <p className="text-slate-800 text-xs font-semibold flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            {u.email}
                          </p>
                          {u.phone && (
                            <p className="text-slate-500 text-[11px] flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              {u.phone}
                            </p>
                          )}
                        </td>

                        <td className="py-4 px-4 text-slate-600 text-xs font-semibold whitespace-nowrap">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {u.profile?.city || u.profile?.state
                              ? `${u.profile.city || ""}, ${u.profile.state || ""}`
                              : "Nigeria"}
                          </span>
                        </td>

                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full ${
                              isSuspended
                                ? "bg-red-100 text-red-800 border border-red-200"
                                : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isSuspended ? "bg-red-600" : "bg-emerald-600"
                              }`}
                            />
                            {isSuspended ? "Suspended" : "Active"}
                          </span>
                        </td>

                        <td className="py-4 px-5 text-right whitespace-nowrap relative">
                          <div
                            className="inline-flex items-center gap-1.5 text-left"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={(e) => handleVipCreditToggle(e, u)}
                              disabled={updatingId === u._id}
                              className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:cursor-not-allowed disabled:opacity-50 ${
                                u.isVipCreditPartner
                                  ? "bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100"
                                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                              }`}
                              title={u.isVipCreditPartner ? "Click to revoke VIP Credit Partner status" : "Click to upgrade to VIP Credit Partner"}
                            >
                              <span>{u.isVipCreditPartner ? "VIP Partner ✓" : "Make VIP"}</span>
                            </button>

                            <div className="relative">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(openMenuId === u._id ? null : u._id);
                                }}
                                className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition focus:outline-none"
                                title="Actions menu"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              {openMenuId === u._id && (
                                <div className="absolute right-0 mt-1 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-40 animate-fadeIn text-left">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuId(null);
                                      navigate(`/admin/customers/${u._id}`);
                                    }}
                                    className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                  >
                                    <Eye className="w-4 h-4 text-brand-green-600" /> View Details
                                  </button>

                                  <button
                                    onClick={(e) => {
                                      setOpenMenuId(null);
                                      handleVipCreditToggle(e, u);
                                    }}
                                    className="w-full text-left px-4 py-2 text-xs font-semibold text-teal-800 hover:bg-teal-50 flex items-center gap-2"
                                  >
                                    <CreditCard className="w-4 h-4 text-teal-700" />
                                    {u.isVipCreditPartner ? "Revoke VIP Credit" : "Make VIP Credit Partner"}
                                  </button>

                                  {isSuperAdmin && !isSuperadminRole && u._id !== currentUser?._id && (
                                    <>
                                      {u.role === "customer" ? (
                                        <button
                                          onClick={(e) => {
                                            setOpenMenuId(null);
                                            handleRoleChange(e, u, "admin");
                                          }}
                                          className="w-full text-left px-4 py-2 text-xs font-semibold text-sky-800 hover:bg-sky-50 flex items-center gap-2"
                                        >
                                          <UserPlus className="w-4 h-4 text-sky-700" /> Make Admin
                                        </button>
                                      ) : (
                                        <button
                                          onClick={(e) => {
                                            setOpenMenuId(null);
                                            handleRoleChange(e, u, "customer");
                                          }}
                                          className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                                        >
                                          <UserMinus className="w-4 h-4 text-slate-500" /> Dismiss Admin
                                        </button>
                                      )}
                                    </>
                                  )}

                                  <button
                                    onClick={(e) => {
                                      setOpenMenuId(null);
                                      handleStatusToggle(e, u);
                                    }}
                                    className={`w-full text-left px-4 py-2 text-xs font-bold flex items-center gap-2 border-t border-slate-100 ${
                                      isSuspended
                                        ? "text-emerald-700 hover:bg-emerald-50"
                                        : "text-red-600 hover:bg-red-50"
                                    }`}
                                  >
                                    {isSuspended ? (
                                      <>
                                        <UserCheck className="w-4 h-4 text-emerald-600" /> Activate Account
                                      </>
                                    ) : (
                                      <>
                                        <UserX className="w-4 h-4 text-red-600" /> Suspend Account
                                      </>
                                    )}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Customers;
