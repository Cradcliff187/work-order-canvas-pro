import { useCallback } from 'react';
import { isIOS, isAndroid } from '@/utils/mobileDetection';

export type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning';

interface HapticFeedbackOptions {
  pattern?: HapticPattern;
  fallback?: boolean;
}

export const useHapticFeedback = () => {
  const triggerHaptic = useCallback((options: HapticFeedbackOptions = {}) => {
    const { pattern = 'light', fallback = true } = options;
    
    // Check if device supports haptics
    if (!navigator.vibrate) {
      return;
    }

    // Define vibration patterns for different feedback types
    const patterns: Record<HapticPattern, number | number[]> = {
      light: 10,        // Quick tap
      medium: 50,       // Button press
      heavy: 100,       // Important action
      success: [50, 50, 100],  // Success pattern
      error: [100, 100, 100],  // Error pattern  
      warning: [50, 100, 50]   // Warning pattern
    };

    try {
      // iOS specific optimizations
      if (isIOS()) {
        // iOS prefers shorter, more subtle vibrations
        const iosPatterns: Record<HapticPattern, number | number[]> = {
          light: 10,
          medium: 25,
          heavy: 50,
          success: [25, 25, 50],
          error: [50, 50, 50],
          warning: [25, 50, 25]
        };
        navigator.vibrate(iosPatterns[pattern]);
      } else if (isAndroid()) {
        // Android can handle stronger vibrations
        navigator.vibrate(patterns[pattern]);
      } else if (fallback) {
        // Fallback for other devices
        navigator.vibrate(patterns.light);
      }
    } catch (error) {
      // Silently fail - haptic feedback is non-critical
      console.debug('Haptic feedback failed:', error);
    }
  }, []);

  const feedbackHandlers = {
    onFieldSave: () => triggerHaptic({ pattern: 'light' }),
    onFormSave: () => triggerHaptic({ pattern: 'medium' }),
    onSubmitSuccess: () => triggerHaptic({ pattern: 'success' }),
    onError: () => triggerHaptic({ pattern: 'error' }),
    onImageCapture: () => triggerHaptic({ pattern: 'heavy' }),
    onSwipeAction: () => triggerHaptic({ pattern: 'medium' }),
    onRefresh: () => triggerHaptic({ pattern: 'light' }),
  };

  return {
    triggerHaptic,
    ...feedbackHandlers
  };
};