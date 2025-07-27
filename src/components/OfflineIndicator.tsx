import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useOfflineStorage } from '@/hooks/useOfflineStorage';
import { WifiOff, Wifi, RefreshCw, Clock, HardDrive } from 'lucide-react';

export function OfflineIndicator() {
  const { isOnline, isSlowConnection } = useNetworkStatus();
  const { 
    pendingCount, 
    processPendingSyncs, 
    storageStats, 
    isUsingFallback,
    initializationState,
    initializationError,
    retryInitialization,
    resetStorageWithConfirmation 
  } = useOfflineStorage();

  const isStorageFull = storageStats && (storageStats.usedSpace / storageStats.totalSpace) > 0.9;
  
  // Show initialization states
  if (initializationState === 'initializing' || initializationState === 'retrying' || initializationState === 'upgrading') {
    return (
      <Alert className="fixed top-4 left-4 right-4 z-40 mx-auto max-w-sm border-blue-500 bg-blue-500/10">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
          <AlertDescription className="text-sm">
            {initializationState === 'initializing' && 'Initializing storage...'}
            {initializationState === 'retrying' && 'Retrying connection...'}
            {initializationState === 'upgrading' && 'Upgrading database...'}
          </AlertDescription>
        </div>
      </Alert>
    );
  }

  // Show error state with recovery options
  if (initializationState === 'failed' && initializationError) {
    return (
      <Alert className="fixed top-4 left-4 right-4 z-40 mx-auto max-w-sm border-destructive bg-destructive/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <WifiOff className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-sm">
              Storage failed to initialize
            </AlertDescription>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={retryInitialization}
              className="h-6 px-2 text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
            {initializationError.recoverable && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetStorageWithConfirmation}
                className="h-6 px-2 text-xs"
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </Alert>
    );
  }
  
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
        message: 'Temporary storage active',
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

        {isOnline && (pendingCount > 0 || isStorageFull || isUsingFallback) && (
          <div className="flex gap-1">
            {(pendingCount > 0 || isStorageFull) && (
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
            {isUsingFallback && (
              <Button
                variant="ghost"
                size="sm"
                onClick={retryInitialization}
                className="h-6 px-2 text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Fix
              </Button>
            )}
          </div>
        )}
      </div>
    </Alert>
  );
}