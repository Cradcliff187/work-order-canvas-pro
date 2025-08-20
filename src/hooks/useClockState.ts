import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
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
  const queryClient = useQueryClient();
  const { toast } = useToast();

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

  // Clock in mutation
  const clockIn = useMutation({
    mutationFn: async () => {
      if (!profile?.id) throw new Error('No profile found');

      // Get the most recent work order assignment
      const { data: assignment, error: assignmentError } = await supabase
        .from('work_order_assignments')
        .select('work_order_id')
        .eq('assigned_to', profile.id)
        .order('assigned_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (assignmentError) throw assignmentError;
      if (!assignment) throw new Error('No work order assignments found. Please contact your supervisor.');

      // Get user's hourly cost rate
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('hourly_cost_rate')
        .eq('id', profile.id)
        .single();

      if (profileError) throw profileError;
      if (!userProfile?.hourly_cost_rate) throw new Error('Hourly rate not set. Please contact administration.');

      // Create employee report with clock in time
      const { error: reportError } = await supabase
        .from('employee_reports')
        .insert({
          employee_user_id: profile.id,
          work_order_id: assignment.work_order_id,
          report_date: new Date().toISOString().split('T')[0],
          clock_in_time: new Date().toISOString(),
          hourly_rate_snapshot: userProfile.hourly_cost_rate,
          hours_worked: 0,
          work_performed: '',
        });

      if (reportError) throw reportError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-clock-state'] });
      toast({
        title: 'Clocked In',
        description: 'Successfully clocked in to your work assignment.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Clock In Failed',
        description: error instanceof Error ? error.message : 'Failed to clock in',
        variant: 'destructive',
      });
    },
  });

  // Clock out mutation
  const clockOut = useMutation({
    mutationFn: async () => {
      if (!clockData?.id) throw new Error('No active clock session found');
      if (!clockData?.clock_in_time) throw new Error('Invalid clock in time');

      const clockOutTime = new Date();
      const clockInTime = new Date(clockData.clock_in_time);
      const hoursWorked = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);

      // Update employee report with clock out time and hours worked
      const { error: updateError } = await supabase
        .from('employee_reports')
        .update({
          clock_out_time: clockOutTime.toISOString(),
          hours_worked: Math.round(hoursWorked * 100) / 100, // Round to 2 decimal places
        })
        .eq('id', clockData.id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-clock-state'] });
      queryClient.invalidateQueries({ queryKey: ['employee-time-reports'] });
      toast({
        title: 'Clocked Out',
        description: 'Successfully clocked out and time recorded.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Clock Out Failed', 
        description: error instanceof Error ? error.message : 'Failed to clock out',
        variant: 'destructive',
      });
    },
  });

  return {
    ...clockState,
    isLoading,
    isError,
    refetch,
    clockIn,
    clockOut,
    isClockingIn: clockIn.isPending,
    isClockingOut: clockOut.isPending,
  };
};