import { useCallback, useMemo } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

import { useDebounce } from '@/hooks/useDebounce';

interface UseMobileAllocationOptions {
  onRemoveAllocation?: (workOrderId: string) => void;
  onAmountChange?: (workOrderId: string, amount: number) => void;
  debounceDelay?: number;
}

export function useMobileAllocation({
  onRemoveAllocation,
  onAmountChange,
  debounceDelay = 500
}: UseMobileAllocationOptions = {}) {
  const isMobile = useIsMobile();
  const { 
    onFieldSave, 
    onFormSave, 
    onSubmitSuccess, 
    onError, 
    onSwipeAction 
  } = useHapticFeedback();

  // Enhanced haptic feedback for allocation actions
  const hapticFeedback = useMemo(() => ({
    onSelection: () => {
      if (isMobile) onFieldSave();
    },
    onDeselection: () => {
      if (isMobile) onSwipeAction();
    },
    onSplit: () => {
      if (isMobile) onFormSave();
    },
    onAutoAllocate: () => {
      if (isMobile) onFormSave();
    },
    onPerfectAllocation: () => {
      if (isMobile) onSubmitSuccess();
    },
    onValidationError: () => {
      if (isMobile) onError();
    },
    onAmountInput: () => {
      if (isMobile) onFieldSave();
    }
  }), [isMobile, onFieldSave, onSwipeAction, onFormSave, onSubmitSuccess, onError]);

  // Swipe-to-remove gesture for allocations - now handled by SwipeableListItem
  const useSwipeToRemove = useCallback((workOrderId: string) => {
    // Return a mock object for backward compatibility
    return {
      isSwipeing: false,
      direction: null,
      distance: 0,
      onTouchStart: () => {},
      onTouchMove: () => {},
      onTouchEnd: () => {},
      onReset: () => {}
    };
  }, []);

  // Debounced amount change for performance
  const useDebouncedAmountChange = useCallback((value: number, workOrderId: string) => {
    const debouncedValue = useDebounce(value, debounceDelay);
    
    return useMemo(() => {
      if (onAmountChange && debouncedValue !== undefined) {
        onAmountChange(workOrderId, debouncedValue);
      }
    }, [debouncedValue, workOrderId, onAmountChange]);
  }, [debounceDelay, onAmountChange]);

  // Mobile-optimized touch targets
  const getTouchTargetClass = useCallback((baseClass: string = '') => {
    return isMobile ? `${baseClass} min-h-[44px] min-w-[44px]` : baseClass;
  }, [isMobile]);

  // Keyboard-aware input handling
  const getInputProps = useCallback(() => ({
    inputMode: 'decimal' as const,
    pattern: '[0-9]*',
    autoComplete: 'off',
    ...(isMobile && {
      onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
        // Scroll input into view on mobile to prevent keyboard overlap
        setTimeout(() => {
          e.target.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }, 300);
      }
    })
  }), [isMobile]);

  // Floating action button positioning
  const getFloatingActionClass = useCallback(() => {
    return isMobile 
      ? 'fixed bottom-4 right-4 z-50 shadow-lg' 
      : 'sticky bottom-4 ml-auto';
  }, [isMobile]);

  return {
    isMobile,
    hapticFeedback,
    useSwipeToRemove,
    useDebouncedAmountChange,
    getTouchTargetClass,
    getInputProps,
    getFloatingActionClass
  };
}