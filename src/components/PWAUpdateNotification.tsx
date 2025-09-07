import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePWA } from '@/hooks/usePWA';
import { RefreshCw, X } from 'lucide-react';

export function PWAUpdateNotification() {
  const { updateAvailable, needsRefresh, skipWaiting, refresh } = usePWA();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if notification was recently dismissed or update already applied
    const dismissedUntil = localStorage.getItem('pwa-update-dismissed');
    const lastAppliedVersion = localStorage.getItem('pwa-last-applied-version');
    const currentVersion = localStorage.getItem('pwa-current-version') || '1.0.0';
    
    if (dismissedUntil) {
      const dismissedTime = new Date(dismissedUntil).getTime();
      const now = new Date().getTime();
      // Keep dismissed for 24 hours for PWA updates
      if (now - dismissedTime < 24 * 60 * 60 * 1000) {
        setDismissed(true);
      }
    }
    
    // Don't show if this version was already applied
    if (lastAppliedVersion === currentVersion) {
      setDismissed(true);
    }
  }, []);

  if ((!updateAvailable && !needsRefresh) || dismissed) {
    return null;
  }

  const handleUpdate = () => {
    setDismissed(true);
    const currentVersion = localStorage.getItem('pwa-current-version') || '1.0.0';
    
    // Mark this version as applied and set dismissal
    localStorage.setItem('pwa-update-dismissed', new Date().toISOString());
    localStorage.setItem('pwa-last-applied-version', currentVersion);
    
    if (updateAvailable) {
      skipWaiting();
    } else if (needsRefresh) {
      refresh();
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('pwa-update-dismissed', new Date().toISOString());
  };

  return (
    <Alert className="fixed top-4 left-4 right-4 z-50 mx-auto max-w-md border-primary bg-primary/10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-primary" />
          <AlertDescription>
            {updateAvailable ? 'New version available!' : 'Update ready to install'}
          </AlertDescription>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={handleUpdate}
            className="h-6 px-2 text-xs"
          >
            {updateAvailable ? 'Update' : 'Restart'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </Alert>
  );
}