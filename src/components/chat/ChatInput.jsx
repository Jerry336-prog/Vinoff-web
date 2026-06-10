import React, { useState, useRef } from "react";
import { Send, Image, HelpCircle } from "lucide-react";
import { uploadMedia } from "../../services/cloudinary/upload";
import { showModal } from "../../services/ui/modal";
import Button from "../ui/Button";

export const ChatInput = ({
  onSendMessage,
  placeholder = "Type message here...",
}) => {
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleSend = () => {
    if (!text.trim()) return;
    onSendMessage(text.trim());
    setText("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Simulate Cloudinary upload progress
      const url = await uploadMedia(file, (p) => {
        console.log(`Upload progress: ${p}%`);
      });
      onSendMessage(`Uploaded payment confirmation reference: ${file.name}`, {
        image: url,
      });
    } catch (err) {
      console.error(err);
      await showModal({
        title: "Upload Error",
        message: "Failed to upload screenshot. Please try again.",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Quick Action templates
  const quickActions = [
    "Request final wholesale invoice",
    "Sent bank wire payment",
    "Confirm carton pricing discounts",
  ];

  return (
    <div className="p-4 bg-white border-t border-slate-200 shadow-sm flex flex-col gap-3">
      {/* Quick Action Suggestion Chips */}
      <div className="flex flex-wrap gap-2">
        {quickActions.map((action) => (
          <button
            key={action}
            onClick={() => onSendMessage(action)}
            className="px-3 py-1 bg-slate-50 hover:bg-brand-green-50 hover:text-brand-green-700 hover:border-brand-green-200 border border-slate-200 rounded-full text-[10px] font-semibold text-slate-500 transition"
          >
            {action}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        {/* Attachment selection input */}
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          id="chat-file-upload"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="p-2.5 text-slate-500 hover:text-brand-green-600 bg-slate-50 border border-slate-200 hover:border-brand-green-300 rounded-xl transition disabled:opacity-50"
          title="Upload Wire Receipt / Screenshot"
        >
          <Image className="w-5 h-5" />
        </button>

        {/* Messaging Box */}
        <input
          type="text"
          placeholder={uploading ? "Uploading receipt slip..." : placeholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyPress}
          disabled={uploading}
          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-brand-green-500 focus:border-brand-green-500 transition outline-none"
        />

        <Button
          onClick={handleSend}
          disabled={!text.trim() || uploading}
          className="rounded-xl px-4 py-3"
          size="sm"
          icon={Send}
        >
          Send
        </Button>
      </div>
    </div>
  );
};

export default ChatInput;
