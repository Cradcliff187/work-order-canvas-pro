import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { AppRouter } from "./routes/AppRouter";
import { useBrowserTabTitle } from "./hooks/useBrowserTabTitle";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";
import { OfflineIndicator } from "./components/OfflineIndicator";
import { PWAUpdateNotification } from "./components/PWAUpdateNotification";
import { StorageDebugPanel } from "./components/StorageDebugPanel";


const queryClient = new QueryClient();

const AppContent = () => {
  useBrowserTabTitle();
  return <AppRouter />;
};

const App = () => {
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  // Development-only keyboard shortcut for debug panel
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'D') {
          e.preventDefault();
          setShowDebugPanel(prev => !prev);
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>
            <Toaster />
            <Sonner />
            <OfflineIndicator />
            <PWAUpdateNotification />
            {/* <PWAInstallPrompt /> */}
            <AppContent />
            {process.env.NODE_ENV !== 'production' && (
              <>
                <StorageDebugPanel 
                  isOpen={showDebugPanel} 
                  onClose={() => setShowDebugPanel(false)} 
                />
              </>
            )}
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
