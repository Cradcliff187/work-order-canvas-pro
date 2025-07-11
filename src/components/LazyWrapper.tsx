import React, { Suspense } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { LoadingSpinner } from './LoadingSpinner';

interface LazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function LazyWrapper({ children, fallback }: LazyWrapperProps) {
  return (
    <ErrorBoundary>
      <Suspense fallback={fallback || <LoadingSpinner />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

export default LazyWrapper;