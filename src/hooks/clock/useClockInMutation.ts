import { useMutation, useQueryClient, UseMutationResult } from '@tanstack/react-query';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getCurrentLocationCached, getAddressFromLocationCached, formatLocationForClockIn } from '@/services/locationService';
import type { ClockInParams, ClockInResult } from './types';

const CLOCK_OPERATION_KEY = 'clock-operation-in-progress';

interface ClockInMutationReturn {
  clockIn: UseMutationResult<ClockInResult | null, Error, ClockInParams>;
  isClockingIn: boolean;
}

export function useClockInMutation(): ClockInMutationReturn {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isClockingIn, setIsClockingIn] = useState(false);

  const clockIn = useMutation({
    mutationFn: async ({ workOrderId, projectId }: ClockInParams = {}): Promise<ClockInResult | null> => {
      // Check if operation already in progress
      if (sessionStorage.getItem(CLOCK_OPERATION_KEY) === 'true') {
        console.warn('[Clock In] Operation already in progress');
        throw new Error('Clock operation in progress. Please wait.');
      }

      // Set lock
      sessionStorage.setItem(CLOCK_OPERATION_KEY, 'true');

      console.log('=== CLOCK IN DIAGNOSTIC ===');
      console.log('Auth Profile:', { 
        id: profile?.id, 
        email: profile?.email,
        has_profile: !!profile 
      });
      
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

        console.log('Database Query Result:', {
          query_success: !profileError,
          profile_found: !!userProfile,
          hourly_rate: userProfile?.hourly_cost_rate,
          full_profile: userProfile
        });

        if (profileError) {
          throw profileError;
        }
        if (!userProfile?.hourly_cost_rate) {
          throw new Error('Hourly rate not set. Please contact administration.');
        }

        // Check for existing active sessions and close them first
        console.log('[Clock In] Checking for existing active sessions...');
        const { data: existingSessions, error: checkError } = await supabase
          .from('employee_reports')
          .select('id, clock_in_time')
          .eq('employee_user_id', profile.id)
          .not('clock_in_time', 'is', null)
          .is('clock_out_time', null);

        if (checkError) {
          console.error('[Clock In] Error checking existing sessions:', checkError);
          throw checkError;
        }

        if (existingSessions && existingSessions.length > 0) {
          console.log('[Clock In] Closing existing sessions:', existingSessions.length);
          
          // Close all sessions properly with Promise.all
          const now = new Date();
          const closePromises = existingSessions.map(session => {
            const clockInTime = new Date(session.clock_in_time);
            const hoursWorked = (now.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);
            
            return supabase
              .from('employee_reports')
              .update({
                clock_out_time: now.toISOString(),
                hours_worked: Math.round(hoursWorked * 100) / 100
              })
              .eq('id', session.id);
          });
          
          const results = await Promise.all(closePromises);
          const failed = results.filter(r => r.error);
          
          if (failed.length > 0) {
            console.error('[Clock In] Failed to close some sessions:', failed);
            throw new Error('Failed to close existing sessions. Please try again.');
          }
          
          // Add delay for DB consistency
          await new Promise(resolve => setTimeout(resolve, 500));
          
          console.log('[Clock In] Successfully closed all existing sessions');
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
        // Clear lock
        sessionStorage.removeItem(CLOCK_OPERATION_KEY);
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

  return {
    clockIn,
    isClockingIn
  };
}