import React, { useState, useRef, useEffect } from "react";
import { Send, Image, HelpCircle } from "lucide-react";
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
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const [isCurrentlyTyping, setIsCurrentlyTyping] = useState(false);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleSend = () => {
    if (!text.trim()) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setIsCurrentlyTyping(false);
    onTyping(false);

    onSendMessage(text.trim());
    setText("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  const handleTextChange = (e) => {
    const val = e.target.value;
    setText(val);

    if (val.trim().length === 0) {
      setIsCurrentlyTyping(false);
      onTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
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
    <div className="p-3 sm:p-4 bg-white border-t border-slate-200 shadow-sm flex flex-col gap-2.5 sm:gap-3">
      {/* Quick Action Suggestion Chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mb-1 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {quickActions.map((action) => (
          <button
            key={action}
            onClick={() => onSendMessage(action)}
            className="flex-shrink-0 snap-start px-3 py-1 bg-slate-50 hover:bg-brand-green-50 hover:text-brand-green-700 hover:border-brand-green-200 border border-slate-200 rounded-full text-[10px] font-semibold text-slate-500 transition"
          >
            {action}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
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
          className="p-2.5 text-slate-500 hover:text-brand-green-600 bg-slate-50 border border-slate-200 hover:border-brand-green-300 rounded-xl transition disabled:opacity-50 flex-shrink-0"
          title="Upload Wire Receipt / Screenshot"
        >
          <Image className="w-5 h-5" />
        </button>

        {/* Messaging Box */}
        <input
          type="text"
          placeholder={uploading ? "Uploading receipt slip..." : placeholder}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyPress}
          disabled={uploading}
          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-brand-green-500 focus:border-brand-green-500 transition outline-none min-w-0"
        />

        <Button
          onClick={handleSend}
          disabled={!text.trim() || uploading}
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
