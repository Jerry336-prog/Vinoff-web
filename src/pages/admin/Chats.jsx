import React, { useContext, useEffect, useState } from "react";
import { ChatContext } from "../../context/ChatContext";
import { useInvoice } from "../../modules/invoice/hooks/useInvoice";
import { dbGetOrdersByCustomer } from "../../services/firebase/db";
import ChatSidebar from "../../components/chat/ChatSidebar";
import ChatWindow from "../../components/chat/ChatWindow";
import InvoiceForm from "../../modules/invoice/components/InvoiceForm";
import InvoiceViewer from "../../modules/invoice/components/InvoiceViewer";
import InvoiceStatusBadge from "../../modules/invoice/components/InvoiceStatusBadge";
import { formatCurrency } from "../../utils/formatCurrency";
import { FileText, CheckCircle, Edit2, Eye, Sparkles } from "lucide-react";
import { showModal } from "../../services/ui/modal";

export const Chats = () => {
  const {
    rooms,
    activeRoom,
    selectRoom,
    sendMessage,
    updateRoomStatus,
    refreshRooms,
  } = useContext(ChatContext);
  const { getCustomerInvoices, updateInvoice, createInvoice } = useInvoice();

  // In-chat active invoice states
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [invoicePrefill, setInvoicePrefill] = useState(null);

  // Sync active invoice when activeRoom changes
  useEffect(() => {
    if (activeRoom) {
      getCustomerInvoices(activeRoom.customerId)
        .then((list) => {
          if (list.length > 0) {
            setActiveInvoice(list[0]); // most recent
          } else {
            setActiveInvoice(null);
          }
        })
        .catch(console.error);
    } else {
      setActiveInvoice(null);
    }
  }, [activeRoom, getCustomerInvoices]);

  // Hook to check if order page requested a specific chat room on click
  useEffect(() => {
    const requestedRoom = localStorage.getItem("vinoff_admin_selected_chat");
    if (requestedRoom) {
      selectRoom(requestedRoom);
      localStorage.removeItem("vinoff_admin_selected_chat");
    }
  }, [selectRoom]);

  const handleGenerateInvoiceClick = async () => {
    if (!activeRoom) return;

    // Prefill customer metadata
    const prefill = {
      customerId: activeRoom.customerId,
      customerName: activeRoom.customerName,
      businessName: activeRoom.businessName,
      items: [],
      discount: 0,
      deposit: 0,
      status: "Pending",
      notes: "",
    };

    try {
      // Look for a pending/recent order to prefill items
      const orders = await dbGetOrdersByCustomer(activeRoom.customerId);
      const pendingOrder = orders.find(
        (o) =>
          o.status === "Pending Payment" ||
          o.status === "Awaiting Confirmation",
      );
      if (pendingOrder) {
        prefill.orderId = pendingOrder.id;

        // Map order items into invoice item shape expected by invoice engine / form
        prefill.items = (pendingOrder.items || []).map((item) => {
          // item.price in orders was the per-selected-package price (cartonPrice if isCarton else unitPrice)
          const unitsPerCarton = item.unitsPerCarton || 12;
          let cartonPrice = item.cartonPrice ?? null;
          let unitPrice = item.unitPrice ?? null;

          if (item.isCarton) {
            // If the order stored the selected carton price in item.price, use it
            cartonPrice = cartonPrice || item.price || 0;
            // derive unit price from cartonPrice if not provided
            unitPrice = unitPrice || Number(cartonPrice) / unitsPerCarton;
          } else {
            // single unit purchased
            unitPrice = unitPrice || item.price || 0;
            // derive carton price from unit price if not provided
            cartonPrice = cartonPrice || Number(unitPrice) * unitsPerCarton;
          }

          return {
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            isCarton: !!item.isCarton,
            cartonPrice: Number(cartonPrice) || 0,
            unitPrice: Number(unitPrice) || 0,
            unitsPerCarton: Number(unitsPerCarton) || 12,
          };
        });

        prefill.discount = pendingOrder.discount || 0;
        prefill.deposit = pendingOrder.deposit || 0;
        prefill.notes = `Prefilled from Order Ref: ${pendingOrder.id}`;

        // Auto-create invoice from order items
        try {
          const created = await createInvoice(prefill);
          setActiveInvoice(created);

          // Post System message in chat indicating invoice created
          await sendMessage(
            activeRoom.roomId,
            `Invoice ${created.invoiceNumber} generated successfully.`,
            {
              type: "system",
              invoiceRef: created.invoiceNumber,
              orderRef: created.orderId || pendingOrder.id,
            },
          );

          // Open viewer for quick inspection
          setIsViewerOpen(true);
          return;
        } catch (err) {
          console.error("Failed to create invoice automatically:", err);
          // fallthrough to opening form prefilled
        }
      }
    } catch (err) {
      console.warn("Failed to prefill order items:", err);
    }

    // If we reach here, open form with prefill (either no pending order or auto-create failed)
    setInvoicePrefill(prefill);
    setIsFormOpen(true);
  };

  const handleInvoiceSave = async (savedInvoice) => {
    // 1. Update local state
    setActiveInvoice(savedInvoice);

    // 2. Format proper chat system text
    const isEdit = !!invoicePrefill?.id;
    const msgText = isEdit
      ? `Invoice ${savedInvoice.invoiceNumber} updated.`
      : `Invoice ${savedInvoice.invoiceNumber} generated successfully.`;

    // 3. Post System message in chat
    await sendMessage(activeRoom.roomId, msgText, {
      type: "system",
      invoiceRef: savedInvoice.invoiceNumber,
      image: savedInvoice.pdfUrl,
      invoicePdfUrl: savedInvoice.pdfUrl,
      orderRef: savedInvoice.orderId,
    });
  };

  const handleMarkPaid = async () => {
    if (!activeInvoice) return;
    try {
      const updated = await updateInvoice(activeInvoice.id, {
        status: "Paid",
        deposit: activeInvoice.total,
        balance: 0,
      });
      setActiveInvoice(updated);

      // Post updated invoice in chat
      await sendMessage(
        activeRoom.roomId,
        `Invoice ${updated.invoiceNumber} updated.`,
        {
          type: "system",
          invoiceRef: updated.invoiceNumber,
          image: updated.pdfUrl,
          invoicePdfUrl: updated.pdfUrl,
          orderRef: updated.orderId,
        },
      );
    } catch (err) {
      await showModal({
        title: "Update Failed",
        message: "Failed to mark invoice as paid: " + err.message,
        tone: "danger",
      });
    }
  };

  const handleEditInvoiceClick = () => {
    if (!activeInvoice) return;
    setInvoicePrefill(activeInvoice);
    setIsFormOpen(true);
  };

  const handleViewInvoiceClick = () => {
    setIsViewerOpen(true);
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col md:flex-row gap-6">
      {/* Sidebar selection */}
      <div
        className={`w-full md:w-80 h-full flex-shrink-0 ${activeRoom ? "hidden md:block" : "block"}`}
      >
        <ChatSidebar
          rooms={rooms}
          activeRoom={activeRoom}
          onSelectRoom={selectRoom}
        />
      </div>

      {/* Main chat window box */}
      <div
        className={`flex-grow h-full min-w-0 flex flex-col ${!activeRoom ? "hidden md:flex" : "flex"}`}
      >
        {activeRoom ? (
          <div className="flex-grow h-full flex flex-col relative min-h-0 bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            {/* Active Invoice Quick Control Banner (Top) */}
            {activeInvoice && (
              <div className="bg-gradient-to-r from-brand-green-50 to-slate-50 border-b border-slate-200/80 px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 animate-fade-in">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-brand-green-100 flex items-center justify-center text-brand-green-700">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-xs">
                    <p className="font-extrabold text-slate-800">
                      Active:{" "}
                      <span className="font-mono text-slate-900">
                        {activeInvoice.invoiceNumber}
                      </span>
                    </p>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                      Total:{" "}
                      <span className="font-mono">
                        {formatCurrency(activeInvoice.total)}
                      </span>{" "}
                      | Bal:{" "}
                      <span className="font-mono">
                        {formatCurrency(activeInvoice.balance)}
                      </span>
                    </p>
                  </div>
                  <div className="ml-1">
                    <InvoiceStatusBadge
                      status={activeInvoice.status}
                      className="text-[9px] px-1.5 py-0"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleViewInvoiceClick}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 text-[10px] font-bold text-slate-700 rounded-lg hover:border-brand-green-300 transition"
                    title="View Invoice Sheet"
                  >
                    <Eye className="w-3 h-3 text-slate-500" />
                    Inspect
                  </button>
                  <button
                    onClick={handleEditInvoiceClick}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 text-[10px] font-bold text-slate-700 rounded-lg hover:border-brand-green-300 transition"
                    title="Edit Invoice Details"
                  >
                    <Edit2 className="w-3 h-3 text-brand-green-600" />
                    Adjust
                  </button>
                  {activeInvoice.status !== "Paid" && (
                    <button
                      onClick={handleMarkPaid}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-900 text-[10px] font-black text-white rounded-lg transition"
                      title="Quick mark invoice as fully paid"
                    >
                      <CheckCircle className="w-3 h-3" />
                      Mark Paid
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Chat Area Window */}
            <div className="flex-1 min-h-0">
              <ChatWindow
                room={activeRoom}
                onSendMessage={sendMessage}
                onUpdateStatus={updateRoomStatus}
                isAdmin={true}
                onGenerateInvoice={handleGenerateInvoiceClick}
                onBack={() => selectRoom(null)}
              />
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center bg-white border border-slate-200 rounded-3xl p-6 text-center text-slate-400 shadow-sm">
            <h3 className="font-bold text-slate-800 text-sm">
              No Active Room Selected
            </h3>
            <p className="text-xs text-slate-500 max-w-xs mt-1">
              Select a customer room from the left sidebar list to respond,
              negotiate rates, or verify invoices.
            </p>
          </div>
        )}
      </div>

      {/* Invoice Modals */}
      <InvoiceForm
        isOpen={isFormOpen}
        initialData={invoicePrefill}
        onClose={() => {
          setIsFormOpen(false);
          setInvoicePrefill(null);
        }}
        onSave={handleInvoiceSave}
      />

      {activeInvoice && (
        <InvoiceViewer
          invoice={activeInvoice}
          isOpen={isViewerOpen}
          onClose={() => setIsViewerOpen(false)}
          onEdit={handleEditInvoiceClick}
          onSaveSuccess={(updated) => setActiveInvoice(updated)}
        />
      )}
    </div>
  );
};

export default Chats;
