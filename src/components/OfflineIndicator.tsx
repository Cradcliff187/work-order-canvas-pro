import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useOfflineStorage } from '@/hooks/useOfflineStorage';
import { WifiOff, Wifi, RefreshCw, Clock } from 'lucide-react';

export function OfflineIndicator() {
  const { isOnline, isSlowConnection } = useNetworkStatus();
  const { pendingCount, processPendingSyncs } = useOfflineStorage();

  if (isOnline && !isSlowConnection && pendingCount === 0) {
    return null;
  }

  const handleSync = async () => {
    await processPendingSyncs();
  };

  return (
    <Alert className={`fixed top-4 left-4 right-4 z-40 mx-auto max-w-sm ${
      !isOnline ? 'border-destructive bg-destructive/10' : 
      isSlowConnection ? 'border-yellow-500 bg-yellow-500/10' : 
      'border-blue-500 bg-blue-500/10'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {!isOnline ? (
            <WifiOff className="h-4 w-4 text-destructive" />
          ) : isSlowConnection ? (
            <Wifi className="h-4 w-4 text-yellow-600" />
          ) : (
            <Clock className="h-4 w-4 text-blue-600" />
          )}
          
          <AlertDescription className="text-sm">
            {!isOnline ? (
              'You\'re offline'
            ) : isSlowConnection ? (
              'Slow connection detected'
            ) : (
              `${pendingCount} items pending sync`
            )}
          </AlertDescription>
        </div>

        {isOnline && pendingCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSync}
            className="h-6 px-2 text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Sync
          </Button>
        )}
      </div>
    </Alert>
  );
}