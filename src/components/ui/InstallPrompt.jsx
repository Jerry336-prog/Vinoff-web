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

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      
      // Check if we should show the custom prompt (e.g., don't spam if they literally just closed it this session)
      const lastDismissed = sessionStorage.getItem('pwaPromptDismissed');
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
    if (!deferredPrompt) return;
    
    // Show the browser's install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
      setShowPrompt(false);
    } else {
      console.log('User dismissed the install prompt');
      // They dismissed the actual browser prompt, let's hide ours for this session
      sessionStorage.setItem('pwaPromptDismissed', 'true');
      setShowPrompt(false);
    }
    
    // We can't use the prompt again, discard it
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    // Hide for this session only, so it pops up again on their next visit
    sessionStorage.setItem('pwaPromptDismissed', 'true');
    setShowPrompt(false);
  };

  if (!showPrompt || isStandalone) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden animate-in slide-in-from-bottom-8 duration-500 relative">
        
        {/* Dismiss Button */}
        <button 
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 rounded-full backdrop-blur-md transition-all z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Hero Area */}
        <div className="bg-gradient-to-br from-brand-green-600 to-emerald-800 p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="w-16 h-16 bg-white rounded-2xl mx-auto flex items-center justify-center shadow-lg transform -rotate-3 mb-4">
            <span className="text-3xl font-black text-brand-green-700">V</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight leading-tight relative z-10">
            Install Vinoff App
          </h2>
          <p className="text-emerald-100 text-sm mt-2 relative z-10 font-medium">
            Get the ultimate B2B wholesale experience directly on your device.
          </p>
        </div>

        {/* Feature Guide */}
        <div className="p-6 space-y-5">
          <div className="flex gap-4 items-start">
            <div className="bg-emerald-100 p-2.5 rounded-xl text-brand-green-700 shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-sm">Lightning Fast</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                App loads instantly and works seamlessly even on poor networks with offline caching.
              </p>
            </div>
          </div>

          <div className="flex gap-4 items-start">
            <div className="bg-blue-100 p-2.5 rounded-xl text-blue-700 shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-sm">One-Tap Access</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Adds a shortcut to your home screen so you can order inventory in seconds.
              </p>
            </div>
          </div>

          <div className="flex gap-4 items-start">
            <div className="bg-amber-100 p-2.5 rounded-xl text-amber-700 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-sm">Secure & Safe</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                No app store required. Completely safe, lightweight, and takes zero storage space.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 pt-2 border-t border-slate-100 bg-slate-50 flex flex-col gap-3">
          <Button 
            onClick={handleInstallClick} 
            className="w-full py-3.5 rounded-xl text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Install App Now
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
