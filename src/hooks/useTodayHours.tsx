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
        .eq('report_date', today)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error) throw error;
      
      return data && data.length > 0 ? data[0].hours_worked : 0;
    },
    enabled: !!profile?.id,
    refetchInterval: 30000,
  });
};