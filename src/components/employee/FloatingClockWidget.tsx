import { useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useClockState } from '@/hooks/useClockState';
import { useClockTimer } from '@/hooks/useClockTimer';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useClockWidget } from '@/contexts/ClockWidgetContext';
import { useClockWidgetActions } from '@/hooks/useClockWidgetActions';
import { ClockFAB } from './clock/ClockFAB';
import { ClockSheet } from './clock/ClockSheet';
import type { ClockOption } from './clock/types';

export function FloatingClockWidget() {
  const location = useLocation();
  
  // Hide on dashboard page to avoid redundancy with hero clock
  if (location.pathname === '/employee/dashboard') {
    return null;
  }

  const { onFieldSave } = useHapticFeedback();
  const { isOpen, setIsOpen } = useClockWidget();
  const [selectedOption, setSelectedOption] = useState<ClockOption | null>(null);

  const clockData = useClockState();
  const { elapsedTime, formatElapsedTimeDetailed } = useClockTimer();
  
  const { handleClockAction, isProcessing } = useClockWidgetActions({
    selectedOption,
    onSuccess: () => {
      setSelectedOption(null);
      setIsOpen(false);
    },
  });

  const handleFabClick = useCallback(() => {
    onFieldSave();
    setIsOpen(true);
  }, [onFieldSave, setIsOpen]);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    setSelectedOption(null);
  }, [setIsOpen]);


  return (
    <>
      <ClockFAB
        isClocked={clockData.isClocked}
        elapsedTime={elapsedTime}
        onFabClick={handleFabClick}
        formatElapsedTime={formatElapsedTimeDetailed}
      />
      
      <ClockSheet
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        isClocked={clockData.isClocked}
        clockInTime={clockData.clockInTime}
        workOrderId={clockData.workOrderId}
        projectId={clockData.projectId}
        selectedOption={selectedOption}
        isLoading={isProcessing}
        onOptionSelect={setSelectedOption}
        onCancel={handleCancel}
        onClockAction={handleClockAction}
        formatElapsedTime={formatElapsedTimeDetailed}
      />
    </>
  );
}