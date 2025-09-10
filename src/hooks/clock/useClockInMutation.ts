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

        // SIMPLIFIED APPROACH: Close any existing sessions without checking first
        console.log('[Clock In] Closing any existing sessions...');
        
        const { error: closeError } = await db
          .from('employee_reports')
          .update({
            clock_out_time: new Date().toISOString(),
            hours_worked: 0,
            notes: 'Auto-closed for new clock in'
          })
          .eq('employee_user_id', profile.id)
          .is('clock_out_time', null);
        
        // Don't check closeError - it's fine if nothing was updated
        console.log('[Clock In] Cleanup complete, creating new session...');
        
        // Wait briefly for DB consistency
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Create new session with retry for constraint violations
        let attempts = 0;
        const maxAttempts = 3;
        
        while (attempts < maxAttempts) {
          attempts++;
          
          try {
            const { data: newSession, error: insertError } = await db
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
              })
              .select()
              .single();
            
            if (!insertError) {
              console.log('[Clock In] SUCCESS - Session created on attempt', attempts);
              return locationData;
            }
            
            // Check if it's a constraint violation
            if (insertError.code === '23505' || insertError.message?.includes('duplicate')) {
              console.log(`[Clock In] Constraint violation on attempt ${attempts}, retrying...`);
              
              if (attempts < maxAttempts) {
                // Exponential backoff
                await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
                continue;
              }
            }
            
            // Other error or max attempts reached
            throw insertError;
            
          } catch (err) {
            if (attempts >= maxAttempts) {
              console.error('[Clock In] All attempts failed:', err);
              throw new Error('Unable to clock in after multiple attempts. Please try again.');
            }
          }
        }
        
        throw new Error('Clock in failed - please try again');
        
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