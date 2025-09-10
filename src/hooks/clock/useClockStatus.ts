import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { ClockStateData, ClockState } from './types';

interface ClockStatusReturn extends ClockState {
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useClockStatus(): ClockStatusReturn {
  const { profile } = useAuth();
  const [elapsedTime, setElapsedTime] = useState<number>(0);

  const {
    data: clockData,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['employee-clock-state', profile?.id],
    queryFn: async (): Promise<ClockStateData | null> => {
      if (!profile?.id) {
        throw new Error('No employee ID available');
      }

      

      const { data, error } = await supabase
        .from('employee_reports')
        .select('id, clock_in_time, clock_out_time, work_order_id, project_id, location_lat, location_lng, location_address, hourly_rate_snapshot')
        .eq('employee_user_id', profile.id)
        .not('clock_in_time', 'is', null)
        .is('clock_out_time', null)
        .order('clock_in_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('[Clock Status] Database error:', error);
        throw error;
      }
      
      if (!data?.clock_in_time) {
        return null;
      }

      console.log('[Clock Status] Active session found:', {
        id: data.id,
        work_order_id: data.work_order_id,
        project_id: data.project_id,
        clock_in_time: data.clock_in_time
      });
      
      return {
        id: data.id,
        clock_in_time: data.clock_in_time,
        work_order_id: data.work_order_id,
        project_id: data.project_id,
        location_lat: data.location_lat,
        location_lng: data.location_lng,
        location_address: data.location_address,
        hourly_rate_snapshot: data.hourly_rate_snapshot
      };
    },
    enabled: !!profile?.id,
    refetchInterval: (data) => data ? 30000 : 120000, // 30s when clocked in, 2min when not
    refetchIntervalInBackground: false, // Stop polling when tab inactive
    staleTime: 15000, // 15 seconds
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Calculate elapsed time every second when clocked in
  useEffect(() => {
    if (!clockData?.clock_in_time) {
      setElapsedTime(0);
      return;
    }

    const clockInTime = new Date(clockData.clock_in_time);
    
    const updateElapsedTime = () => {
      const now = new Date();
      const elapsed = now.getTime() - clockInTime.getTime();
      setElapsedTime(elapsed);
    };

    // Update immediately
    updateElapsedTime();

    // Then update every second
    const interval = setInterval(updateElapsedTime, 1000);

    return () => clearInterval(interval);
  }, [clockData?.clock_in_time]);

  // Derived state values
  const isClocked = !!clockData;
  const activeReportId = clockData?.id || null;

  return {
    isClocked,
    activeReportId,
    clockInTime: clockData?.clock_in_time ? new Date(clockData.clock_in_time) : null,
    elapsedTime,
    workOrderId: clockData?.work_order_id || null,
    projectId: clockData?.project_id || null,
    locationLat: clockData?.location_lat || null,
    locationLng: clockData?.location_lng || null,
    locationAddress: clockData?.location_address || null,
    hourlyRate: clockData?.hourly_rate_snapshot || null,
    isLoading,
    isError,
    error: error as Error | null,
    refetch
  };
}