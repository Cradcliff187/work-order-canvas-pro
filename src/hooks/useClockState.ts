import { useClockStatus } from './clock/useClockStatus';
import { useClockActions } from './clock/useClockActions';
import { useLocationTracking } from './clock/useLocationTracking';
import type { ClockState } from './clock/types';

// Re-export types for backward compatibility
export type { ClockState } from './clock/types';

export const useClockState = () => {
  // Use the three focused hooks
  const clockStatus = useClockStatus();
  const clockActions = useClockActions();
  const { clearLocationCache } = useLocationTracking();

  // Combined loading states for backward compatibility
  const isAnyLoading = clockStatus.isLoading || clockActions.isClockingIn || clockActions.isClockingOut;
  const hasError = clockStatus.isError;

  // Return the same interface as before for backward compatibility
  return {
    ...clockStatus,
    isLoading: isAnyLoading,
    isError: hasError,
    clockIn: clockActions.clockIn,
    clockOut: clockActions.clockOut,
    forceClockOut: clockActions.forceClockOut,
    isClockingIn: clockActions.isClockingIn,
    isClockingOut: clockActions.isClockingOut,
    clearLocationCache, // New utility function
  };
};