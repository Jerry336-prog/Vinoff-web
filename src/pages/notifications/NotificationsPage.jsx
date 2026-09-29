import React, { useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { NotificationContext } from "../../context/NotificationContext";
import { AuthContext } from "../../context/AuthContext";
import {
  Bell,
  CheckCheck,
  Package,
  CreditCard,
  FileText,
  UserCheck,
  MessageSquare,
  Clock,
  ArrowRight,
} from "lucide-react";
import Button from "../../components/ui/Button";

export const NotificationsPage = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, fetchNotifications } =
    useContext(NotificationContext);
  const { isAdmin } = useContext(AuthContext);
  const navigate = useNavigate();

  const getIcon = (type) => {
    switch (type) {
      case "NEW_ORDER":
      case "ORDER_STATUS_CHANGED":
        return <Package className="w-4 h-4 text-emerald-600" />;
      case "PAYMENT_UPLOADED":
      case "PAYMENT_CONFIRMED":
        return <CreditCard className="w-4 h-4 text-brand-yellow-600" />;
      case "INVOICE_CREATED":
      case "INVOICE_UPDATED":
        return <FileText className="w-4 h-4 text-blue-600" />;
      case "PROFILE_UPDATED":
        return <UserCheck className="w-4 h-4 text-brand-green-600" />;
      case "NEW_MESSAGE":
        return <MessageSquare className="w-4 h-4 text-purple-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  const handleNotificationClick = async (item) => {
    const isUnread = !(item.isRead || item.read);
    if (isUnread) {
      await markAsRead(item._id);
    }

    // Determine target route based on type / metadata / relatedEntity
    const entityId = item.relatedEntityId || item.relatedEntity?.id;
    if (item.type === "PROFILE_UPDATED") {
      if (isAdmin && entityId) {
        navigate(`/admin/customers/${entityId}`);
      } else if (isAdmin) {
        navigate("/admin/customers");
      } else {
        navigate("/profile");
      }
    } else if (item.type === "NEW_ORDER" || item.type === "ORDER_STATUS_CHANGED" || item.type === "PAYMENT_UPLOADED" || item.type === "PAYMENT_CONFIRMED") {
      if (isAdmin && entityId) {
        navigate(`/admin/orders`);
      } else if (entityId) {
        navigate(`/orders/${entityId}`);
      } else {
        navigate(isAdmin ? "/admin/orders" : "/orders");
      }
    } else if (item.type === "INVOICE_CREATED" || item.type === "INVOICE_UPDATED") {
      if (isAdmin) {
        navigate("/admin/invoices");
      } else if (entityId) {
        navigate(`/invoices/${entityId}`);
      } else {
        navigate("/invoices");
      }
    } else if (item.type === "NEW_MESSAGE") {
      navigate(isAdmin && entityId ? `/admin/chats?room=${entityId}` : isAdmin ? "/admin/chats" : "/chat");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 sm:space-y-6 px-1 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4 bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-brand-green-50 border border-brand-green-100 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 text-brand-green-700" />
            </div>
            <span>Notification Center</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Real-time updates for order status, invoices, payments, and system notifications.
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={markAllAsRead}
            icon={CheckCheck}
            className="rounded-xl w-full sm:w-auto shrink-0 justify-center text-xs py-2.5"
          >
            Mark All as Read ({unreadCount})
          </Button>
        )}
      </div>

      {/* List */}
      {notifications.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center shadow-xs">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300">
            <Bell className="w-7 h-7" />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-slate-700">No Notifications Yet</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
            You're all caught up! New order status updates, payment confirmations, and system alerts will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xs divide-y divide-slate-100">
          {notifications.map((item) => {
            const isUnread = !(item.isRead || item.read);
            return (
              <div
                key={item._id}
                onClick={() => handleNotificationClick(item)}
                className={`p-4 sm:p-5 flex items-start gap-3 sm:gap-4 transition-all cursor-pointer hover:bg-slate-50 relative ${
                  isUnread
                    ? "bg-emerald-50/40 border-l-4 border-l-emerald-500"
                    : "border-l-4 border-l-transparent"
                }`}
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 border border-slate-200/60 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  {getIcon(item.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2">
                    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                      <h4
                        className={`text-xs sm:text-sm font-bold truncate ${
                          isUnread ? "text-slate-900 font-extrabold" : "text-slate-700"
                        }`}
                      >
                        {item.title}
                      </h4>
                      {item.type === "PROFILE_UPDATED" && (
                        <span className="inline-flex items-center text-[10px] font-bold bg-emerald-100/80 text-emerald-900 px-2 py-0.5 rounded-full border border-emerald-200/50">
                          Profile Updated
                        </span>
                      )}
                    </div>

                    <span className="text-[10px] text-slate-400 shrink-0 flex items-center gap-1 font-medium">
                      <Clock className="w-3 h-3 text-slate-300" />
                      {new Date(item.createdAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed break-words">
                    {item.message}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100/60 pt-2.5">
                    <span className="text-[11px] font-bold text-brand-green-700 hover:text-brand-green-800 flex items-center gap-1">
                      View details <ArrowRight className="w-3 h-3" />
                    </span>
                    {isUnread && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(item._id);
                        }}
                        className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 hover:bg-emerald-200/80 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>

                {isUnread && (
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-2 sm:hidden" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
