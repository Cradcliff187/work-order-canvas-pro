import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import type { Database } from '@/integrations/supabase/types';

type EmployeeReport = Database['public']['Tables']['employee_reports']['Row'];

interface ClockStateData {
  id: string;
  clock_in_time: string;
  work_order_id: string;
  project_id?: string | null;
}

export interface ClockState {
  isClocked: boolean;
  activeReportId: string | null;
  clockInTime: Date | null;
  elapsedTime: number; // in milliseconds
  workOrderId: string | null;
  projectId?: string | null;
}

export const useClockState = () => {
  const { profile } = useAuth();
  const [elapsedTime, setElapsedTime] = useState<number>(0);

  const {
    data: clockData,
    isLoading,
    isError,
    refetch
  } = useQuery({
    queryKey: ['employee-clock-state', profile?.id],
    queryFn: async (): Promise<ClockStateData | null> => {
      if (!profile?.id) throw new Error('No employee ID available');

      const { data, error } = await supabase
        .from('employee_reports')
        .select('id, clock_in_time, clock_out_time, work_order_id, project_id')
        .eq('employee_user_id', profile.id)
        .not('clock_in_time', 'is', null)
        .is('clock_out_time', null)
        .order('clock_in_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      if (!data?.clock_in_time) return null;
      
      return {
        id: data.id,
        clock_in_time: data.clock_in_time,
        work_order_id: data.work_order_id,
        project_id: data.project_id
      };
    },
    enabled: !!profile?.id,
    refetchInterval: 30000, // 30 seconds
    staleTime: 15000, // 15 seconds
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

  const clockState: ClockState = {
    isClocked: !!clockData,
    activeReportId: clockData?.id || null,
    clockInTime: clockData?.clock_in_time ? new Date(clockData.clock_in_time) : null,
    elapsedTime,
    workOrderId: clockData?.work_order_id || null,
    projectId: clockData?.project_id || null
  };

  return {
    ...clockState,
    isLoading,
    isError,
    refetch
  };
};