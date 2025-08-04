import React from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Wifi } from 'lucide-react';

interface QueryErrorProps {
  error: Error;
  onRetry?: () => void;
  title?: string;
  description?: string;
}

function QueryError({ 
  error, 
  onRetry, 
  title = "Failed to load data",
  description 
}: QueryErrorProps) {
  const isNetworkError = error.message.includes('fetch') || 
                         error.message.includes('network') ||
                         error.message.includes('connection');
  
  const isPermissionError = error.message.includes('permission') ||
                           error.message.includes('unauthorized') ||
                           error.message.includes('PGRST116');

  const getErrorIcon = () => {
    if (isNetworkError) return Wifi;
    return AlertCircle;
  };

  const getErrorMessage = () => {
    if (isPermissionError) {
      return "You don't have permission to view this data.";
    }
    if (isNetworkError) {
      return "Please check your internet connection and try again.";
    }
    return description || error.message || "An unexpected error occurred.";
  };

  const ErrorIcon = getErrorIcon();

  return (
    <div className="flex items-center justify-center min-h-[200px] p-4">
      <div className="max-w-md w-full">
        <Alert variant="destructive">
          <ErrorIcon className="h-4 w-4" />
          <AlertTitle>{title}</AlertTitle>
          <AlertDescription className="mt-2">
            {getErrorMessage()}
          </AlertDescription>
        </Alert>
        {onRetry && !isPermissionError && (
          <Button 
            onClick={onRetry}
            variant="outline"
            className="w-full mt-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        )}
      </div>
    </div>
  );
}

interface QueryErrorBoundaryProps {
  children: React.ReactNode;
  onRetry?: () => void;
  fallbackTitle?: string;
  fallbackDescription?: string;
}

function QueryErrorBoundary({ 
  children, 
  onRetry,
  fallbackTitle,
  fallbackDescription 
}: QueryErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={
        <QueryError
          error={new Error('Component error')}
          onRetry={onRetry}
          title={fallbackTitle}
          description={fallbackDescription}
        />
      }
    >
      {children}
    </ErrorBoundary>
  );
}

export { QueryError, QueryErrorBoundary };