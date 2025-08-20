import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

export const useTodayHours = () => {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['today-hours', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return 0;
      
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('employee_reports')
        .select('hours_worked')
        .eq('employee_user_id', profile.id)
        .eq('report_date', today);
      
      if (error) throw error;
      
      // Sum all hours worked today (handle multiple clock-in/out sessions)
      const totalHours = data?.reduce((sum, report) => sum + (report.hours_worked || 0), 0) || 0;
      return totalHours;
    },
    enabled: !!profile?.id,
    refetchInterval: 30000,
  });
};