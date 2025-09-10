import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { cn } from '@/lib/utils';

interface MobileBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  swipeToClose?: boolean;
  backdropTapToClose?: boolean;
  hapticFeedback?: boolean;
  maxHeight?: string;
  className?: string;
  contentClassName?: string;
  onSwipeThreshold?: () => void;
  onOpen?: () => void;
}

export function MobileBottomSheet({
  isOpen,
  onClose,
  title,
  children,
  swipeToClose = true,
  backdropTapToClose = true,
  hapticFeedback = true,
  maxHeight = "85vh",
  className = "",
  contentClassName = "",
  onSwipeThreshold,
  onOpen
}: MobileBottomSheetProps) {
  const [isClosing, setIsClosing] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number>(0);
  const lastYRef = useRef<number>(0);
  const velocityRef = useRef<number>(0);
  const { onFieldSave, onSubmitSuccess, onSwipeAction } = useHapticFeedback();

  // Handle open/close animations
  useEffect(() => {
    if (isOpen && onOpen) {
      onOpen();
      if (hapticFeedback) onFieldSave(); // Light haptic on open
    }
  }, [isOpen, onOpen, hapticFeedback, onFieldSave]);

  // Lock body scroll when open - MUST be before early return
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  // Touch event handlers for swipe gesture
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!swipeToClose) return;
    
    const touch = e.touches[0];
    startYRef.current = touch.clientY;
    lastYRef.current = touch.clientY;
    setIsDragging(true);
    velocityRef.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swipeToClose || !isDragging) return;

    const touch = e.touches[0];
    const currentY = touch.clientY;
    const deltaY = currentY - startYRef.current;
    
    // Calculate velocity for momentum
    velocityRef.current = currentY - lastYRef.current;
    lastYRef.current = currentY;

    // Only allow downward swipes
    if (deltaY > 0) {
      setSwipeOffset(deltaY);
      
      // Haptic feedback when reaching close threshold
      if (deltaY > 150 && onSwipeThreshold && hapticFeedback) {
        onSwipeThreshold();
        onSwipeAction(); // Medium haptic for threshold
      }
    }
  };

  const handleTouchEnd = () => {
    if (!swipeToClose || !isDragging) return;

    setIsDragging(false);
    
    // Determine if should close based on distance or velocity
    const shouldClose = swipeOffset > 150 || (swipeOffset > 50 && velocityRef.current > 5);
    
    if (shouldClose) {
      handleClose();
    } else {
      // Snap back with spring animation
      setSwipeOffset(0);
    }
  };

  const handleClose = () => {
    if (hapticFeedback) onSubmitSuccess(); // Success haptic on close
    setIsClosing(true);
    setSwipeOffset(0);
    
    // Delay to allow exit animation
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 250);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (backdropTapToClose && e.target === e.currentTarget) {
      handleClose();
    }
  };

  // Prevent rendering when not open and not closing
  if (!isOpen && !isClosing) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end"
      onClick={handleBackdropClick}
      style={{ touchAction: 'none' }}
    >
      {/* Backdrop with fade animation */}
      <div 
        className={cn(
          "absolute inset-0 bg-black/60 transition-opacity duration-300",
          isOpen && !isClosing ? "opacity-100" : "opacity-0"
        )}
        style={{
          opacity: isDragging 
            ? Math.max(0.6 - (swipeOffset / 400), 0) 
            : undefined
        }}
      />

      {/* Sheet content */}
      <div
        ref={sheetRef}
        className={cn(
          "relative w-full bg-background shadow-2xl transition-transform duration-300 ease-out",
          "rounded-t-3xl border-t border-border overflow-hidden",
          "flex flex-col",
          className
        )}
        style={{
          maxHeight,
          transform: `translateY(${
            isDragging 
              ? swipeOffset 
              : isOpen && !isClosing 
                ? '0px' 
                : '100%'
          }px)`,
          willChange: 'transform'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle and header */}
        <div className="flex-shrink-0 px-6 pt-4 pb-2">
          <div className="mx-auto w-12 h-1 bg-muted-foreground/30 rounded-full mb-4" />
          {title && (
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                {title}
              </h2>
              <button
                onClick={handleClose}
                className="p-2 rounded-full hover:bg-muted/50 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                style={{ touchAction: 'manipulation' }}
              >
                <X className="h-5 w-5" />
                <span className="sr-only">Close</span>
              </button>
            </div>
          )}
        </div>

        {/* Scrollable content area - optimized for thumb reach */}
        <div 
          className={cn(
            "flex-1 overflow-y-auto px-6 pb-6",
            "scroll-smooth overscroll-contain",
            contentClassName
          )}
          style={{
            // Ensure content is in thumb-reach zone
            paddingBottom: "max(24px, env(safe-area-inset-bottom))"
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}