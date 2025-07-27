import { usePWA } from '@/hooks/usePWA';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { WifiOff } from 'lucide-react';

export function OfflineIndicator() {
  const { isOffline } = usePWA();

  if (!isOffline) {
    return null;
  }

  return (
    <Alert className="fixed top-4 left-4 right-4 z-40 mx-auto max-w-sm border-warning bg-warning/10">
      <div className="flex items-center gap-2">
        <WifiOff className="h-4 w-4 text-warning" />
        <AlertDescription className="text-sm">
          You're offline - Some features may be limited
        </AlertDescription>
      </div>
    </Alert>
  );
}