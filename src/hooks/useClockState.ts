import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from '@/hooks/useLocation';
import type { Database } from '@/integrations/supabase/types';

type EmployeeReport = Database['public']['Tables']['employee_reports']['Row'];

interface ClockStateData {
  id: string;
  clock_in_time: string;
  work_order_id: string;
  project_id?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  location_address?: string | null;
  hourly_rate_snapshot?: number | null;
}

interface LocationData {
  location_lat: number;
  location_lng: number;
  location_address: string;
}

interface ClockOutLocationData {
  clock_out_location_lat: number;
  clock_out_location_lng: number;
  clock_out_location_address: string;
}

interface ClockOutResult {
  locationData: ClockOutLocationData | {};
  hoursWorked: number;
}

export interface ClockState {
  isClocked: boolean;
  activeReportId: string | null;
  clockInTime: Date | null;
  elapsedTime: number; // in milliseconds
  workOrderId: string | null;
  projectId?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  locationAddress?: string | null;
  hourlyRate?: number | null;
}

export const useClockState = () => {
  const { profile } = useAuth();
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [isClockingIn, setIsClockingIn] = useState(false);
  const [isClockingOut, setIsClockingOut] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { getCurrentLocation, getAddressFromLocation } = useLocation();

  console.log('🔄 useClockState: Component initialized with profile ID:', profile?.id);

  const {
    data: clockData,
    isLoading,
    isError,
    error: queryError,
    refetch
  } = useQuery({
    queryKey: ['employee-clock-state', profile?.id],
    queryFn: async (): Promise<ClockStateData | null> => {
      console.log('📊 useClockState: Fetching clock state for profile:', profile?.id);
      
      if (!profile?.id) {
        console.log('❌ useClockState: No profile ID available');
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
        console.error('❌ useClockState: Query error:', error);
        throw error;
      }
      
      if (!data?.clock_in_time) {
        console.log('✅ useClockState: No active clock-in found');
        return null;
      }
      
      const result = {
        id: data.id,
        clock_in_time: data.clock_in_time,
        work_order_id: data.work_order_id,
        project_id: data.project_id,
        location_lat: data.location_lat,
        location_lng: data.location_lng,
        location_address: data.location_address,
        hourly_rate_snapshot: data.hourly_rate_snapshot
      };
      
      console.log('✅ useClockState: Active clock-in found:', result);
      return result;
    },
    enabled: !!profile?.id,
    refetchInterval: 30000, // 30 seconds
    staleTime: 15000, // 15 seconds
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Track derived state values
  const isClocked = !!clockData;
  const activeReportId = clockData?.id || null;

  console.log('📈 useClockState: Current state:', {
    isClocked,
    activeReportId,
    isLoading,
    isError: !!queryError,
    isClockingIn,
    isClockingOut,
    clockInTime: clockData?.clock_in_time,
    elapsedTime
  });

  // Calculate elapsed time every second when clocked in
  useEffect(() => {
    if (!clockData?.clock_in_time) {
      console.log('⏹️ useClockState: No active clock-in, resetting elapsed time');
      setElapsedTime(0);
      return;
    }

    console.log('⏱️ useClockState: Starting elapsed time calculation for clock-in:', clockData.clock_in_time);
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
    isClocked,
    activeReportId,
    clockInTime: clockData?.clock_in_time ? new Date(clockData.clock_in_time) : null,
    elapsedTime,
    workOrderId: clockData?.work_order_id || null,
    projectId: clockData?.project_id || null,
    locationLat: clockData?.location_lat || null,
    locationLng: clockData?.location_lng || null,
    locationAddress: clockData?.location_address || null,
    hourlyRate: clockData?.hourly_rate_snapshot || null
  };

  // Clock in mutation
  const clockIn = useMutation({
    mutationFn: async ({ workOrderId, projectId }: { workOrderId?: string; projectId?: string } = {}) => {
      console.log('🔵 useClockState: Starting clock in process', { workOrderId, projectId, profileId: profile?.id });
      
      if (!profile?.id) {
        console.error('❌ useClockState: No profile found for clock in');
        throw new Error('No profile found');
      }

      setIsClockingIn(true);

      try {
        // Capture GPS location
        console.log('📍 useClockState: Capturing GPS location for clock in');
        let locationData = null;
        try {
          const location = await getCurrentLocation();
          if (location) {
            const address = await getAddressFromLocation(location);
            locationData = {
              location_lat: location.latitude,
              location_lng: location.longitude,
              location_address: address?.street ? 
                `${address.street}, ${address.city}, ${address.state} ${address.zipCode}` : 
                'Location captured'
            };
            console.log('✅ useClockState: Location captured:', locationData);
          }
        } catch (error) {
          console.warn('⚠️ useClockState: Failed to capture location for clock in:', error);
        }

        let finalWorkOrderId = workOrderId;
        
        // If no work order or project specified, get the most recent work order assignment
        if (!workOrderId && !projectId) {
          console.log('🔍 useClockState: Finding work order assignment');
          const { data: assignment, error: assignmentError } = await supabase
            .from('work_order_assignments')
            .select('work_order_id')
            .eq('assigned_to', profile.id)
            .order('assigned_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (assignmentError) {
            console.error('❌ useClockState: Assignment query error:', assignmentError);
            throw assignmentError;
          }
          if (!assignment) {
            console.error('❌ useClockState: No assignments found');
            throw new Error('No work order assignments found. Please contact your supervisor.');
          }
          finalWorkOrderId = assignment.work_order_id;
          console.log('✅ useClockState: Found work order assignment:', finalWorkOrderId);
        }

        // Get user's hourly cost rate
        console.log('💰 useClockState: Getting hourly cost rate');
        const { data: userProfile, error: profileError } = await supabase
          .from('profiles')
          .select('hourly_cost_rate')
          .eq('id', profile.id)
          .single();

        if (profileError) {
          console.error('❌ useClockState: Profile query error:', profileError);
          throw profileError;
        }
        if (!userProfile?.hourly_cost_rate) {
          console.error('❌ useClockState: No hourly rate set');
          throw new Error('Hourly rate not set. Please contact administration.');
        }

        console.log('💰 useClockState: Hourly rate found:', userProfile.hourly_cost_rate);

        // Create employee report with clock in time and location
        console.log('💾 useClockState: Creating employee report');
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
          console.error('❌ useClockState: Report insert error:', reportError);
          throw reportError;
        }
        
        console.log('✅ useClockState: Clock in successful');
        return locationData;
      } finally {
        setIsClockingIn(false);
      }
    },
    onSuccess: (locationData) => {
      console.log('🎉 useClockState: Clock in success callback');
      queryClient.invalidateQueries({ queryKey: ['employee-clock-state'] });
      const locationText = locationData?.location_address ? 
        ` at ${locationData.location_address}` : '';
      toast({
        title: 'Clocked In',
        description: `Successfully clocked in to your work assignment${locationText}.`,
      });
    },
    onError: (error) => {
      console.error('❌ useClockState: Clock in error callback:', error);
      setIsClockingIn(false);
      toast({
        title: 'Clock In Failed',
        description: error instanceof Error ? error.message : 'Failed to clock in',
        variant: 'destructive',
      });
    },
  });

  // Clock out mutation
  const clockOut = useMutation({
    mutationFn: async (forceClockOut: boolean = false) => {
      console.log('🔴 useClockState: Starting clock out process', { 
        clockDataId: clockData?.id, 
        clockInTime: clockData?.clock_in_time,
        profileId: profile?.id,
        forceClockOut 
      });

      // Enhanced validation
      if (!profile?.id) {
        console.error('❌ useClockState: No profile found for clock out');
        throw new Error('No profile found. Please refresh and try again.');
      }
      
      // Verify authentication before proceeding
      console.log('🔐 useClockState: Verifying authentication');
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('❌ useClockState: Authentication error:', authError);
        throw new Error('Authentication expired. Please refresh and log in again.');
      }

      console.log('✅ useClockState: Authentication verified:', { userId: user.id, profileId: profile.id });
      setIsClockingOut(true);

      try {
        // Capture GPS location for clock out
        console.log('📍 useClockState: Capturing GPS location for clock out');
        let locationData = {};
        try {
          const location = await getCurrentLocation();
          if (location) {
            const address = await getAddressFromLocation(location);
            locationData = {
              clock_out_location_lat: location.latitude,
              clock_out_location_lng: location.longitude,
              clock_out_location_address: address?.street ? 
                `${address.street}, ${address.city}, ${address.state} ${address.zipCode}` : 
                'Location captured'
            };
            console.log('✅ useClockState: Clock out location captured:', locationData);
          }
        } catch (error) {
          console.warn('⚠️ useClockState: Failed to capture location for clock out:', error);
        }
        
        if (!clockData?.id) {
          console.log('⚠️ useClockState: No active clock data found');
          if (forceClockOut) {
            console.log('🔍 useClockState: Force clock out - searching for unclosed reports');
            // Try to find any unclosed reports for this user
            const { data: unclosedReports, error: searchError } = await supabase
              .from('employee_reports')
              .select('id, clock_in_time, work_order_id')
              .eq('employee_user_id', profile.id)
              .not('clock_in_time', 'is', null)
              .is('clock_out_time', null)
              .order('clock_in_time', { ascending: false })
              .limit(1);

            if (searchError) {
              console.error('❌ useClockState: Search error:', searchError);
              throw new Error(`Search error: ${searchError.message}`);
            }
            if (!unclosedReports?.length) {
              console.error('❌ useClockState: No unclosed reports found');
              throw new Error('No active clock sessions found');
            }
            
            // Use the found record by creating a new ClockStateData object
            const foundClockData: ClockStateData = {
              id: unclosedReports[0].id,
              clock_in_time: unclosedReports[0].clock_in_time,
              work_order_id: unclosedReports[0].work_order_id
            };
            
            console.log('✅ useClockState: Found unclosed report for force clock out:', foundClockData);
            // Use the found data for this operation
            return await performClockOut(foundClockData, locationData, profile.id);
          } else {
            console.error('❌ useClockState: No active clock session and not force clock out');
            throw new Error('No active clock session found. Try refreshing the page.');
          }
        }
        
        console.log('⚙️ useClockState: Performing normal clock out');
        return await performClockOut(clockData, locationData, profile.id);
      } finally {
        setIsClockingOut(false);
      }
    },

    // Helper function to perform the actual clock out
    onSuccess: (result) => {
      console.log('🎉 useClockState: Clock out success callback:', result);
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
      console.error('❌ useClockState: Clock out error callback:', error);
      setIsClockingOut(false);
      const errorMessage = error instanceof Error ? error.message : 'Failed to clock out';
      toast({
        title: 'Clock Out Failed', 
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  // Helper function to perform clock out operation
  const performClockOut = async (data: ClockStateData, locationData: any, employeeUserId: string) => {
    const clockOutTime = new Date();
    const clockInTime = new Date(data.clock_in_time);
    const hoursWorked = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);

    console.log('Attempting clock out update:', {
      reportId: data.id,
      hoursWorked: Math.round(hoursWorked * 100) / 100,
      clockOutTime: clockOutTime.toISOString()
    });

    // Update employee report with clock out time, hours worked, and location
    const { error: updateError } = await supabase
      .from('employee_reports')
      .update({
        clock_out_time: clockOutTime.toISOString(),
        hours_worked: Math.round(hoursWorked * 100) / 100, // Round to 2 decimal places
        ...locationData
      })
      .eq('id', data.id)
      .eq('employee_user_id', employeeUserId); // Additional safety check

    if (updateError) {
      console.error('Clock out update failed:', updateError);
      throw new Error(`Update failed: ${updateError.message}. Please try again or contact support.`);
    }
    
    console.log('Clock out successful');
    return { locationData, hoursWorked };
  };

  // Force clock out function for edge cases
  const forceClockOut = () => {
    console.log('🚨 useClockState: Force clock out initiated');
    clockOut.mutate(true);
  };

  // Combined loading states
  const isAnyLoading = isLoading || isClockingIn || isClockingOut;
  const hasError = isError || !!queryError;

  console.log('📤 useClockState: Returning final state:', {
    isClocked,
    activeReportId,
    isAnyLoading,
    hasError,
    isClockingIn,
    isClockingOut,
    elapsedTime
  });

  return {
    ...clockState,
    isLoading: isAnyLoading,
    isError: hasError,
    refetch,
    clockIn,
    clockOut,
    forceClockOut,
    isClockingIn,
    isClockingOut,
  };
};