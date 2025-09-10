import { useMutation, useQueryClient, UseMutationResult } from '@tanstack/react-query';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getCurrentLocationCached, getAddressFromLocationCached, formatLocationForClockIn } from '@/services/locationService';
import type { ClockInParams, ClockInResult } from './types';

// Type assertion to avoid deep type instantiation issues
const db = supabase as any;

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
      try {
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
          throw new Error('User profile not found. Please refresh and try again.');
        }

         // Determine work order ID
        let finalWorkOrderId = workOrderId;
        if (projectId && !workOrderId) {
          // For projects, check if there's an assignment - simplified to avoid TS complexity
          try {
            const result = await db
              .from('work_order_assignments')
              .select('work_order_id')
              .eq('assigned_to', profile.id)
              .eq('project_id', projectId);
            
            if (result.data && result.data.length > 0) {
              finalWorkOrderId = result.data[0].work_order_id;
            }
          } catch (err) {
            // Assignment lookup failed - continue without work order
            console.log('[Clock In] Assignment lookup failed:', err);
          }
        }

        // Get user's hourly rate
        const { data: userProfile, error: profileError } = await db
          .from('profiles')
          .select('hourly_cost_rate')
          .eq('id', profile.id)
          .single();

        if (profileError || !userProfile?.hourly_cost_rate) {
          throw new Error('Hourly rate not set. Please contact administration.');
        }

        console.log('[Clock In] Profile verified, hourly rate:', userProfile.hourly_cost_rate);

        // Capture location (optional, don't fail if unavailable)
        let locationData: ClockInResult = {};
        try {
          const location = await getCurrentLocationCached();
          if (location) {
            const address = await getAddressFromLocationCached(location);
            locationData = formatLocationForClockIn(location, address || 'Location captured');
          }
        } catch (err) {
          console.log('[Clock In] Location capture skipped:', err);
        }

        // Get today's date for the constraint check
        const todayDate = new Date().toISOString().split('T')[0];

        // FORCE close ALL sessions for today (the constraint is per day)
        console.log('[Clock In] Force closing all sessions for today:', todayDate);

        const { data: closedSessions, error: closeError } = await db
          .from('employee_reports')
          .update({
            clock_out_time: new Date().toISOString(),
            hours_worked: 0,
            notes: 'Auto-closed for new clock in'
          })
          .eq('employee_user_id', profile.id)
          .eq('report_date', todayDate)
          .is('clock_out_time', null)
          .select();

        if (closedSessions && closedSessions.length > 0) {
          console.log(`[Clock In] Closed ${closedSessions.length} existing sessions`);
        } else {
          console.log('[Clock In] No existing sessions to close');
        }

        // Wait for database to fully commit the updates
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Now try to create the new session (no retry needed if we properly closed old ones)
        console.log('[Clock In] Creating new session...');

        const { data: newSession, error: insertError } = await db
          .from('employee_reports')
          .insert({
            employee_user_id: profile.id,
            work_order_id: finalWorkOrderId || null,
            project_id: projectId || null,
            report_date: todayDate,
            clock_in_time: new Date().toISOString(),
            hourly_rate_snapshot: userProfile.hourly_cost_rate,
            hours_worked: 0,
            work_performed: '',
            ...locationData
          })
          .select()
          .single();

        if (insertError) {
          console.error('[Clock In] Failed to create session:', insertError);
          
          // If still getting constraint violation, there's a stuck session
          if (insertError.code === '23505') {
            throw new Error('There is an existing clock session for today that could not be closed. Please contact support to clear your time records.');
          }
          
          throw insertError;
        }

        console.log('[Clock In] SUCCESS - Session created');
        return locationData;
        
      } finally {
        setIsClockingIn(false);
        sessionStorage.removeItem(CLOCK_OPERATION_KEY);
      }
    },
    onMutate: () => {
      // Optimistic update: immediately show loading state
      setIsClockingIn(true);
    },
    onSuccess: async (locationData) => {
      // Wait for DB to be consistent
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Then invalidate queries
      queryClient.invalidateQueries({ queryKey: ['employee-clock-state'] });
      
      // Show success toast
      const locationText = locationData?.location_address ? 
        ` at ${locationData.location_address}` : '';
      toast({
        title: 'Clocked In',
        description: `Successfully clocked in${locationText}`,
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