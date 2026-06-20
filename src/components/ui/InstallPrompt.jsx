import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Zap, ShieldCheck } from 'lucide-react';
import Button from './Button';

export const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if the app is already installed and running in standalone mode
    const checkStandalone = () => {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
      setIsStandalone(isStandaloneMode);
      return isStandaloneMode;
    };

    if (checkStandalone()) return;

    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const lastDismissed = sessionStorage.getItem('pwaPromptDismissed');

    // Force show on mobile if not dismissed and not standalone
    if (isMobileDevice && !lastDismissed) {
      const timer = setTimeout(() => setShowPrompt(true), 1500);
      return () => clearTimeout(timer);
    }

    // Listen for the beforeinstallprompt event for Android/Chrome
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!lastDismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Show the browser's install prompt
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
        setShowPrompt(false);
      } else {
        console.log('User dismissed the install prompt');
        sessionStorage.setItem('pwaPromptDismissed', 'true');
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    } else {
      // If deferredPrompt is missing (e.g. iOS Safari), show manual instructions
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      if (isIOS) {
        alert("To install: Tap the Share button at the bottom of Safari, then select 'Add to Home Screen'.");
      } else {
        alert("To install: Open your browser menu and select 'Add to Home Screen' or 'Install App'.");
      }
    }
  };

  const handleDismiss = () => {
    // Hide for this session only, so it pops up again on their next visit
    sessionStorage.setItem('pwaPromptDismissed', 'true');
    setShowPrompt(false);
  };

  if (!showPrompt || isStandalone) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xs w-full overflow-hidden animate-in slide-in-from-bottom-8 duration-500 relative">
        
        {/* Dismiss Button */}
        <button 
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header & Logo */}
        <div className="p-5 text-center">
          <img 
            src="/logo.png" 
            alt="Vinoff Logo" 
            className="w-14 h-14 mx-auto mb-3 object-contain"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/favicon.svg';
            }}
          />
          <h2 className="text-lg font-bold text-slate-800 tracking-tight leading-tight">
            Install Vinoff App
          </h2>
          <p className="text-slate-500 text-xs mt-1 font-medium">
            Order seamlessly with our lightning-fast mobile app.
          </p>
        </div>

        {/* Feature Guide (Compact) */}
        <div className="px-5 pb-5 grid grid-cols-2 gap-3">
          <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-2xl text-center">
            <Zap className="w-4 h-4 text-brand-green-600 mx-auto mb-1.5" />
            <h4 className="font-bold text-slate-700 text-[10px] leading-tight">Fast & Offline</h4>
          </div>
          <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-2xl text-center">
            <Smartphone className="w-4 h-4 text-blue-600 mx-auto mb-1.5" />
            <h4 className="font-bold text-slate-700 text-[10px] leading-tight">1-Tap Access</h4>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex flex-col gap-2">
          <Button 
            onClick={handleInstallClick} 
            className="w-full py-3 rounded-xl text-sm shadow-sm flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Install Now
          </Button>
          <button 
            onClick={handleDismiss}
            className="text-slate-500 hover:text-slate-800 text-xs font-semibold py-2 transition-colors"
          >
            Maybe Later
          </button>
        </div>

      </div>
    </div>
  );
};

export default InstallPrompt;
