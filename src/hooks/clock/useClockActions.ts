import { UseMutationResult } from '@tanstack/react-query';
import { useClockInMutation } from './useClockInMutation';
import { useClockOutMutation } from './useClockOutMutation';
import type { ClockInParams, ClockInResult, ClockOutResult } from './types';

interface ClockActionsReturn {
  clockIn: UseMutationResult<ClockInResult | null, Error, ClockInParams>;
  clockOut: UseMutationResult<ClockOutResult, Error, boolean>;
  forceClockOut: () => void;
  isClockingIn: boolean;
  isClockingOut: boolean;
}

export function useClockActions(): ClockActionsReturn {
  const { clockIn, isClockingIn } = useClockInMutation();
  const { clockOut, isClockingOut } = useClockOutMutation();

  // Force clock out function for edge cases
  const forceClockOut = () => {
    clockOut.mutate(true);
  };

  return {
    clockIn,
    clockOut,
    forceClockOut,
    isClockingIn,
    isClockingOut
  };
}