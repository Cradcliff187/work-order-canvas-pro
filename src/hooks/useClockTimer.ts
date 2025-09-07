import { useMemo } from 'react';
import { useClockState } from './useClockState';
import { 
  formatElapsedTime as formatElapsedTimeCompact,
  formatElapsedTimeDetailed,
  formatElapsedTimeMinutes 
} from '@/utils/timeFormatters';

interface ClockTimerReturn {
  elapsedTime: number;
  formatElapsedTimeDetailed: (timeMs: number) => string;
  formatElapsedTimeCompact: (timeMs: number) => string;
  formatElapsedTimeMinutes: (timeMs: number) => string;
}

/**
 * Custom hook for managing clock timer logic and formatting
 * Provides multiple time formats and integrates with clock state
 */
export const useClockTimer = (): ClockTimerReturn => {
  const clockData = useClockState();

  // Get elapsed time from clock state (already real-time updated)
  const elapsedTime = clockData.elapsedTime;

  return useMemo(() => ({
    elapsedTime,
    formatElapsedTimeDetailed,
    formatElapsedTimeCompact,
    formatElapsedTimeMinutes,
  }), [elapsedTime]);
};