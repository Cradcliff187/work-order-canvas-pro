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
}

export const useClockState = () => {
  const { profile } = useAuth();
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { getCurrentLocation, getAddressFromLocation } = useLocation();

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
        .select('id, clock_in_time, clock_out_time, work_order_id, project_id, location_lat, location_lng, location_address')
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
        project_id: data.project_id,
        location_lat: data.location_lat,
        location_lng: data.location_lng,
        location_address: data.location_address
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
    projectId: clockData?.project_id || null,
    locationLat: clockData?.location_lat || null,
    locationLng: clockData?.location_lng || null,
    locationAddress: clockData?.location_address || null
  };

  // Clock in mutation
  const clockIn = useMutation({
    mutationFn: async ({ workOrderId, projectId }: { workOrderId?: string; projectId?: string } = {}) => {
      if (!profile?.id) throw new Error('No profile found');

      // Capture GPS location
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
        }
      } catch (error) {
        console.warn('Failed to capture location for clock in:', error);
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

        if (assignmentError) throw assignmentError;
        if (!assignment) throw new Error('No work order assignments found. Please contact your supervisor.');
        finalWorkOrderId = assignment.work_order_id;
      }

      // Get user's hourly cost rate
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('hourly_cost_rate')
        .eq('id', profile.id)
        .single();

      if (profileError) throw profileError;
      if (!userProfile?.hourly_cost_rate) throw new Error('Hourly rate not set. Please contact administration.');

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

      if (reportError) throw reportError;
      
      return locationData;
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

      // Capture GPS location for clock out
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
        }
      } catch (error) {
        console.warn('Failed to capture location for clock out:', error);
      }

      const clockOutTime = new Date();
      const clockInTime = new Date(clockData.clock_in_time);
      const hoursWorked = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);

      // Update employee report with clock out time, hours worked, and location
      const { error: updateError } = await supabase
        .from('employee_reports')
        .update({
          clock_out_time: clockOutTime.toISOString(),
          hours_worked: Math.round(hoursWorked * 100) / 100, // Round to 2 decimal places
          ...locationData
        })
        .eq('id', clockData.id);

      if (updateError) throw updateError;
      
      return { locationData, hoursWorked };
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