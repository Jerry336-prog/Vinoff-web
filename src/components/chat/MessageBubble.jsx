import React, { useState } from "react";
import { FileText, ClipboardCheck, Download, ExternalLink, X, Image as ImageIcon } from "lucide-react";
import Avatar from "../ui/Avatar";
import { toast } from "../../context/ToastContext";
import { getAvatarUrl, getInitials } from "../../utils/avatar";
import { downloadInvoicePDF } from "../../utils/generatePDF";

const isImageAttachment = (attachment) => {
  const type = String(attachment?.type || "");
  const url = String(attachment?.url || "");

  if (type.includes("pdf") || /\.pdf(\?.*)?$/i.test(url)) return false;

  return (
    type.startsWith("image") ||
    /\.(avif|gif|jpe?g|png|webp|svg)(\?.*)?$/i.test(url)
  );
};

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

const getBubbleImage = (message) => {
  const attachments = Array.isArray(message.attachments) ? message.attachments : [];
  const imageAttachment = attachments.find(isImageAttachment);

  return (
    message.image ||
    message.imageUrl ||
    message.attachmentUrl ||
    imageAttachment?.url ||
    null
  );
};

export const MessageBubble = React.memo(
  ({ message, isSelf, onViewInvoice, room }) => {
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const isSystem = message.type === "system";
    const imageSrc = getBubbleImage(message);
    const fileAttachments = (Array.isArray(message.attachments) ? message.attachments : []).filter(
      (attachment) => attachment?.url && attachment.url !== imageSrc,
    );
    const isAdminRole = message.senderRole === "admin" || message.senderRole === "subAdmin" || message.senderRole === "superadmin";
    const senderFirstName = message.sender?.firstName || message.senderFirstName || "";
    const senderAvatar =
      getAvatarUrl(message.sender) ||
      message.senderAvatar ||
      message.avatar ||
      message.photoURL ||
      (isAdminRole ? null : room?.avatarUrl);
    const fallback = isAdminRole
      ? (senderFirstName ? senderFirstName.charAt(0).toUpperCase() : "AD")
      : getInitials(message.sender || room?.customer || room, "C");

    // Hide raw filename text if an image or document attachment is already rendered
    const isGenericFilenameText =
      message.text &&
      (message.text.startsWith("Uploaded attachment:") ||
        /\.(png|jpe?g|gif|webp|svg|pdf)$/i.test(message.text.trim()));

    const displayText = isGenericFilenameText && (imageSrc || fileAttachments.length > 0) ? "" : message.text;

    const triggerBrowserDownload = (blob, filename) => {
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    };

    const handleOpenPdfFile = async (attachment) => {
      const invRef = message.invoiceRef || attachment?.invoiceRef || attachment?.invoiceId;
      if (invRef) {
        try {
          await downloadInvoicePDF(invRef);
          return;
        } catch (e) {
          console.warn("Invoice PDF generation fallback:", e);
        }
      }

      const rawUrl = attachment?.url || attachment?.image || (typeof attachment === "string" ? attachment : null);
      if (!rawUrl) return;

      const fileUrl = String(rawUrl).replace("/upload/fl_attachment/", "/upload/");
      const filename = attachment?.name || attachment?.filename || "Invoice_Document.pdf";
      const chatId = room?.roomId || room?._id || room?.id || message.chat;

      try {
        if (chatId && fileUrl.includes("res.cloudinary.com")) {
          const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";
          const token = localStorage.getItem("vinoff_token");
          const res = await fetch(
            `${API_BASE_URL}/api/chats/${chatId}/attachments/download?url=${encodeURIComponent(fileUrl)}&filename=${encodeURIComponent(filename)}`,
            {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
              credentials: "include",
            },
          );
          if (!res.ok) throw new Error(`HTTP status ${res.status}`);
          const blob = await res.blob();
          triggerBrowserDownload(blob, filename);
          return;
        }

        const res = await fetch(fileUrl);
        if (!res.ok) throw new Error(`HTTP status ${res.status}`);
        const blob = await res.blob();
        triggerBrowserDownload(blob, filename);
      } catch (err) {
        console.warn("PDF download failed:", err);
        toast.error("Could not download this PDF. Please try again.", "Download Failed");
      }
    };

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
                    downloadInvoicePDF(message.invoiceRef);
                  }}
                  className="inline-flex items-center gap-1 bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 px-2.5 py-1.5 rounded-lg shadow-xs transition cursor-pointer"
                >
                  <FileText className="w-3 h-3 text-brand-green-600" />
                  Download PDF Invoice
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
              src={senderAvatar}
              size={28}
              fallback={fallback}
              className="border border-slate-200"
            />
          </div>
        )}
        <div
          className={`max-w-[85%] md:max-w-[70%] flex flex-col gap-1 ${
            isSelf ? "items-end" : "items-start"
          }`}
        >
          {!isSelf && (
            <span className="text-[9px] font-extrabold text-brand-green-700 uppercase tracking-wider px-1">
              {isAdminRole
                ? (senderFirstName ? `${senderFirstName} (Admin)` : message.senderName || "Admin")
                : (message.senderName || "Customer")}
            </span>
          )}
          <div
            className={`px-3 py-2.5 rounded-2xl flex flex-col gap-2 ${
              isSelf ? "bg-emerald-700 text-white" : "bg-white border border-slate-200 text-slate-800 shadow-xs"
            }`}
          >
            {/* Image Attachment Preview */}
            {imageSrc && (
              <div className="rounded-xl overflow-hidden border border-slate-200/60 bg-slate-900/5 max-w-full min-h-[120px] flex items-center justify-center group relative">
                <img 
                  src={imageSrc} 
                  alt="Chat Attachment" 
                  className="max-h-64 max-w-full object-cover cursor-pointer hover:opacity-90 transition"
                  onClick={() => setIsLightboxOpen(true)}
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center pointer-events-none">
                  <span className="bg-slate-900/80 text-white text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-xs flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" /> Click to enlarge
                  </span>
                </div>
              </div>
            )}

            {/* File/PDF Attachments */}
            {fileAttachments.map((attachment, idx) => {
              const isPdf =
                String(attachment.url || "").toLowerCase().includes(".pdf") ||
                String(attachment.type || "").toLowerCase().includes("pdf");
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-xs transition ${
                    isSelf
                      ? "border-white/20 bg-white/10 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-800"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${isSelf ? "bg-white/20 text-white" : "bg-red-100 text-red-700"}`}>
                    {isPdf ? "PDF" : "FILE"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold truncate text-[11px] leading-tight">
                      {attachment.name || (isPdf ? "Commercial Invoice.pdf" : "Attachment Document")}
                    </p>
                    <p className={`text-[9px] ${isSelf ? "text-white/80" : "text-slate-500"}`}>
                      {isPdf ? "Official PDF Document" : "Download File"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenPdfFile(attachment)}
                    className={`p-1.5 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition shrink-0 cursor-pointer ${
                      isSelf
                        ? "border-white/30 hover:bg-white/20 text-white"
                        : "border-brand-green-200 bg-white text-brand-green-700 hover:bg-brand-green-50"
                    }`}
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download PDF
                  </button>
                </div>
              );
            })}

            {/* Invoice PDF Action Card */}
            {message.invoiceRef && fileAttachments.length === 0 && (
              <div
                className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-xs ${
                  isSelf
                    ? "border-white/20 bg-white/10 text-white"
                    : "border-brand-green-200 bg-brand-green-50/50 text-slate-800"
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-800 text-white flex items-center justify-center font-black text-xs shrink-0">
                  PDF
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold truncate text-[11px] leading-tight">
                    Invoice Document Ready
                  </p>
                  <p className={`text-[9px] ${isSelf ? "text-white/80" : "text-slate-500"}`}>
                    Commercial Invoice PDF
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => downloadInvoicePDF(message.invoiceRef)}
                  className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition shrink-0 ${
                    isSelf
                      ? "border-white/30 hover:bg-white/20 text-white"
                      : "border-brand-green-300 bg-white text-brand-green-700 hover:bg-brand-green-50 shadow-xs"
                  }`}
                >
                  <Download className="w-3.5 h-3.5" />
                  Download PDF
                </button>
              </div>
            )}

            {/* Text Message Content */}
            {displayText && (
              <span className="break-words text-xs leading-relaxed">{displayText}</span>
            )}
          </div>
          <span className={`text-[9px] text-slate-400 px-1 ${ isSelf ? 'text-right' : 'text-left' }`}>
            {formatTimestamp(message.timestamp)}
          </span>
        </div>

        {/* Fullscreen Image Lightbox Modal */}
        {isLightboxOpen && imageSrc && (
          <div
            className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-fade-in"
            onClick={() => setIsLightboxOpen(false)}
          >
            <div
              className="relative max-w-5xl max-h-[92vh] flex flex-col items-center justify-center w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Controls Bar */}
              <div className="w-full flex items-center justify-between pb-4 text-white border-b border-white/10 mb-4">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-brand-yellow-400" />
                  <span className="text-xs font-bold truncate max-w-xs text-slate-200">
                    {message.attachments?.[0]?.name || "Image Preview"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={imageSrc}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white text-xs font-bold transition flex items-center gap-1.5"
                    title="Open full resolution in new tab"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open Original
                  </a>
                  <button
                    onClick={() => setIsLightboxOpen(false)}
                    className="p-2 bg-white/10 hover:bg-red-500/80 rounded-xl text-white transition cursor-pointer"
                    title="Close preview"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Fullscreen Image */}
              <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-slate-900 flex items-center justify-center max-h-[80vh] w-full">
                <img
                  src={imageSrc}
                  alt="Enlarged attachment view"
                  className="max-h-[78vh] max-w-full object-contain rounded-xl"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  },
  (prevProps, nextProps) =>
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.text === nextProps.message.text &&
    prevProps.message.image === nextProps.message.image &&
    prevProps.isSelf === nextProps.isSelf &&
    prevProps.message._optimistic === nextProps.message._optimistic,
);

export default MessageBubble;
