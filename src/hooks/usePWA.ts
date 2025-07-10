import { useState, useEffect } from 'react';
import { Workbox } from 'workbox-window';

interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isOffline: boolean;
  needsRefresh: boolean;
  updateAvailable: boolean;
}

interface PWAActions {
  install: () => Promise<void>;
  skipWaiting: () => void;
  refresh: () => void;
}

export function usePWA(): PWAState & PWAActions {
  const [state, setState] = useState<PWAState>({
    isInstallable: false,
    isInstalled: false,
    isOffline: !navigator.onLine,
    needsRefresh: false,
    updateAvailable: false,
  });

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [wb, setWb] = useState<Workbox | null>(null);

  useEffect(() => {
    // Check if app is already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isInstalled = isStandalone || (isIOS && !(window as any).safari);

    setState(prev => ({ ...prev, isInstalled }));

    // Register service worker
    if ('serviceWorker' in navigator) {
      const workbox = new Workbox('/sw.js');
      setWb(workbox);

      workbox.addEventListener('controlling', () => {
        setState(prev => ({ ...prev, needsRefresh: true }));
      });

      workbox.addEventListener('waiting', () => {
        setState(prev => ({ ...prev, updateAvailable: true }));
      });

      workbox.register();
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setState(prev => ({ ...prev, isInstallable: true }));
    };

    // Listen for online/offline events
    const handleOnline = () => setState(prev => ({ ...prev, isOffline: false }));
    const handleOffline = () => setState(prev => ({ ...prev, isOffline: true }));

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const install = async (): Promise<void> => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setState(prev => ({ 
        ...prev, 
        isInstalled: true, 
        isInstallable: false 
      }));
    }
    
    setDeferredPrompt(null);
  };

  const skipWaiting = (): void => {
    if (wb) {
      wb.messageSkipWaiting();
    }
  };

  const refresh = (): void => {
    window.location.reload();
  };

  return {
    ...state,
    install,
    skipWaiting,
    refresh,
  };
}