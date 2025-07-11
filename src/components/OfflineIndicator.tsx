import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useOfflineStorage } from '@/hooks/useOfflineStorage';
import { WifiOff, Wifi, RefreshCw, Clock, HardDrive } from 'lucide-react';

export function OfflineIndicator() {
  const { isOnline, isSlowConnection } = useNetworkStatus();
  const { pendingCount, processPendingSyncs, storageStats, isUsingFallback } = useOfflineStorage();

  const isStorageFull = storageStats && (storageStats.usedSpace / storageStats.totalSpace) > 0.9;
  
  if (isOnline && !isSlowConnection && pendingCount === 0 && !isStorageFull && !isUsingFallback) {
    return null;
  }

  const handleSync = async () => {
    await processPendingSyncs();
  };

  const getAlertContent = () => {
    if (!isOnline) {
      return {
        icon: <WifiOff className="h-4 w-4 text-destructive" />,
        message: 'You\'re offline',
        className: 'border-destructive bg-destructive/10'
      };
    }
    
    if (isSlowConnection) {
      return {
        icon: <Wifi className="h-4 w-4 text-yellow-600" />,
        message: 'Slow connection detected',
        className: 'border-yellow-500 bg-yellow-500/10'
      };
    }
    
    if (isStorageFull) {
      return {
        icon: <HardDrive className="h-4 w-4 text-destructive" />,
        message: 'Storage almost full',
        className: 'border-destructive bg-destructive/10'
      };
    }

    if (isUsingFallback) {
      return {
        icon: <Clock className="h-4 w-4 text-yellow-600" />,
        message: 'Using temporary storage',
        className: 'border-yellow-500 bg-yellow-500/10'
      };
    }
    
    return {
      icon: <Clock className="h-4 w-4 text-blue-600" />,
      message: `${pendingCount} items pending sync`,
      className: 'border-blue-500 bg-blue-500/10'
    };
  };

  const alertContent = getAlertContent();

  return (
    <Alert className={`fixed top-4 left-4 right-4 z-40 mx-auto max-w-sm ${alertContent.className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {alertContent.icon}
          <AlertDescription className="text-sm">
            {alertContent.message}
          </AlertDescription>
        </div>

        {isOnline && (pendingCount > 0 || isStorageFull) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSync}
            className="h-6 px-2 text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            {isStorageFull ? 'Clean' : 'Sync'}
          </Button>
        )}
      </div>
    </Alert>
  );
}