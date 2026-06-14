import React from 'react';
import { useRouteError, useNavigate } from 'react-router-dom';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

export const RouteErrorBoundary = () => {
  const error = useRouteError();
  const navigate = useNavigate();

  console.error("Route Error Boundary caught:", error);

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 shadow-xl text-center space-y-6 animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto text-rose-500 shadow-sm">
          <AlertTriangle className="w-8 h-8" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-black text-slate-800 tracking-tight">
            Unexpected Application Error
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
            An error occurred while rendering this page. You can reload the page or return to the main dashboard.
          </p>
        </div>

        {error && (
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left font-mono text-[10px] text-slate-600 max-h-40 overflow-y-auto break-words leading-relaxed select-text">
            <p className="font-bold text-slate-700 mb-1">
              Error Details:
            </p>
            {error.message || error.statusText || String(error)}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 items-center justify-center pt-2">
          <button
            onClick={handleReload}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-green-600 hover:bg-brand-green-700 text-xs font-bold text-white rounded-xl shadow-sm border border-brand-green-700/20 active:scale-[0.98] transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reload Page
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 rounded-xl border border-slate-200 active:scale-[0.98] transition-all"
          >
            <Home className="w-3.5 h-3.5 text-slate-500" />
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default RouteErrorBoundary;
