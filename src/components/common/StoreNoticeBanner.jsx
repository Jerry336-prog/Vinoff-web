import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { unwrapApiRecord } from "../../utils/apiResponse";
import { AlertTriangle, X } from "lucide-react";

export const StoreNoticeBanner = () => {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    let isMounted = true;
    api
      .get("/api/settings/store-status")
      .then((res) => {
        if (!isMounted) return;
        const data = unwrapApiRecord(res) || res.data?.data || res.data;
        if (data && typeof data.isOpen === "boolean") {
          setStatus(data);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // When store is active (isOpen === true), NEVER display any message to customers!
  if (!status || status.isOpen !== false) return null;

  const message =
    status.bannerMessage ||
    "We are restocking our warehouse for the weekend. Orders placed today will be dispatched Monday.";

  return (
    <div className="py-2.5 px-3 sm:px-4 text-xs font-semibold border-b bg-amber-500 text-amber-950 border-amber-600 shadow-xs transition-all flex items-center justify-center">
      <div className="flex items-center gap-2 max-w-5xl mx-auto w-full justify-center text-center">
        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-950" />
        <div className="leading-snug">
          <span className="font-black uppercase tracking-wider text-[10px] mr-1.5 px-1.5 py-0.5 rounded bg-black/15">
            Orders Paused
          </span>
          <span>{message}</span>
        </div>
      </div>
    </div>
  );
};

export default StoreNoticeBanner;
