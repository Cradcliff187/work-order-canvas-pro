import { useEffect, useRef } from 'react';

interface PerformanceMetrics {
  queryKey: unknown[];
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'loading' | 'success' | 'error';
  error?: any;
}

const performanceMetrics = new Map<string, PerformanceMetrics>();

export function useQueryPerformance(
  queryKey: unknown[],
  isLoading: boolean,
  error: any,
  data: any
) {
  const startTimeRef = useRef<number>();
  const keyString = JSON.stringify(queryKey);

  // Start tracking when query begins
  useEffect(() => {
    if (isLoading && !startTimeRef.current) {
      startTimeRef.current = Date.now();
      performanceMetrics.set(keyString, {
        queryKey,
        startTime: startTimeRef.current,
        status: 'loading'
      });
    }
  }, [isLoading, keyString, queryKey]);

  // Complete tracking when query finishes
  useEffect(() => {
    if (!isLoading && startTimeRef.current) {
      const endTime = Date.now();
      const duration = endTime - startTimeRef.current;
      const status = error ? 'error' : 'success';

      performanceMetrics.set(keyString, {
        queryKey,
        startTime: startTimeRef.current,
        endTime,
        duration,
        status,
        error
      });

      // Log slow queries (> 2 seconds)
      if (duration > 2000) {
        console.warn(`Slow query detected:`, {
          queryKey,
          duration: `${duration}ms`,
          status
        });
      }

      // Reset for next query
      startTimeRef.current = undefined;
    }
  }, [isLoading, error, data, keyString, queryKey]);
}

export function getQueryMetrics(): PerformanceMetrics[] {
  return Array.from(performanceMetrics.values());
}

export function clearQueryMetrics(): void {
  performanceMetrics.clear();
}

export function getSlowQueries(threshold: number = 1000): PerformanceMetrics[] {
  return Array.from(performanceMetrics.values())
    .filter(metric => metric.duration && metric.duration > threshold)
    .sort((a, b) => (b.duration || 0) - (a.duration || 0));
}