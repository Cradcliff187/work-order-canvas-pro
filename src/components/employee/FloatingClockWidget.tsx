import { useState, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useClockState } from '@/hooks/useClockState';
import { useClockTimer } from '@/hooks/useClockTimer';
import { useClockOptions } from '@/hooks/useClockOptions';
import { useToast } from '@/hooks/use-toast';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useClockWidget } from '@/contexts/ClockWidgetContext';
import { ClockFAB } from './clock/ClockFAB';
import { ClockSheet } from './clock/ClockSheet';
import type { ClockOption } from './clock/types';

export function FloatingClockWidget() {
  const location = useLocation();
  
  // Hide on dashboard page to avoid redundancy with hero clock
  if (location.pathname === '/employee/dashboard') {
    return null;
  }

  const { toast } = useToast();
  const { onFieldSave, onSubmitSuccess, onError } = useHapticFeedback();
  const { isOpen, setIsOpen } = useClockWidget();
  const [selectedOption, setSelectedOption] = useState<ClockOption | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const clockData = useClockState();
  const { clockIn, clockOut, isClockingIn, isClockingOut } = clockData;
  const { elapsedTime, formatElapsedTimeDetailed } = useClockTimer();
  const clockOptions = useClockOptions();

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return clockOptions;
    const query = searchQuery.toLowerCase();
    return clockOptions.filter(option => 
      option.number.toLowerCase().includes(query) ||
      option.title.toLowerCase().includes(query) ||
      option.assigneeName?.toLowerCase().includes(query)
    );
  }, [clockOptions, searchQuery]);

  const handleFabClick = useCallback(() => {
    onFieldSave();
    setIsOpen(true);
  }, [onFieldSave, setIsOpen]);

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
        setIsOpen(false);
      } else if (selectedOption) {
        if (selectedOption.type === 'work_order') {
          await clockIn.mutateAsync({ workOrderId: selectedOption.id });
        } else {
          await clockIn.mutateAsync({ projectId: selectedOption.id });
        }
        onSubmitSuccess();
        setSelectedOption(null);
        setIsOpen(false);
      }
    } catch (error) {
      onError();
    }
  }, [clockData.isClocked, selectedOption, clockIn, clockOut, toast, onSubmitSuccess, onError]);

  const handleCancel = () => {
    setIsOpen(false);
    setSelectedOption(null);
    setSearchQuery('');
  };

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
        searchQuery={searchQuery}
        filteredOptions={filteredOptions}
        isLoading={isClockingIn || isClockingOut}
        onSearchChange={setSearchQuery}
        onOptionSelect={setSelectedOption}
        onCancel={handleCancel}
        onClockAction={handleClockAction}
        formatElapsedTime={formatElapsedTimeDetailed}
      />
    </>
  );
}