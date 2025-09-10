import { useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useClockState } from '@/hooks/useClockState';
import { useClockTimer } from '@/hooks/useClockTimer';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useClockWidget } from '@/contexts/ClockWidgetContext';
import { useClockWidgetActions } from '@/hooks/useClockWidgetActions';
import { useIsMobile } from '@/hooks/use-mobile';
import { ClockFAB } from './clock/ClockFAB';
import { MobileClockFAB } from './mobile/MobileClockFAB';
import { ClockSheet } from './clock/ClockSheet';
import type { ClockOption } from './clock/types';

export function FloatingClockWidget() {
  const location = useLocation();
  const isMobile = useIsMobile();
  const { onFieldSave } = useHapticFeedback();
  const { isOpen, setIsOpen } = useClockWidget();
  const [selectedOption, setSelectedOption] = useState<ClockOption | null>(null);

  const clockData = useClockState();
  const { elapsedTime } = useClockTimer();
  
  const { handleClockAction, isProcessing } = useClockWidgetActions({
    selectedOption,
    onSuccess: () => {
      setSelectedOption(null);
      setIsOpen(false);
    },
  });

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL LOGIC
  const handleFabClick = useCallback(() => {
    onFieldSave();
    setIsOpen(true);
  }, [onFieldSave, setIsOpen]);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    setSelectedOption(null);
  }, [setIsOpen]);
  
  // Hide FAB on dashboard when not clocked (dashboard shows hero card instead)
  const shouldHideFAB = location.pathname === '/employee/dashboard' && !clockData.isClocked;

  return (
    <>
      {!shouldHideFAB && (
        <>
          {isMobile ? (
            <MobileClockFAB
              isClocked={clockData.isClocked}
              elapsedTime={elapsedTime}
              onFabClick={handleFabClick}
            />
          ) : (
            <ClockFAB
              isClocked={clockData.isClocked}
              elapsedTime={elapsedTime}
              onFabClick={handleFabClick}
            />
          )}
        </>
      )}
      
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
      />
    </>
  );
}