/**
 * Format elapsed time from milliseconds to "Xh Ym" format
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