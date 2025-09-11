import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RetroactiveTimeEntry } from '@/components/employee/retroactive/types';

export function useRetroactiveTimeEntry() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (entry: RetroactiveTimeEntry) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get user profile ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      // Calculate clock in/out times
      const dateStr = entry.date.toISOString().split('T')[0];
      const clockInTime = new Date(`${dateStr}T${entry.startTime}:00`);
      const clockOutTime = entry.endTime ? new Date(`${dateStr}T${entry.endTime}:00`) : null;
      
      // Calculate hours worked
      let hoursWorked = entry.hoursWorked || 0;
      if (clockOutTime && clockInTime) {
        hoursWorked = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);
      }

      // Get hourly rate from profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('hourly_billable_rate')
        .eq('id', profile.id)
        .single();

      const hourlyRate = profileData?.hourly_billable_rate || 0;

      // Insert employee report with retroactive flag
      const { data, error } = await supabase
        .from('employee_reports')
        .insert({
          employee_user_id: profile.id,
          work_order_id: entry.workOrderId || null,
          project_id: entry.projectId || null,
          clock_in_time: clockInTime.toISOString(),
          clock_out_time: clockOutTime?.toISOString() || null,
          hours_worked: hoursWorked,
          hourly_rate_snapshot: hourlyRate,
          total_labor_cost: hoursWorked * hourlyRate,
          report_date: entry.date.toISOString().split('T')[0],
          work_performed: 'Retroactive time entry',
          is_retroactive: true
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Time Entry Added",
        description: "Your retroactive time entry has been saved successfully.",
      });
      
      // Invalidate relevant queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['today-hours'] });
      queryClient.invalidateQueries({ queryKey: ['todays-work'] });
      queryClient.invalidateQueries({ queryKey: ['employee-dashboard'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add retroactive time entry. Please try again.",
        variant: "destructive",
      });
      console.error('Retroactive time entry error:', error);
    },
  });

  return {
    addRetroactiveTime: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}