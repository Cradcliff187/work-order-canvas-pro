import { useState, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';

interface RetryOptions {
  maxAttempts?: number;
  delay?: number;
  backoff?: boolean;
}

export const useRetry = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  options: RetryOptions = {}
) => {
  const { maxAttempts = 3, delay = 1000, backoff = true } = options;
  const [isRetrying, setIsRetrying] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);

  const executeWithRetry = useCallback(async (...args: T): Promise<R> => {
    let currentAttempt = 0;
    
    while (currentAttempt < maxAttempts) {
      try {
        if (currentAttempt > 0) {
          setIsRetrying(true);
          const waitTime = backoff ? delay * Math.pow(2, currentAttempt - 1) : delay;
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        setAttemptCount(currentAttempt + 1);
        const result = await fn(...args);
        
        if (currentAttempt > 0) {
          toast({
            title: "Success",
            description: `Operation succeeded after ${currentAttempt + 1} attempts`,
          });
        }
        
        setIsRetrying(false);
        setAttemptCount(0);
        return result;
      } catch (error) {
        currentAttempt++;
        
        if (currentAttempt >= maxAttempts) {
          setIsRetrying(false);
          setAttemptCount(0);
          toast({
            title: "Operation Failed",
            description: `Failed after ${maxAttempts} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`,
            variant: "destructive",
          });
          throw error;
        }
        
        console.warn(`Attempt ${currentAttempt} failed, retrying...`, error);
      }
    }
    
    throw new Error('Max retry attempts exceeded');
  }, [fn, maxAttempts, delay, backoff]);

  return {
    executeWithRetry,
    isRetrying,
    attemptCount,
  };
};