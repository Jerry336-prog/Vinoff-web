import React, { useState, useRef, useEffect } from "react";
import { Send, Image } from "lucide-react";
import { uploadMedia } from "../../services/cloudinary/upload";
import { showModal } from "../../services/ui/modal";
import Button from "../ui/Button";

export const ChatInput = ({
  onSendMessage,
  onTyping = () => {},
  placeholder = "Type message here...",
}) => {
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [stagedFile, setStagedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const [isCurrentlyTyping, setIsCurrentlyTyping] = useState(false);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const clearTyping = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setIsCurrentlyTyping(false);
    onTyping(false);
  };

  const resetStagedFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setStagedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSend = async (presetText) => {
    const messageText = (typeof presetText === "string" ? presetText : text).trim();
    if (!messageText && !stagedFile) return;

    clearTyping();
    setSending(true);
    setUploading(Boolean(stagedFile));
    try {
      let attachment;
      if (stagedFile) {
        try {
          const uploadedUrl = await uploadMedia(stagedFile);
          const isImg = stagedFile.type.startsWith("image/");
          attachment = {
            url: uploadedUrl,
            image: isImg ? uploadedUrl : undefined,
            name: stagedFile.name,
            type: isImg ? "image" : stagedFile.type || "file",
          };
        } catch (uploadErr) {
          console.warn("Direct upload to Cloudinary failed, using backend multipart upload:", uploadErr.message);
          attachment = stagedFile;
        }
      }

      await onSendMessage(messageText, attachment);
      setText("");
      resetStagedFile();
    } catch (err) {
      await showModal({
        title: "Message Not Sent",
        message: err.message || "We could not send that message. Please try again.",
      });
    } finally {
      setUploading(false);
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextChange = (e) => {
    const val = e.target.value;
    setText(val);

    if (val.trim().length === 0) {
      clearTyping();
    } else {
      if (!isCurrentlyTyping) {
        setIsCurrentlyTyping(true);
        onTyping(true);
      }

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        setIsCurrentlyTyping(false);
        onTyping(false);
      }, 3000);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setStagedFile(file);
    setPreviewUrl(file.type.startsWith("image/") ? URL.createObjectURL(file) : null);
  };

  const quickActions = [
    "Request final wholesale invoice",
    "Sent bank wire payment",
    "Confirm carton pricing discounts",
  ];

  return (
    <div className="p-3 sm:p-4 bg-white border-t border-slate-200 shadow-sm flex flex-col gap-2.5 sm:gap-3">
      <div className="flex gap-2 overflow-x-auto pb-1 -mb-1 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {quickActions.map((action) => (
          <button
            key={action}
            onClick={() => handleSend(action)}
            className="flex-shrink-0 snap-start px-3 py-1 bg-slate-50 hover:bg-brand-green-50 hover:text-brand-green-700 hover:border-brand-green-200 border border-slate-200 rounded-full text-[10px] font-semibold text-slate-500 transition"
          >
            {action}
          </button>
        ))}
      </div>

      {stagedFile && (
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
          {previewUrl ? (
            <img src={previewUrl} alt="" className="w-12 h-12 rounded-xl object-cover border border-slate-200" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">
              FILE
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-800 truncate">{stagedFile.name}</p>
            <p className="text-[10px] text-slate-400">{(stagedFile.size / 1024).toFixed(1)} KB ready to send</p>
          </div>
          <button
            type="button"
            onClick={resetStagedFile}
            className="text-[10px] font-bold text-red-600 hover:bg-red-50 px-2 py-1 rounded-lg"
          >
            Remove
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 sm:gap-3">
        <input
          type="file"
          accept="image/*,application/pdf"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          id="chat-file-upload"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || sending}
          className="p-2.5 text-slate-500 hover:text-brand-green-600 bg-slate-50 border border-slate-200 hover:border-brand-green-300 rounded-xl transition disabled:opacity-50 flex-shrink-0"
          title="Upload receipt or screenshot"
        >
          <Image className="w-5 h-5" />
        </button>

        <input
          type="text"
          placeholder={uploading ? "Uploading attachment..." : stagedFile ? "Add a caption..." : placeholder}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyPress}
          disabled={uploading || sending}
          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-brand-green-500 focus:border-brand-green-500 transition outline-none min-w-0"
        />

        <Button
          onClick={() => handleSend()}
          disabled={(!text.trim() && !stagedFile) || uploading || sending}
          className="rounded-xl px-3.5 py-3 sm:px-4 sm:py-3 flex-shrink-0"
          size="sm"
          icon={Send}
        >
          <span className="hidden sm:inline">Send</span>
        </Button>
      </div>
    </div>
  );
};

export default ChatInput;
