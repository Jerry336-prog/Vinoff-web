import React from "react";
import { FileText, ClipboardCheck, Clock, Download } from "lucide-react";
import { Link } from "react-router-dom";
import Avatar from "../ui/Avatar";

const formatTimestamp = (timestamp) => {
  if (!timestamp) return "";
  let date;
  if (typeof timestamp.toDate === "function") {
    date = timestamp.toDate();
  } else if (timestamp.seconds !== undefined) {
    date = new Date(timestamp.seconds * 1000);
  } else {
    date = new Date(timestamp);
  }
  if (isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export const MessageBubble = ({ message, isSelf, onViewInvoice }) => {
  const isSystem = message.type === "system";

  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <div className="max-w-md bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-center shadow-xs">
          <div className="w-8 h-8 rounded-full bg-brand-green-100 text-brand-green-700 flex items-center justify-center mx-auto mb-2">
            <ClipboardCheck className="w-4 h-4" />
          </div>
          <p className="text-xs font-bold text-slate-800 tracking-tight">
            SYSTEM TRANSACTION UPDATE
          </p>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            {message.text}
          </p>

          {/* Action Links */}
          <div className="mt-3 flex items-center justify-center gap-2">
            {message.invoiceRef && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  if (message.invoicePdfUrl && message.invoicePdfUrl !== "https://pdfobject.com/pdf/sample.pdf") {
                    window.open(message.invoicePdfUrl, "_blank");
                  } else if (onViewInvoice) {
                    onViewInvoice(message.invoiceRef);
                  } else {
                    window.alert("Invoice document not available for preview.");
                  }
                }}
                className="inline-flex items-center gap-1 bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 px-2.5 py-1.5 rounded-lg shadow-xs transition cursor-pointer"
              >
                <FileText className="w-3 h-3 text-brand-green-600" />
                {message.text.includes("updated")
                  ? "View Updated Invoice"
                  : "View Invoice"}
              </button>
            )}

            {message.orderRef && (
              <span className="text-[10px] bg-brand-yellow-100 text-brand-yellow-800 font-bold px-2 py-1 rounded-lg">
                Ref: {message.orderRef}
              </span>
            )}
          </div>

          <span className="text-[9px] text-slate-400 block mt-2">
            {formatTimestamp(message.timestamp)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex ${isSelf ? "justify-end" : "justify-start"} mb-2 items-end`}
    >
      {!isSelf && (
        <div className="mr-2">
          <Avatar
            src={
              message.senderAvatar ||
              message.avatar ||
              message.photoURL ||
              message.sender?.photoURL
            }
            size={28}
          />
        </div>
      )}
      <div
        className={`max-w-[85%] md:max-w-[70%] px-3 py-2 rounded-xl flex flex-col gap-2 ${
          isSelf ? "bg-emerald-700 text-white" : "bg-white border border-slate-100 text-slate-800"
        }`}
      >
        {message.image && (
          <div className="rounded-lg overflow-hidden border border-slate-200 bg-slate-50/50 max-w-full">
            <img 
              src={message.image} 
              alt="Uploaded attachment" 
              className="max-h-60 max-w-full object-contain cursor-pointer hover:opacity-90 transition"
              onClick={() => window.open(message.image, "_blank")}
            />
          </div>
        )}
        <span className="break-words">{message.text}</span>
      </div>
    </div>
  );
};

export default MessageBubble;
