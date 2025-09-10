import { useMutation, useQueryClient, UseMutationResult } from '@tanstack/react-query';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getCurrentLocationCached, getAddressFromLocationCached, formatLocationForClockOut } from '@/services/locationService';
import type { ClockOutResult, ClockStateData, ClockOutLocationData } from './types';

const CLOCK_OPERATION_KEY = 'clock-operation-out-progress';

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
      // Check if operation already in progress
      if (sessionStorage.getItem(CLOCK_OPERATION_KEY) === 'true') {
        console.warn('[Clock Out] Operation already in progress');
        throw new Error('Clock operation in progress. Please wait.');
      }

      // Set lock
      sessionStorage.setItem(CLOCK_OPERATION_KEY, 'true');

      if (!profile?.id) {
        console.error('[Clock Out] No profile found');
        throw new Error('No profile found. Please refresh and try again.');
      }
      
      // Verify authentication before proceeding
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('[Clock Out] Authentication error:', authError);
        throw new Error('Authentication expired. Please refresh and log in again.');
      }

      console.log('[Clock Out] Authentication verified for user:', user.id);
      setIsClockingOut(true);

      try {
        // Get current clock data first to validate session exists
        const { data: clockData, error: queryError } = await supabase
          .from('employee_reports')
          .select('id, clock_in_time, work_order_id, project_id')
          .eq('employee_user_id', profile.id)
          .not('clock_in_time', 'is', null)
          .is('clock_out_time', null)
          .order('clock_in_time', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (queryError) {
          console.error('[Clock Out] Database query error:', queryError);
          throw queryError;
        }

        console.log('[Clock Out] Current clock session:', clockData);

        if (!clockData?.id || !clockData.clock_in_time) {
          const errorMsg = forceClockOut ? 
            'No active clock sessions found to force close.' : 
            'No active clock session found. You may already be clocked out.';
          console.error('[Clock Out] No active session:', errorMsg);
          throw new Error(errorMsg);
        }

        // Validate the session is actually active (not corrupted)
        const clockInTime = new Date(clockData.clock_in_time);
        const now = new Date();
        if (clockInTime > now) {
          console.error('[Clock Out] Invalid session - clock in time is in future:', clockInTime);
          throw new Error('Invalid clock session detected. Please refresh and try again.');
        }

        // Capture GPS location for clock out with caching
        let locationData = {};
        try {
          console.log('[Clock Out] Capturing location...');
          const location = await getCurrentLocationCached();
          if (location) {
            const address = await getAddressFromLocationCached(location);
            locationData = formatLocationForClockOut(location, address || 'Location captured');
            console.log('[Clock Out] Location captured successfully');
          }
        } catch (locationError) {
          console.warn('[Clock Out] Location capture failed:', locationError);
          // Location capture is optional, continue without it
        }
        
        const clockStateData: ClockStateData = {
          id: clockData.id,
          clock_in_time: clockData.clock_in_time,
          work_order_id: clockData.work_order_id,
          project_id: clockData.project_id
        };
        
        console.log('[Clock Out] Performing clock out operation...');
        const result = await performClockOut(clockStateData, locationData, profile.id);
        console.log('[Clock Out] Clock out completed successfully');
        
        return result;
      } catch (error) {
        console.error('[Clock Out] Clock out failed:', error);
        throw error;
      } finally {
        setIsClockingOut(false);
        // Clear lock
        sessionStorage.removeItem(CLOCK_OPERATION_KEY);
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