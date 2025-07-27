import { useState } from 'react';
import { X } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';
import { isIOS } from '@/utils/mobileDetection';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function PWAInstallBanner() {
  const { isInstallable, isInstalled, install } = usePWA();
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show if not installable, already installed, or dismissed
  if (!isInstallable || isInstalled || isDismissed) {
    return null;
  }

  const handleInstall = async () => {
    try {
      await install();
      setIsDismissed(true);
    } catch (error) {
      console.error('Failed to install PWA:', error);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <Card className="mx-auto max-w-md">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex-1 pr-4">
            {isIOS() ? (
              <div>
                <p className="text-sm font-medium">Install App</p>
                <p className="text-xs text-muted-foreground">
                  Tap Share → Add to Home Screen
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium">Install App</p>
                <p className="text-xs text-muted-foreground">
                  Get quick access from your home screen
                </p>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {!isIOS() && (
              <Button onClick={handleInstall} size="sm">
                Install
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDismiss}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}