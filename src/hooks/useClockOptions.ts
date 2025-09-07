import { useMemo } from 'react';
import { useClockState } from './useClockState';
import { useAllWorkItems } from './useAllWorkItems';
import { useRecentlyClocked } from './useRecentlyClocked';
import { useTodaysWork } from './useTodaysWork';
import type { ClockOption } from '@/components/employee/clock/types';

/**
 * Custom hook for organizing work items into clock options
 * Provides structured work items with today's work intelligence
 */
export const useClockOptions = () => {
  const clockData = useClockState();
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

  return clockOptions;
};