import { useCallback } from 'react';
import { useClockState } from './useClockState';
import { useToast } from './use-toast';
import { useHapticFeedback } from './useHapticFeedback';
import type { ClockOption } from '@/components/employee/clock/types';

interface UseClockWidgetActionsParams {
  selectedOption: ClockOption | null;
  onSuccess: () => void;
}

interface UseClockWidgetActionsReturn {
  handleClockAction: () => Promise<void>;
  isProcessing: boolean;
}

export const useClockWidgetActions = ({
  selectedOption,
  onSuccess,
}: UseClockWidgetActionsParams): UseClockWidgetActionsReturn => {
  const { toast } = useToast();
  const { onSubmitSuccess, onError } = useHapticFeedback();
  const clockData = useClockState();
  const { clockIn, clockOut, isClockingIn, isClockingOut } = clockData;

  const handleClockAction = useCallback(async () => {
    if (!clockData.isClocked && !selectedOption) {
      toast({
        title: "Selection Required",
        description: "Please select a work order or project before clocking in.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (clockData.isClocked) {
        await clockOut.mutateAsync(false);
        onSubmitSuccess();
        onSuccess();
      } else if (selectedOption) {
        if (selectedOption.type === 'work_order') {
          await clockIn.mutateAsync({ workOrderId: selectedOption.id });
        } else {
          await clockIn.mutateAsync({ projectId: selectedOption.id });
        }
        onSubmitSuccess();
        onSuccess();
      }
    } catch (error) {
      onError();
    }
  }, [clockData.isClocked, selectedOption, clockIn, clockOut, toast, onSubmitSuccess, onError, onSuccess]);

  return {
    handleClockAction,
    isProcessing: isClockingIn || isClockingOut,
  };
};