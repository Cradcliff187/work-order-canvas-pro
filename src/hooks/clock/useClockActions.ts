import { useMutation, useQueryClient, UseMutationResult } from '@tanstack/react-query';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getCurrentLocationCached, getAddressFromLocationCached, formatLocationForClockIn, formatLocationForClockOut } from '@/services/locationService';
import type { ClockInParams, ClockInResult, ClockOutResult, ClockStateData, ClockOutLocationData } from './types';

interface ClockActionsReturn {
  clockIn: UseMutationResult<ClockInResult | null, Error, ClockInParams>;
  clockOut: UseMutationResult<ClockOutResult, Error, boolean>;
  forceClockOut: () => void;
  isClockingIn: boolean;
  isClockingOut: boolean;
}

export function useClockActions(): ClockActionsReturn {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  
  const [isClockingIn, setIsClockingIn] = useState(false);
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

  // Clock in mutation with optimistic updates
  const clockIn = useMutation({
    mutationFn: async ({ workOrderId, projectId }: ClockInParams = {}): Promise<ClockInResult | null> => {
      if (!profile?.id) {
        throw new Error('No profile found');
      }

      setIsClockingIn(true);

      try {
        // Capture GPS location with caching
        let locationData: ClockInResult | null = null;
        try {
          const location = await getCurrentLocationCached();
          if (location) {
            const address = await getAddressFromLocationCached(location);
            locationData = formatLocationForClockIn(location, address || 'Location captured');
          }
        } catch {
          // Location capture is optional, continue without it
        }

        let finalWorkOrderId = workOrderId;
        
        // If no work order or project specified, get the most recent work order assignment
        if (!workOrderId && !projectId) {
          const { data: assignment, error: assignmentError } = await supabase
            .from('work_order_assignments')
            .select('work_order_id')
            .eq('assigned_to', profile.id)
            .order('assigned_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (assignmentError) {
            throw assignmentError;
          }
          if (!assignment) {
            throw new Error('No work order assignments found. Please contact your supervisor.');
          }
          finalWorkOrderId = assignment.work_order_id;
        }

        // Get user's hourly cost rate
        const { data: userProfile, error: profileError } = await supabase
          .from('profiles')
          .select('hourly_cost_rate')
          .eq('id', profile.id)
          .single();

        if (profileError) {
          throw profileError;
        }
        if (!userProfile?.hourly_cost_rate) {
          throw new Error('Hourly rate not set. Please contact administration.');
        }

        // Create employee report with clock in time and location
        const { error: reportError } = await supabase
          .from('employee_reports')
          .insert({
            employee_user_id: profile.id,
            work_order_id: finalWorkOrderId || null,
            project_id: projectId || null,
            report_date: new Date().toISOString().split('T')[0],
            clock_in_time: new Date().toISOString(),
            hourly_rate_snapshot: userProfile.hourly_cost_rate,
            hours_worked: 0,
            work_performed: '',
            ...locationData
          });

        if (reportError) {
          throw reportError;
        }
        
        return locationData;
      } finally {
        setIsClockingIn(false);
      }
    },
    onMutate: () => {
      // Optimistic update: immediately show loading state
      setIsClockingIn(true);
    },
    onSuccess: (locationData) => {
      queryClient.invalidateQueries({ queryKey: ['employee-clock-state'] });
      const locationText = locationData?.location_address ? 
        ` at ${locationData.location_address}` : '';
      toast({
        title: 'Clocked In',
        description: `Successfully clocked in to your work assignment${locationText}.`,
      });
    },
    onError: (error) => {
      setIsClockingIn(false);
      toast({
        title: 'Clock In Failed',
        description: error instanceof Error ? error.message : 'Failed to clock in',
        variant: 'destructive',
      });
    },
  });

  // Clock out mutation with optimistic updates
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

  // Force clock out function for edge cases
  const forceClockOut = () => {
    clockOut.mutate(true);
  };

  return {
    clockIn,
    clockOut,
    forceClockOut,
    isClockingIn,
    isClockingOut
  };
}