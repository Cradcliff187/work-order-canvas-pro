/**
 * Centralized time formatting utilities
 * Consolidates all time-related formatting functions used across the application
 */

/**
 * Format elapsed time from milliseconds to "Xh Ym" format
 * Used in BasicClockButton, ClockTimer, and other time displays
 */
export const formatElapsedTime = (milliseconds: number): string => {
  if (milliseconds < 60000) return '< 1m'; // Less than 1 minute
  
  const totalMinutes = Math.floor(milliseconds / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (hours === 0) {
    return `${minutes}m`;
  }
  
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
};

/**
 * Detailed format for FAB and active sessions (HH:MM:SS or MM:SS)
 * Used in ClockActive and other components that need precise time display
 */
export const formatElapsedTimeDetailed = (timeMs: number): string => {
  const totalSeconds = Math.floor(timeMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * Minutes-only format for simple displays
 * Used in various components for readable time displays
 */
export const formatElapsedTimeMinutes = (timeMs: number): string => {
  const totalMinutes = Math.floor(timeMs / 60000);
  if (totalMinutes === 0) return '< 1 minute';
  if (totalMinutes === 1) return '1 minute';
  return `${totalMinutes} minutes`;
};

/**
 * Calculate current earnings based on elapsed time and hourly rate
 * Used in ClockActive and other components that display earnings
 */
export const calculateEarnings = (elapsedTime: number, hourlyRate: number): string => {
  const hoursWorked = elapsedTime / (1000 * 60 * 60);
  const earnings = hoursWorked * hourlyRate;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(earnings);
};

/**
 * Format work hours for display (e.g., "8.5 hrs", "2.25 hrs")
 * Used in work summaries, reports, and time tracking displays
 */
export const formatWorkHours = (hours: number): string => {
  if (hours === 0) return '0 hrs';
  if (hours < 0.1) return '< 0.1 hrs';
  
  // Round to 1 decimal place for display
  const roundedHours = Math.round(hours * 10) / 10;
  
  if (roundedHours === 1) return '1 hr';
  return `${roundedHours} hrs`;
};

/**
 * Convert milliseconds to hours (for calculations)
 * Helper function used by other formatters
 */
export const millisecondsToHours = (milliseconds: number): number => {
  return milliseconds / (1000 * 60 * 60);
};

/**
 * Convert hours to milliseconds (for calculations)
 * Helper function used by other formatters
 */
export const hoursToMilliseconds = (hours: number): number => {
  return hours * 60 * 60 * 1000;
};