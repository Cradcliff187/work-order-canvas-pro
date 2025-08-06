import { useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
}

interface RetryState {
  retryCount: Map<string, number>;
  lastAttemptTime: Map<string, number>;
}

const DEFAULT_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 8000
};

export function useApprovalRetry(config: Partial<RetryConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const queryClient = useQueryClient();
  const [state, setState] = useState<RetryState>({
    retryCount: new Map(),
    lastAttemptTime: new Map()
  });
  
  const retryTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const calculateDelay = useCallback((attemptNumber: number) => {
    // Exponential backoff with jitter
    const exponentialDelay = Math.min(
      finalConfig.baseDelay * Math.pow(2, attemptNumber),
      finalConfig.maxDelay
    );
    
    // Add jitter (±25%)
    const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5);
    return Math.max(100, exponentialDelay + jitter);
  }, [finalConfig]);

  const shouldRetry = useCallback((itemId: string, error: any) => {
    const currentCount = state.retryCount.get(itemId) || 0;
    
    // Don't retry validation errors or 4xx errors
    if (error?.status >= 400 && error?.status < 500) {
      return false;
    }
    
    // Don't retry if we've hit max attempts
    if (currentCount >= finalConfig.maxAttempts) {
      return false;
    }
    
    // Check rate limiting
    const lastAttempt = state.lastAttemptTime.get(itemId) || 0;
    const timeSinceLastAttempt = Date.now() - lastAttempt;
    const minWaitTime = calculateDelay(currentCount);
    
    return timeSinceLastAttempt >= minWaitTime;
  }, [state, finalConfig.maxAttempts, calculateDelay]);

  const scheduleRetry = useCallback(async <T>(
    itemId: string,
    operation: () => Promise<T>,
    onSuccess?: (result: T) => void,
    onFailure?: (error: any) => void
  ): Promise<void> => {
    const currentCount = state.retryCount.get(itemId) || 0;
    
    if (currentCount >= finalConfig.maxAttempts) {
      onFailure?.(new Error('Maximum retry attempts exceeded'));
      return;
    }

    const delay = calculateDelay(currentCount);
    
    // Clear any existing timeout
    const existingTimeout = retryTimeouts.current.get(itemId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    
    // Schedule the retry
    const timeoutId = setTimeout(async () => {
      setState(prev => ({
        retryCount: new Map(prev.retryCount).set(itemId, currentCount + 1),
        lastAttemptTime: new Map(prev.lastAttemptTime).set(itemId, Date.now())
      }));
      
      try {
        const result = await operation();
        onSuccess?.(result);
        
        // Clear retry state on success
        setState(prev => {
          const newRetryCount = new Map(prev.retryCount);
          const newLastAttempt = new Map(prev.lastAttemptTime);
          newRetryCount.delete(itemId);
          newLastAttempt.delete(itemId);
          return {
            retryCount: newRetryCount,
            lastAttemptTime: newLastAttempt
          };
        });
        
        retryTimeouts.current.delete(itemId);
      } catch (error) {
        console.error(`Retry ${currentCount + 1} failed for ${itemId}:`, error);
        
        if (shouldRetry(itemId, error)) {
          // Schedule another retry
          scheduleRetry(itemId, operation, onSuccess, onFailure);
        } else {
          onFailure?.(error);
          retryTimeouts.current.delete(itemId);
        }
      }
    }, delay);
    
    retryTimeouts.current.set(itemId, timeoutId);
  }, [state, finalConfig.maxAttempts, calculateDelay, shouldRetry]);

  const cancelRetry = useCallback((itemId: string) => {
    const timeoutId = retryTimeouts.current.get(itemId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      retryTimeouts.current.delete(itemId);
    }
    
    setState(prev => {
      const newRetryCount = new Map(prev.retryCount);
      const newLastAttempt = new Map(prev.lastAttemptTime);
      newRetryCount.delete(itemId);
      newLastAttempt.delete(itemId);
      return {
        retryCount: newRetryCount,
        lastAttemptTime: newLastAttempt
      };
    });
  }, []);

  const clearAllRetries = useCallback(() => {
    // Cancel all pending timeouts
    retryTimeouts.current.forEach(timeoutId => clearTimeout(timeoutId));
    retryTimeouts.current.clear();
    
    setState({
      retryCount: new Map(),
      lastAttemptTime: new Map()
    });
  }, []);

  const getRetryInfo = useCallback((itemId: string) => {
    const count = state.retryCount.get(itemId) || 0;
    const lastAttempt = state.lastAttemptTime.get(itemId) || 0;
    const hasTimeout = retryTimeouts.current.has(itemId);
    
    return {
      retryCount: count,
      lastAttemptTime: lastAttempt,
      hasScheduledRetry: hasTimeout,
      canRetry: count < finalConfig.maxAttempts
    };
  }, [state, finalConfig.maxAttempts]);

  // Cleanup timeouts on unmount
  const cleanup = useCallback(() => {
    retryTimeouts.current.forEach(timeoutId => clearTimeout(timeoutId));
    retryTimeouts.current.clear();
  }, []);

  return {
    scheduleRetry,
    cancelRetry,
    clearAllRetries,
    shouldRetry,
    getRetryInfo,
    cleanup,
    totalPendingRetries: retryTimeouts.current.size
  };
}