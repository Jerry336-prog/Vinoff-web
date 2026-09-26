import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

const ToastContext = createContext(null);

// Global event bus for non-hook invocations
let globalToastHandler = null;

export const toast = {
  success: (message, title) => globalToastHandler?.("success", message, title),
  error: (message, title) => globalToastHandler?.("error", message, title),
  info: (message, title) => globalToastHandler?.("info", message, title),
  warning: (message, title) => globalToastHandler?.("warning", message, title),
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [modal, setModal] = useState(null);

  const addToast = useCallback((type, message, title) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, type, message, title }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showModal = useCallback(({ title, message, confirmText = "OK", cancelText = null, onConfirm, onCancel, type = "info" }) => {
    setModal({
      title,
      message,
      confirmText,
      cancelText,
      onConfirm,
      onCancel,
      type,
    });
  }, []);

  const closeModal = useCallback(() => {
    setModal(null);
  }, []);

  useEffect(() => {
    globalToastHandler = addToast;
    return () => {
      globalToastHandler = null;
    };
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toast, showModal, closeModal }}>
      {children}

      {/* Floating Toasts Stack */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none px-3">
        {toasts.map((t) => {
          const isSuccess = t.type === "success";
          const isError = t.type === "error";
          const isWarning = t.type === "warning";

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl shadow-xl border backdrop-blur-md transform transition-all duration-300 animate-in slide-in-from-top-2 ${
                isSuccess
                  ? "bg-emerald-950/90 border-emerald-500/30 text-white"
                  : isError
                  ? "bg-rose-950/90 border-rose-500/30 text-white"
                  : isWarning
                  ? "bg-amber-950/90 border-amber-500/30 text-white"
                  : "bg-slate-900/90 border-slate-700 text-white"
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                {isError && <AlertCircle className="w-5 h-5 text-rose-400" />}
                {isWarning && <AlertTriangle className="w-5 h-5 text-amber-400" />}
                {!isSuccess && !isError && !isWarning && <Info className="w-5 h-5 text-sky-400" />}
              </div>

              <div className="flex-1 min-w-0">
                {t.title && <h4 className="text-xs font-black tracking-wide uppercase mb-0.5">{t.title}</h4>}
                <p className="text-xs font-medium leading-relaxed opacity-95 break-words">{t.message}</p>
              </div>

              <button
                onClick={() => removeToast(t.id)}
                className="shrink-0 text-white/60 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Modern Pop-up Dialog (Replacement for window.alert) */}
      {modal && (
        <div className="fixed inset-0 z-[10000] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-4 shadow-2xl border border-slate-100">
            <div className="flex items-start gap-3.5">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                  modal.type === "error"
                    ? "bg-rose-50 text-rose-600"
                    : modal.type === "warning"
                    ? "bg-amber-50 text-amber-600"
                    : modal.type === "success"
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-brand-green-50 text-brand-green-700"
                }`}
              >
                {modal.type === "error" && <AlertCircle className="w-5 h-5" />}
                {modal.type === "warning" && <AlertTriangle className="w-5 h-5" />}
                {modal.type === "success" && <CheckCircle2 className="w-5 h-5" />}
                {modal.type !== "error" && modal.type !== "warning" && modal.type !== "success" && (
                  <Info className="w-5 h-5" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-extrabold text-slate-900 text-sm tracking-tight">
                  {modal.title || "Notice"}
                </h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  {modal.message}
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              {modal.cancelText && (
                <button
                  type="button"
                  onClick={() => {
                    if (modal.onCancel) modal.onCancel();
                    closeModal();
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  {modal.cancelText}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (modal.onConfirm) modal.onConfirm();
                  closeModal();
                }}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-sm ${
                  modal.type === "error" || modal.type === "warning"
                    ? "bg-rose-600 hover:bg-rose-700 text-white"
                    : "bg-brand-green-700 hover:bg-brand-green-800 text-white"
                }`}
              >
                {modal.confirmText || "OK"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return { toast, showModal: () => {}, closeModal: () => {} };
  }
  return ctx;
};

export default ToastProvider;
