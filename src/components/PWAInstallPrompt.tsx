import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePWA } from '@/hooks/usePWA';
import { Download, X, Smartphone, Share } from 'lucide-react';

export function PWAInstallPrompt() {
  const { isInstallable, isInstalled, install } = usePWA();
  const [dismissed, setDismissed] = useState(false);
  const [showAfterDelay, setShowAfterDelay] = useState(false);

  // Check localStorage for dismissal persistence
  useEffect(() => {
    const dismissedUntil = localStorage.getItem('pwa-install-dismissed');
    if (dismissedUntil) {
      const dismissedDate = new Date(dismissedUntil);
      const now = new Date();
      // Auto-show again after 7 days
      if (now.getTime() - dismissedDate.getTime() < 7 * 24 * 60 * 60 * 1000) {
        setDismissed(true);
        return;
      }
    }

    // Show after 3 seconds for new users
    const timer = setTimeout(() => {
      setShowAfterDelay(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  if (!isInstallable || isInstalled || dismissed || !showAfterDelay) {
    return null;
  }

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
  };

  const handleInstall = async () => {
    try {
      await install();
    } catch (error) {
      console.error('Installation failed:', error);
    }
  };

  return (
    <Card className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm border-primary bg-background shadow-lg animate-slide-up">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Install AKC Portal</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-6 w-6 p-0 min-h-[48px] min-w-[48px]"
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
          <div className="space-y-3 text-sm">
            <p className="font-medium">To install on iOS Safari:</p>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
              <li className="flex items-center gap-2">
                <span>Tap the</span>
                <Share className="h-4 w-4 inline" />
                <span>Share button</span>
              </li>
              <li>Select "Add to Home Screen"</li>
              <li>Tap "Add"</li>
            </ol>
          </div>
        ) : (
          <Button onClick={handleInstall} className="w-full min-h-[48px]">
            <Download className="h-4 w-4 mr-2" />
            Install App
          </Button>
        )}
      </CardContent>
    </Card>
  );
}