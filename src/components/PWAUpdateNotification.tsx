import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePWA } from '@/hooks/usePWA';
import { RefreshCw, X } from 'lucide-react';

export function PWAUpdateNotification() {
  const { updateAvailable, needsRefresh, skipWaiting, refresh } = usePWA();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (updateAvailable || needsRefresh) {
      setDismissed(false);
    }
  }, [updateAvailable, needsRefresh]);

  if ((!updateAvailable && !needsRefresh) || dismissed) {
    return null;
  }

  const handleUpdate = () => {
    if (updateAvailable) {
      skipWaiting();
    } else if (needsRefresh) {
      refresh();
    }
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
            onClick={() => setDismissed(true)}
            className="h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </Alert>
  );
}