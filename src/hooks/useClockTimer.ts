import { useMemo, useCallback } from 'react';
import { useClockState } from './useClockState';
import { formatElapsedTime as formatElapsedTimeCompact } from '@/lib/utils/time';

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

  // Detailed format for FAB and active sessions (HH:MM:SS or MM:SS)
  const formatElapsedTimeDetailed = useCallback((timeMs: number): string => {
    const totalSeconds = Math.floor(timeMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Minutes-only format for simple displays
  const formatElapsedTimeMinutes = useCallback((timeMs: number): string => {
    const totalMinutes = Math.floor(timeMs / 60000);
    if (totalMinutes === 0) return '< 1 minute';
    if (totalMinutes === 1) return '1 minute';
    return `${totalMinutes} minutes`;
  }, []);

  return useMemo(() => ({
    elapsedTime,
    formatElapsedTimeDetailed,
    formatElapsedTimeCompact, // Re-export from utils
    formatElapsedTimeMinutes,
  }), [elapsedTime, formatElapsedTimeDetailed, formatElapsedTimeMinutes]);
};