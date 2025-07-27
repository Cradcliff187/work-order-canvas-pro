import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePWA } from '@/hooks/usePWA';
import { Download, X, Smartphone } from 'lucide-react';

export function PWAInstallPrompt() {
  const { isInstallable, isInstalled, install } = usePWA();
  const [dismissed, setDismissed] = useState(false);

  if (!isInstallable || isInstalled || dismissed) {
    return null;
  }

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  const handleInstall = async () => {
    try {
      await install();
    } catch (error) {
      console.error('Installation failed:', error);
    }
  };

  return (
    <Card className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm border-primary bg-background shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Install WorkOrderPro</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDismissed(true)}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription className="text-sm">
          Install the app for faster access and offline capabilities
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isIOS ? (
          <div className="space-y-2 text-sm">
            <p>To install on iOS:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Tap the Share button</li>
              <li>Select "Add to Home Screen"</li>
              <li>Tap "Add"</li>
            </ol>
          </div>
        ) : (
          <Button onClick={handleInstall} className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Install App
          </Button>
        )}
      </CardContent>
    </Card>
  );
}