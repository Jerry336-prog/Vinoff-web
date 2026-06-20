import React, { useContext, useState } from "react";
import { ChatContext } from "../../context/ChatContext";
import ChatWindow from "../../components/chat/ChatWindow";
import { Info, HelpCircle } from "lucide-react";
import InvoiceViewer from "../../modules/invoice/components/InvoiceViewer";
import { useInvoice } from "../../modules/invoice/hooks/useInvoice";

export const ChatPage = () => {
  const chatContext = useContext(ChatContext) || {};
  const { activeRoom, sendMessage, updateRoomStatus } = chatContext;
  const { getInvoiceByNumber, getCustomerInvoices } = useInvoice();

  const [activeInvoice, setActiveInvoice] = useState(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const handleViewInvoice = async (invoiceRef) => {
    try {
      if (!invoiceRef) return;

      // Try 1: Direct lookup by invoiceNumber field
      try {
        const invoice = await getInvoiceByNumber(invoiceRef);
        setActiveInvoice(invoice);
        setIsViewerOpen(true);
        return;
      } catch {
        // invoiceRef doesn't match any invoice doc's invoiceNumber — fall through
      }

      // Try 2: The invoiceRef might be from an order-creation message.
      // Look up all invoices for this customer and find one linked to the same order.
      if (activeRoom?.customerId) {
        const invoices = await getCustomerInvoices(activeRoom.customerId);
        if (invoices.length > 0) {
          // Show the most recent invoice for this customer
          setActiveInvoice(invoices[0]);
          setIsViewerOpen(true);
          return;
        }
      }

      // No invoice found at all
      alert("The admin hasn't generated an invoice for this order yet. Please wait for the admin to create one.");
    } catch (err) {
      console.error("Failed to load invoice:", err);
      alert("This invoice is currently unavailable. Please try again later.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight font-sans">
          Business Support Chat
        </h2>
        <p className="text-xs text-slate-500 font-medium">
          Chat directly with Vinoff Wholesales to request custom invoices and
          confirm bank payments.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Chat Window Box */}
        <div className="lg:col-span-3 h-[calc(100dvh-220px)] min-h-[450px] lg:h-[600px]">
          {activeRoom ? (
            <ChatWindow
              room={activeRoom}
              onSendMessage={sendMessage}
              onUpdateStatus={updateRoomStatus}
              isAdmin={false}
              onViewInvoice={handleViewInvoice}
            />
          ) : (
            <div className="h-full bg-white border border-slate-200 rounded-3xl p-6 flex flex-col items-center justify-center text-center animate-pulse text-slate-400">
              <p className="text-sm font-semibold">Syncing support room...</p>
            </div>
          )}
        </div>

        {/* Informative Side Panel */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4 text-xs leading-relaxed">
          <h3 className="font-extrabold text-slate-800 text-sm tracking-wide uppercase border-b border-slate-100 pb-2.5 flex items-center gap-1.5">
            <Info className="w-4.5 h-4.5 text-brand-green-600" />
            Wholesale Chat Terms
          </h3>

          <div className="space-y-3.5">
            <div>
              <p className="font-bold text-slate-700">🧾 Custom Invoices</p>
              <p className="text-slate-500 mt-1">
                Need specific quantities or logistics? Request a custom invoice
                here; admins will write and push it to this channel.
              </p>
            </div>

            <div>
              <p className="font-bold text-slate-700">📸 Wire Slip Approval</p>
              <p className="text-slate-500 mt-1">
                Upload transfer screenshots by pressing the camera/image button
                in the chat inputs. Support will inspect and approve.
              </p>
            </div>

            <div>
              <p className="font-bold text-slate-700">💬 Simulated Response</p>
              <p className="text-slate-500 mt-1">
                This demo includes an automatic support responder. Ask about
                "discounts", "payments", or "invoices" to see it reply!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Viewer Modal for Customer */}
      <InvoiceViewer
        invoice={activeInvoice}
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        readOnly={true}
      />
    </div>
  );
};

export default ChatPage;
