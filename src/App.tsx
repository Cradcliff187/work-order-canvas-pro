import React, { useState, useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { PWAUpdateNotification } from '@/components/PWAUpdateNotification';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';
import { StorageDebugPanel } from '@/components/StorageDebugPanel';

import { OrganizationAuthProvider } from '@/contexts/OrganizationAuthContext';
import { AppRouter } from '@/routes/AppRouter';
import { useBrowserTabTitle } from '@/hooks/useBrowserTabTitle';
import { MessageCountsProvider } from '@/contexts/MessageCountsProvider';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

const AppContent: React.FC = () => {
  return <AppRouter />;
};

const AppWithBrowserTitle: React.FC = () => {
  useBrowserTabTitle();
  return <AppContent />;
};

const App: React.FC = () => {
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'D' && process.env.NODE_ENV !== 'production') {
        setShowDebugPanel(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <OrganizationAuthProvider>
            <MessageCountsProvider>
              <Toaster />
              <Sonner richColors closeButton />
              <OfflineIndicator />
              <PWAUpdateNotification />
              <PWAInstallPrompt />
              
              <AppWithBrowserTitle />
              {process.env.NODE_ENV !== 'production' && (
                <StorageDebugPanel 
                  isOpen={showDebugPanel} 
                  onClose={() => setShowDebugPanel(false)} 
                />
              )}
            </MessageCountsProvider>
          </OrganizationAuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;