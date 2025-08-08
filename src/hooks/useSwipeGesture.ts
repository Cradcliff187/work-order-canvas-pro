import { useCallback, useRef, useState } from 'react';

export type SwipeDirection = 'left' | 'right' | null;

interface UseSwipeGestureOptions {
  threshold?: number; // default 75px for action trigger (consumer can use it)
  verticalCancelThreshold?: number; // default 10px to cancel on vertical scroll
}

interface UseSwipeGestureReturn {
  // Note: spelling follows requested API shape
  isSwipeing: boolean; // true while finger is moving horizontally and not cancelled
  direction: SwipeDirection; // last computed direction for the current/last gesture
  distance: number; // absolute horizontal distance in px
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  onReset: () => void;
}

export function useSwipeGesture(
  options: UseSwipeGestureOptions = {}
): UseSwipeGestureReturn {
  const threshold = options.threshold ?? 75;
  const verticalCancelThreshold = options.verticalCancelThreshold ?? 10;

  const startX = useRef<number>(0);
  const startY = useRef<number>(0);
  const tracking = useRef<boolean>(false);
  const cancelledByScroll = useRef<boolean>(false);

  const [isSwipeing, setIsSwipeing] = useState(false);
  const [direction, setDirection] = useState<SwipeDirection>(null);
  const [distance, setDistance] = useState(0);

  const onReset = useCallback(() => {
    tracking.current = false;
    cancelledByScroll.current = false;
    setIsSwipeing(false);
    setDirection(null);
    setDistance(0);
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 0) return;
    const t = e.touches[0];
    startX.current = t.clientX;
    startY.current = t.clientY;
    tracking.current = true;
    cancelledByScroll.current = false;
    setIsSwipeing(false);
    setDirection(null);
    setDistance(0);
  }, []);

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!tracking.current) return;
      if (e.touches.length === 0) return;
      const t = e.touches[0];

      const dx = t.clientX - startX.current;
      const dy = t.clientY - startY.current;

      // Cancel swipe when vertical scroll dominates beyond threshold
      if (Math.abs(dy) > verticalCancelThreshold && Math.abs(dy) > Math.abs(dx)) {
        cancelledByScroll.current = true;
        setIsSwipeing(false);
        setDirection(null);
        setDistance(0);
        return;
      }

      if (cancelledByScroll.current) return;

      // We only support horizontal (left/right)
      const currentDirection: SwipeDirection = dx < 0 ? 'left' : 'right';
      setDirection(currentDirection);
      setDistance(Math.abs(dx));
      setIsSwipeing(true);
    },
    [verticalCancelThreshold]
  );

  const onTouchEnd = useCallback(() => {
    // End active swipe; keep the last direction/distance for caller to evaluate threshold
    setIsSwipeing(false);
    tracking.current = false;
    // Do not auto-reset direction/distance so consumer can read them after end
  }, []);

  return {
    isSwipeing,
    direction,
    distance,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onReset,
  };
}
