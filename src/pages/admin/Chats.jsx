import React, { useContext, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChatContext } from "../../context/ChatContext";
import api from "../../services/api";
import ChatSidebar from "../../components/chat/ChatSidebar";
import ChatWindow from "../../components/chat/ChatWindow";
import { formatCurrency } from "../../utils/formatCurrency";
import Badge from "../../components/ui/Badge";
import Avatar from "../../components/ui/Avatar";
import {
  MessageSquare,
  Download,
  Plus,
  Trash2,
  X,
  Image,
  ArrowLeft,
} from "lucide-react";
import { downloadInvoicePDF } from "../../utils/generatePDF";
import { unwrapApiList } from "../../utils/apiResponse";
import { getInitials } from "../../utils/avatar";
import Button from "../../components/ui/Button";
import { useToast } from "../../context/ToastContext";

export const Chats = () => {
  const { toast, showModal } = useToast();
  const [searchParams] = useSearchParams();
  const {
    rooms,
    activeRoom,
    selectRoom,
    sendMessage,
    updateRoomStatus,
    createOrGetCustomerRoom,
    deleteRoom,
  } = useContext(ChatContext);

  const [customerOrders, setCustomerOrders] = useState([]);
  const [customerInvoices, setCustomerInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loadingContext, setLoadingContext] = useState(false);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [newChatCustomerId, setNewChatCustomerId] = useState("");
  const [creatingChat, setCreatingChat] = useState(false);
  const requestedRoomId = searchParams.get("room");
  const requestedCustomerId = searchParams.get("customer");
  const createdForCustomerRef = useRef(null);

  // Sync customer orders & invoices when active customer changes
  const activeCustomerId =
    activeRoom?.customerId ||
    activeRoom?.customer?._id ||
    activeRoom?.customer?.id ||
    (typeof activeRoom?.customer === "string" ? activeRoom.customer : null);

  const moneyValue = (record) =>
    record?.totalAmount ?? record?.total ?? record?.pricing?.total ?? record?.amountDue ?? 0;
  const recordId = (record) => record?._id || record?.id;
  const recordDate = (record) => {
    const rawDate = record?.createdAt || record?.date || record?.issuedAt;
    if (!rawDate) return "No date";
    const date = new Date(rawDate);
    return Number.isNaN(date.getTime()) ? "No date" : date.toLocaleDateString();
  };

  const lastFetchedCustomerIdRef = useRef(null);

  useEffect(() => {
    if (activeCustomerId) {
      const isNewCustomer = lastFetchedCustomerIdRef.current !== activeCustomerId;
      if (isNewCustomer) {
        setLoadingContext(true);
        lastFetchedCustomerIdRef.current = activeCustomerId;
      }
      Promise.all([
        api.get(`/api/orders?customer=${activeCustomerId}`).catch(() => ({ data: [] })),
        api.get(`/api/invoices?customer=${activeCustomerId}`).catch(() => ({ data: [] })),
      ])
        .then(([ordRes, invRes]) => {
          const orders = unwrapApiList(ordRes);
          const invoices = unwrapApiList(invRes);
          setCustomerOrders(Array.isArray(orders) ? orders : []);
          setCustomerInvoices(Array.isArray(invoices) ? invoices : []);
        })
        .finally(() => setLoadingContext(false));
    } else {
      lastFetchedCustomerIdRef.current = null;
      setCustomerOrders([]);
      setCustomerInvoices([]);
    }
  }, [activeCustomerId]);

  useEffect(() => {
    api
      .get("/api/admin/customers?limit=100")
      .then((res) => setCustomers(unwrapApiList(res)))
      .catch(() => setCustomers([]));
  }, []);

  // Support deep link or query param selection
  useEffect(() => {
    if (requestedRoomId) {
      if (activeRoom?.roomId !== requestedRoomId) {
        selectRoom(requestedRoomId);
      }
      return;
    }

    if (requestedCustomerId) {
      const matchingRoom = rooms.find(
        (room) =>
          String(room.customerId || room.customer?._id || room.customer?.id || "") ===
          String(requestedCustomerId),
      );

      if (matchingRoom && activeRoom?.roomId !== matchingRoom.roomId) {
        selectRoom(matchingRoom.roomId);
        return;
      }

      if (!matchingRoom && createdForCustomerRef.current !== requestedCustomerId) {
        createdForCustomerRef.current = requestedCustomerId;
        createOrGetCustomerRoom(null, requestedCustomerId);
      }
      return;
    }

    const requestedRoom = localStorage.getItem("vinoff_admin_selected_chat");
    if (requestedRoom) {
      selectRoom(requestedRoom);
      localStorage.removeItem("vinoff_admin_selected_chat");
    }
  }, [requestedRoomId, requestedCustomerId, rooms, activeRoom?.roomId, selectRoom, createOrGetCustomerRoom]);

  const handleStartConversation = async (e) => {
    e.preventDefault();
    if (!newChatCustomerId) return;
    setCreatingChat(true);
    try {
      await createOrGetCustomerRoom(null, newChatCustomerId);
      setIsNewChatOpen(false);
      setNewChatCustomerId("");
      toast.success("Conversation opened for selected customer.", "Chat Ready");
    } catch (err) {
      toast.error(err.message || "Could not start conversation", "Chat Error");
    } finally {
      setCreatingChat(false);
    }
  };

  const handleDeleteActiveChat = () => {
    if (!activeRoom?.roomId) return;
    showModal({
      title: "Delete Chat History",
      message: "This will remove the conversation from the admin chat history. You can still start a new conversation with this customer later.",
      confirmText: "Delete Chat",
      cancelText: "Cancel",
      type: "warning",
      onConfirm: async () => {
        try {
          await deleteRoom(activeRoom.roomId);
          toast.success("Chat removed from history.", "Chat Deleted");
        } catch (err) {
          toast.error(err.message || "Could not delete chat", "Delete Failed");
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-brand-green-700" />
            Customer Communication Hub
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Review customer inquiries, confirm payment transfers, and dispatch system updates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeRoom && (
            <Button
              size="sm"
              variant="outline"
              icon={Trash2}
              onClick={handleDeleteActiveChat}
              className="rounded-xl text-red-600 hover:bg-red-50 border-red-200"
            >
              Delete Chat
            </Button>
          )}
          <Button
            size="sm"
            variant="primary"
            icon={Plus}
            onClick={() => setIsNewChatOpen(true)}
            className="rounded-xl"
          >
            New Conversation
          </Button>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm flex flex-col md:flex-row h-[calc(100vh-200px)] min-h-[550px]">
        {/* Sidebar: Conversation List */}
        <div className={`w-full md:w-64 lg:w-72 border-r border-slate-200 shrink-0 h-full overflow-hidden flex-col ${activeRoom ? 'hidden md:flex' : 'flex'}`}>
          <ChatSidebar
            rooms={rooms}
            activeRoom={activeRoom}
            onSelectRoom={selectRoom}
          />
        </div>

        {/* Center Panel: Active Chat Window (Dominant Space) */}
        <div className={`flex-1 h-full flex-col min-w-0 ${!activeRoom ? 'hidden md:flex' : 'flex'}`}>
          {activeRoom ? (
            <ChatWindow
              room={activeRoom}
              onSendMessage={sendMessage}
              onUpdateStatus={updateRoomStatus}
              isAdmin={true}
              onBack={() => selectRoom(null)}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                <MessageSquare className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-700">No Chat Selected</p>
              <p className="text-xs text-slate-400 max-w-xs">
                Select a customer conversation from the list to view message history, transaction slips, and reply.
              </p>
            </div>
          )}
        </div>

        {/* Right Panel: Customer & Order Context */}
        {activeRoom && (
          <div className="hidden xl:block w-64 lg:w-70 border-l border-slate-200 p-4 overflow-y-auto space-y-4 bg-slate-50/50 shrink-0">
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                Customer Profile
              </h3>
              <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-2 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <Avatar
                    src={activeRoom.avatarUrl}
                    alt={activeRoom.customerName}
                    size={38}
                    fallback={getInitials(activeRoom.customer || activeRoom, "C")}
                    className="rounded-xl border border-brand-green-100 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs text-slate-900 leading-tight truncate">
                      {activeRoom.customerName}
                    </p>
                    <p className="text-[10px] text-brand-green-700 font-bold truncate">
                      {activeRoom.businessName}
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 truncate">
                  {activeRoom.customer?.email}
                </p>
                {activeRoom.customer?.phone && (
                  <p className="text-[11px] text-slate-500 truncate">
                    {activeRoom.customer?.phone}
                  </p>
                )}
              </div>
            </div>

            {/* Linked Order or Recent Orders */}
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                <span>Recent Orders</span>
                <span className="text-[10px] font-bold text-slate-400">
                  ({customerOrders.length})
                </span>
              </h3>

              {loadingContext ? (
                <p className="text-[11px] text-slate-400 animate-pulse">Syncing context...</p>
              ) : customerOrders.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic">No orders found for customer.</p>
              ) : (
                <div className="space-y-2">
                  {customerOrders.slice(0, 3).map((ord) => (
                    <div
                      key={recordId(ord)}
                      className="block w-full bg-white border border-slate-200 rounded-2xl p-2.5 text-xs space-y-2 shadow-xs"
                    >
                      <div className="flex items-start gap-1.5 justify-between">
                        <span className="font-mono font-black text-slate-900 text-[11px] leading-snug truncate">
                          {ord.orderNumber}
                        </span>
                        <Badge
                          status={ord.status}
                          className="text-[8px] px-1.5 py-0.5 leading-tight text-center justify-center shrink-0"
                        />
                      </div>
                      <div className="flex items-end justify-between gap-2 text-[10px]">
                        <span className="text-slate-500">{recordDate(ord)}</span>
                        <strong className="text-slate-900 text-xs tabular-nums text-right font-bold">
                          {formatCurrency(moneyValue(ord))}
                        </strong>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <Link
                          to="/admin/orders"
                          className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[9px] font-bold text-slate-600 hover:bg-slate-100"
                        >
                          Open Order
                        </Link>
                        {ord.paymentScreenshot?.url && (
                          <button
                            type="button"
                            onClick={() => window.open(ord.paymentScreenshot.url, "_blank")}
                            className="inline-flex items-center justify-center gap-1 rounded-lg border border-brand-green-200 bg-brand-green-50 px-2 py-1 text-[9px] font-bold text-brand-green-700 hover:bg-brand-green-100"
                          >
                            <Image className="w-3 h-3" />
                            Receipt
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Invoices */}
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                <span>Customer Invoices</span>
                <span className="text-[10px] font-bold text-slate-400">
                  ({customerInvoices.length})
                </span>
              </h3>

              {customerInvoices.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic">No invoices issued yet.</p>
              ) : (
                <div className="space-y-2">
                  {customerInvoices.slice(0, 3).map((inv) => (
                    <div
                      key={recordId(inv)}
                      className="block w-full bg-white border border-slate-200 rounded-2xl p-2.5 text-xs space-y-2 shadow-xs"
                    >
                      <div className="flex items-start gap-1.5 justify-between">
                        <span className="font-mono font-black text-slate-900 text-[11px] leading-snug truncate">
                          {inv.invoiceNumber}
                        </span>
                        <Badge
                          status={inv.status}
                          className="text-[8px] px-1.5 py-0.5 leading-tight text-center justify-center shrink-0"
                        />
                      </div>
                      <div className="flex items-end justify-between gap-2 text-[10px]">
                        <span className="text-slate-500">{recordDate(inv)}</span>
                        <strong className="text-brand-green-800 text-xs tabular-nums text-right font-bold">
                          {formatCurrency(moneyValue(inv))}
                        </strong>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <Link
                          to={`/admin/invoices/${recordId(inv)}`}
                          className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[9px] font-bold text-slate-600 hover:bg-slate-100"
                        >
                          View Invoice
                        </Link>
                        <button
                          type="button"
                          onClick={() => downloadInvoicePDF(recordId(inv))}
                          className="inline-flex items-center justify-center gap-1 rounded-lg border border-brand-green-200 bg-brand-green-50 px-2 py-1 text-[9px] font-bold text-brand-green-700 hover:bg-brand-green-100"
                          title="Download Invoice PDF"
                        >
                          <Download className="w-3 h-3" />
                          Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {isNewChatOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">Start New Conversation</h3>
                <p className="text-xs text-slate-500 mt-0.5">Choose a customer to open a fresh chat room.</p>
              </div>
              <button onClick={() => setIsNewChatOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleStartConversation} className="space-y-4">
              <select
                value={newChatCustomerId}
                onChange={(e) => setNewChatCustomerId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-semibold focus:ring-2 focus:ring-brand-green-500 outline-none"
                required
              >
                <option value="">Select customer...</option>
                {customers.map((customer) => (
                  <option key={customer._id || customer.id} value={customer._id || customer.id}>
                    {customer.firstName} {customer.lastName} - {customer.profile?.companyName || customer.email}
                  </option>
                ))}
              </select>
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <Button size="sm" variant="outline" onClick={() => setIsNewChatOpen(false)} className="rounded-xl">
                  Cancel
                </Button>
                <Button size="sm" type="submit" isLoading={creatingChat} className="rounded-xl">
                  Start Chat
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chats;
