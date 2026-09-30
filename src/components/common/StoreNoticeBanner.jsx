import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { unwrapApiRecord } from "../../utils/apiResponse";
import { AlertTriangle, Info, AlertCircle, X } from "lucide-react";

export const StoreNoticeBanner = () => {
  const [status, setStatus] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let isMounted = true;
    api
      .get("/api/settings/store-status")
      .then((res) => {
        if (!isMounted) return;
        const data = unwrapApiRecord(res) || res.data?.data || res.data;
        if (data && (data.isOpen === false || (data.bannerMessage && data.bannerMessage.trim().length > 0))) {
          setStatus(data);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  if (!status || dismissed) return null;

  const isClosed = status.isOpen === false;
  const message =
    status.bannerMessage ||
    (isClosed
      ? "We are restocking our warehouse for the weekend. Orders placed today will be dispatched Monday."
      : "");

  if (!message && !isClosed) return null;

  const tone = status.noticeType || (isClosed ? "warning" : "info");

  const colorStyles =
    tone === "alert"
      ? "bg-red-600 text-white border-red-700"
      : tone === "info"
      ? "bg-blue-600 text-white border-blue-700"
      : "bg-amber-500 text-amber-950 border-amber-600";

  const Icon = tone === "alert" ? AlertCircle : tone === "info" ? Info : AlertTriangle;

  return (
    <div
      className={`py-2 px-3 sm:px-4 text-xs font-semibold border-b transition-all flex items-center justify-between gap-2 shadow-xs ${colorStyles}`}
    >
      <div className="flex items-center gap-2 max-w-5xl mx-auto w-full justify-center text-center">
        <Icon className="w-4 h-4 shrink-0" />
        <div className="leading-snug">
          {isClosed && (
            <span className="font-black uppercase tracking-wider text-[10px] mr-1.5 px-1.5 py-0.5 rounded bg-black/15">
              Orders Temporarily Paused
            </span>
          )}
          <span>{message}</span>
        </div>
      </div>

      {!isClosed && (
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="p-1 rounded hover:bg-black/10 transition shrink-0"
          title="Dismiss notice"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

export default StoreNoticeBanner;
