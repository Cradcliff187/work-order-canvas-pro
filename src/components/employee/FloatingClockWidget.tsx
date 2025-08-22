import { useState, useMemo, useCallback, useEffect } from 'react';
import { useClockState } from '@/hooks/useClockState';
import { useAllWorkItems } from '@/hooks/useAllWorkItems';
import { useRecentlyClocked } from '@/hooks/useRecentlyClocked';
import { useTodaysWork } from '@/hooks/useTodaysWork';
import { useToast } from '@/hooks/use-toast';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useClockWidget } from '@/contexts/ClockWidgetContext';
import { ClockFAB } from './clock/ClockFAB';
import { ClockSheet } from './clock/ClockSheet';
import type { ClockOption } from './clock/types';

export function FloatingClockWidget() {
  const { toast } = useToast();
  const { onFieldSave, onSubmitSuccess, onError } = useHapticFeedback();
  const { isOpen, setIsOpen } = useClockWidget();
  const [selectedOption, setSelectedOption] = useState<ClockOption | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const clockData = useClockState();
  const { clockIn, clockOut, isClockingIn, isClockingOut } = clockData;
  const { data: allWorkItems = [] } = useAllWorkItems();
  const { data: recentItems = [] } = useRecentlyClocked();
  const { data: todaysWork = [] } = useTodaysWork();

  // Organize work items into sections with today's work intelligence
  const clockOptions = useMemo<ClockOption[]>(() => {
    const options: ClockOption[] = [];
    const assignedIds = new Set<string>();
    const recentIds = new Set<string>();
    const todaysWorkMap = new Map<string, typeof todaysWork[0]>();

    // Create today's work lookup map
    todaysWork.forEach(item => {
      const key = `${item.type}_${item.id}`;
      todaysWorkMap.set(key, item);
    });

    // Helper function to check if item is currently active
    const isCurrentlyActive = (itemId: string, itemType: 'project' | 'work_order') => {
      if (!clockData.isClocked) return false;
      if (itemType === 'work_order') {
        return clockData.workOrderId === itemId;
      } else {
        return clockData.projectId === itemId;
      }
    };

    // Today's Work section - items worked today
    todaysWork.forEach(item => {
      const key = `${item.type}_${item.id}`;
      assignedIds.add(key); // Mark as processed
      options.push({
        id: item.id,
        type: item.type,
        title: item.title,
        number: item.number,
        section: 'today',
        hoursToday: item.hoursToday,
        lastWorkedAt: item.lastWorkedAt,
        sessionCount: item.sessionCount,
        isWorkedToday: true,
        isCurrentlyActive: isCurrentlyActive(item.id, item.type)
      });
    });

    // My Assignments section (enhanced with today's work info)
    allWorkItems
      .filter(item => item.isAssignedToMe)
      .forEach(item => {
        const key = `${item.type}_${item.id}`;
        const todaysInfo = todaysWorkMap.get(key);
        
        if (!assignedIds.has(key)) {
          assignedIds.add(key);
          options.push({
            id: item.id,
            type: item.type,
            title: item.title,
            number: item.number,
            section: 'assigned',
            hoursToday: todaysInfo?.hoursToday,
            lastWorkedAt: todaysInfo?.lastWorkedAt,
            sessionCount: todaysInfo?.sessionCount,
            isWorkedToday: !!todaysInfo,
            isCurrentlyActive: isCurrentlyActive(item.id, item.type)
          });
        }
      });

    // Recently Clocked section (excluding already assigned items)
    recentItems.forEach(item => {
      const key = `${item.type}_${item.id}`;
      const todaysInfo = todaysWorkMap.get(key);
      
      if (!assignedIds.has(key)) {
        recentIds.add(key);
        options.push({
          id: item.id,
          type: item.type,
          title: item.title,
          number: item.number,
          section: 'recent',
          hoursToday: todaysInfo?.hoursToday,
          lastWorkedAt: todaysInfo?.lastWorkedAt || new Date(item.lastClocked),
          sessionCount: todaysInfo?.sessionCount,
          isWorkedToday: !!todaysInfo,
          isCurrentlyActive: isCurrentlyActive(item.id, item.type)
        });
      }
    });

    // All Available section (excluding assigned and recent items)
    allWorkItems
      .filter(item => {
        const key = `${item.type}_${item.id}`;
        return !assignedIds.has(key) && !recentIds.has(key);
      })
      .forEach(item => {
        const key = `${item.type}_${item.id}`;
        const todaysInfo = todaysWorkMap.get(key);
        
        options.push({
          id: item.id,
          type: item.type,
          title: item.title,
          number: item.number,
          section: 'available',
          assigneeName: item.assigneeName,
          hoursToday: todaysInfo?.hoursToday,
          lastWorkedAt: todaysInfo?.lastWorkedAt,
          sessionCount: todaysInfo?.sessionCount,
          isWorkedToday: !!todaysInfo,
          isCurrentlyActive: isCurrentlyActive(item.id, item.type)
        });
      });

    return options;
  }, [allWorkItems, recentItems, todaysWork, clockData.isClocked, clockData.workOrderId, clockData.projectId]);

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

  const formatElapsedTime = useCallback((timeMs: number): string => {
    const totalSeconds = Math.floor(timeMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

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
      console.error('Clock action failed:', error);
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
        elapsedTime={clockData.elapsedTime}
        onFabClick={handleFabClick}
        formatElapsedTime={formatElapsedTime}
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
        formatElapsedTime={formatElapsedTime}
      />
    </>
  );
}

export default FloatingClockWidget;