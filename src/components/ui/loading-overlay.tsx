import React from 'react';
import { createPortal } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  progress?: number;
  className?: string;
}

export function LoadingOverlay({ 
  isVisible, 
  message = "Loading...", 
  progress,
  className 
}: LoadingOverlayProps) {
  if (!isVisible) return null;

  const overlayContent = (
    <div
      className={cn(
        "fixed inset-0 z-40 flex items-center justify-center bg-background/80 backdrop-blur-sm",
        "animate-fade-in transition-all duration-200",
        className
      )}
      role="dialog"
      aria-modal="true"
      aria-label="Loading content"
      onClick={(e) => e.preventDefault()} // Prevent any clicks
    >
      <div className="flex flex-col items-center gap-4 p-6 bg-card rounded-lg shadow-lg border max-w-xs mx-4">
        <div className="relative">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          {progress !== undefined && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-medium text-primary">
                {Math.round(progress)}%
              </span>
            </div>
          )}
        </div>
        
        <div className="text-center space-y-2">
          <p className="text-sm font-medium text-foreground" aria-live="polite">
            {message}
          </p>
          {progress !== undefined && (
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Use portal to render at document body level for proper z-index
  return createPortal(overlayContent, document.body);
}

// Hook for managing loading states with context-aware messages
export function useLoadingOverlay() {
  const [loadingState, setLoadingState] = React.useState<{
    isVisible: boolean;
    message: string;
    progress?: number;
  }>({
    isVisible: false,
    message: "Loading..."
  });

  const showLoading = React.useCallback((message: string, progress?: number) => {
    setLoadingState({ isVisible: true, message, progress });
  }, []);

  const hideLoading = React.useCallback(() => {
    setLoadingState(prev => ({ ...prev, isVisible: false }));
  }, []);

  const updateProgress = React.useCallback((progress: number) => {
    setLoadingState(prev => ({ ...prev, progress }));
  }, []);

  return {
    ...loadingState,
    showLoading,
    hideLoading,
    updateProgress
  };
}