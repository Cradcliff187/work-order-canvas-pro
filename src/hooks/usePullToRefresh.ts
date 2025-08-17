import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useRef, useEffect, useState, useCallback } from 'react';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

interface UsePullToRefreshOptions {
  queryKey: string | readonly string[];
  onRefresh?: () => Promise<void>;
  threshold?: number;
  successMessage?: string;
  errorMessage?: string;
  onFormReset?: () => void;
  enableTouchGesture?: boolean;
}

export const usePullToRefresh = ({
  queryKey,
  onRefresh,
  threshold = 70,
  successMessage = 'Data refreshed successfully',
  errorMessage = 'Failed to refresh data',
  onFormReset,
  enableTouchGesture = true
}: UsePullToRefreshOptions) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { onRefresh: hapticRefresh } = useHapticFeedback();
  
  // Touch gesture state
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const touchStartY = useRef<number>(0);
  const containerRef = useRef<HTMLElement | null>(null);

  const handleRefresh = async () => {
    try {
      // Trigger haptic feedback
      hapticRefresh();
      
      if (onFormReset) {
        // Reset form instead of refreshing data
        onFormReset();
      } else if (onRefresh) {
        await onRefresh();
      } else {
        // Default behavior: invalidate the query
        await queryClient.invalidateQueries({ queryKey: Array.isArray(queryKey) ? queryKey : [queryKey] });
      }
      
      toast({
        title: successMessage,
        description: onFormReset ? 'Form has been reset' : 'Your data has been updated'
      });
    } catch (error) {
      console.error('Pull to refresh error:', error);
      toast({
        title: errorMessage,
        description: 'Please try again later',
        variant: 'destructive'
      });
    }
  };

  // Touch event handlers for pull-to-refresh gesture
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enableTouchGesture || !isMobile) return;
    
    const touch = e.touches[0];
    touchStartY.current = touch.clientY;
    setIsPulling(false);
    setPullDistance(0);
  }, [enableTouchGesture, isMobile]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enableTouchGesture || !isMobile || !containerRef.current) return;
    
    const touch = e.touches[0];
    const currentY = touch.clientY;
    const deltaY = currentY - touchStartY.current;
    
    // Only handle downward pulls at the top of the container
    if (deltaY > 0 && containerRef.current.scrollTop === 0) {
      setIsPulling(true);
      setPullDistance(Math.min(deltaY * 0.5, threshold * 1.5)); // Dampening effect
    }
  }, [enableTouchGesture, isMobile, threshold]);

  const handleTouchEnd = useCallback(() => {
    if (!enableTouchGesture || !isMobile) return;
    
    if (isPulling && pullDistance >= threshold) {
      handleRefresh();
    }
    
    setIsPulling(false);
    setPullDistance(0);
  }, [enableTouchGesture, isMobile, isPulling, pullDistance, threshold, handleRefresh]);

  // Attach touch event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enableTouchGesture || !isMobile) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enableTouchGesture, isMobile, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    handleRefresh,
    threshold,
    isMobile,
    containerRef,
    pullDistance,
    isPulling,
    isRefreshable: isPulling && pullDistance >= threshold
  };
};