import { useMutation, useQueryClient, UseMutationResult } from '@tanstack/react-query';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getCurrentLocationCached, getAddressFromLocationCached, formatLocationForClockOut } from '@/services/locationService';
import type { ClockOutResult, ClockStateData, ClockOutLocationData } from './types';

interface ClockOutMutationReturn {
  clockOut: UseMutationResult<ClockOutResult, Error, boolean>;
  isClockingOut: boolean;
}

export function useClockOutMutation(): ClockOutMutationReturn {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isClockingOut, setIsClockingOut] = useState(false);

  // Helper function to perform clock out operation
  const performClockOut = async (data: ClockStateData, locationData: any, employeeUserId: string): Promise<ClockOutResult> => {
    const clockOutTime = new Date();
    const clockInTime = new Date(data.clock_in_time);
    const hoursWorked = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);

    // Update employee report with clock out time, hours worked, and location
    const { error: updateError } = await supabase
      .from('employee_reports')
      .update({
        clock_out_time: clockOutTime.toISOString(),
        hours_worked: Math.round(hoursWorked * 100) / 100,
        ...locationData
      })
      .eq('id', data.id)
      .eq('employee_user_id', employeeUserId);

    if (updateError) {
      throw new Error(`Update failed: ${updateError.message}. Please try again or contact support.`);
    }
    
    return { locationData, hoursWorked };
  };

  const clockOut = useMutation({
    mutationFn: async (forceClockOut: boolean = false): Promise<ClockOutResult> => {
      if (!profile?.id) {
        throw new Error('No profile found. Please refresh and try again.');
      }
      
      // Verify authentication before proceeding
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Authentication expired. Please refresh and log in again.');
      }

      setIsClockingOut(true);

      try {
        // Capture GPS location for clock out with caching
        let locationData = {};
        try {
          const location = await getCurrentLocationCached();
          if (location) {
            const address = await getAddressFromLocationCached(location);
            locationData = formatLocationForClockOut(location, address || 'Location captured');
          }
        } catch {
          // Location capture is optional, continue without it
        }
        
        // Get current clock data
        const { data: clockData, error: queryError } = await supabase
          .from('employee_reports')
          .select('id, clock_in_time, work_order_id')
          .eq('employee_user_id', profile.id)
          .not('clock_in_time', 'is', null)
          .is('clock_out_time', null)
          .order('clock_in_time', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (queryError) {
          throw queryError;
        }

        if (!clockData?.id) {
          if (forceClockOut) {
            throw new Error('No active clock sessions found');
          } else {
            throw new Error('No active clock session found. Try refreshing the page.');
          }
        }
        
        const clockStateData: ClockStateData = {
          id: clockData.id,
          clock_in_time: clockData.clock_in_time,
          work_order_id: clockData.work_order_id
        };
        
        return await performClockOut(clockStateData, locationData, profile.id);
      } finally {
        setIsClockingOut(false);
      }
    },
    onMutate: () => {
      // Optimistic update: immediately show loading state
      setIsClockingOut(true);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['employee-clock-state'] });
      queryClient.invalidateQueries({ queryKey: ['employee-time-reports'] });
      const hasLocationAddress = result?.locationData && 'clock_out_location_address' in result.locationData;
      const locationText = hasLocationAddress ? 
        ` at ${(result.locationData as ClockOutLocationData).clock_out_location_address}` : '';
      const hours = Math.round((result?.hoursWorked || 0) * 100) / 100;
      toast({
        title: 'Clocked Out',
        description: `Successfully clocked out${locationText}. Time worked: ${hours} hours.`,
      });
    },
    onError: (error) => {
      setIsClockingOut(false);
      const errorMessage = error instanceof Error ? error.message : 'Failed to clock out';
      toast({
        title: 'Clock Out Failed', 
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  return {
    clockOut,
    isClockingOut
  };
}