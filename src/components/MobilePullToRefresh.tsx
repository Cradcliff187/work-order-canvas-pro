import React, { useState, useRef, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';

interface MobilePullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
  threshold?: number;
  maxPullDistance?: number;
  disabled?: boolean;
}

export function MobilePullToRefresh({
  onRefresh,
  children,
  threshold = 80,
  maxPullDistance = 120,
  disabled = false
}: MobilePullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [canPull, setCanPull] = useState(false);
  const startY = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    const touch = e.touches[0];
    startY.current = touch.clientY;
    
    // Check if we're at the top of the scrollable area
    const container = containerRef.current;
    if (container && container.scrollTop === 0) {
      setCanPull(true);
    }
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!canPull || disabled || isRefreshing || startY.current === null) return;

    const touch = e.touches[0];
    const currentY = touch.clientY;
    const deltaY = currentY - startY.current;

    if (deltaY > 0) {
      // Prevent default scroll behavior
      e.preventDefault();
      
      // Calculate pull distance with resistance
      const resistance = Math.pow(deltaY / maxPullDistance, 0.8);
      const distance = Math.min(deltaY * resistance, maxPullDistance);
      
      setPullDistance(distance);
    }
  }, [canPull, disabled, isRefreshing, maxPullDistance]);

  const handleTouchEnd = useCallback(async () => {
    if (!canPull || disabled || isRefreshing) return;

    setCanPull(false);
    
    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      
      // Add haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
      
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        setIsRefreshing(false);
      }
    }
    
    setPullDistance(0);
    startY.current = null;
  }, [canPull, disabled, isRefreshing, pullDistance, threshold, onRefresh]);

  const pullProgress = Math.min(pullDistance / threshold, 1);
  const showRefreshIcon = pullDistance > 10;
  const isTriggered = pullDistance >= threshold;

  return (
    <div 
      ref={containerRef}
      className="relative h-full overflow-auto"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull to refresh indicator */}
      {(showRefreshIcon || isRefreshing) && (
        <div 
          className="absolute top-0 left-0 right-0 flex items-center justify-center z-50 transition-all duration-200"
          style={{
            transform: `translateY(${Math.max(pullDistance - 40, 0)}px)`,
            opacity: showRefreshIcon ? 1 : 0
          }}
        >
          <div className="flex flex-col items-center py-4">
            <div className={`relative ${isRefreshing ? 'animate-spin' : ''}`}>
              <RefreshCw 
                className={`h-6 w-6 transition-all duration-200 ${
                  isTriggered || isRefreshing 
                    ? 'text-primary' 
                    : 'text-muted-foreground'
                }`}
                style={{
                  transform: isRefreshing 
                    ? 'rotate(0deg)' 
                    : `rotate(${pullProgress * 180}deg)`
                }}
              />
            </div>
            <span className="text-xs text-muted-foreground mt-2">
              {isRefreshing 
                ? 'Refreshing...' 
                : isTriggered 
                  ? 'Release to refresh'
                  : 'Pull to refresh'
              }
            </span>
          </div>
        </div>
      )}

      {/* Content with transform */}
      <div 
        className="transition-transform duration-200 ease-out"
        style={{
          transform: `translateY(${pullDistance}px)`
        }}
      >
        {children}
      </div>
    </div>
  );
}