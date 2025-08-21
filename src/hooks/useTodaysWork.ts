import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
export interface TodaysWorkItem {
  id: string;
  type: 'work_order' | 'project';
  number: string;
  title: string;
  hoursToday: number;
  lastWorkedAt: Date;
  sessionCount: number;
}

export function useTodaysWork() {

  return useQuery({
    queryKey: ['todays-work'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('employee_reports')
        .select(`
          work_order_id,
          project_id,
          clock_in_time,
          clock_out_time,
          hours_worked,
          work_orders!work_order_id(
            id,
            work_order_number,
            title
          ),
          projects!project_id(
            id,
            project_number,
            name
          )
        `)
        .eq('employee_user_id', user.id)
        .gte('clock_in_time', `${today}T00:00:00`)
        .lt('clock_in_time', `${today}T23:59:59`)
        .not('clock_out_time', 'is', null)
        .order('clock_out_time', { ascending: false });

      if (error) throw error;

      // Process today's work data
      const workMap = new Map<string, TodaysWorkItem>();
      
      for (const report of data || []) {
        let item: Partial<TodaysWorkItem> | null = null;
        let key: string = '';
        
        if (report.work_order_id && report.work_orders) {
          key = `work_order_${report.work_orders.id}`;
          item = {
            id: report.work_orders.id,
            type: 'work_order',
            number: report.work_orders.work_order_number,
            title: report.work_orders.title,
          };
        } else if (report.project_id && report.projects) {
          key = `project_${report.projects.id}`;
          item = {
            id: report.projects.id,
            type: 'project',
            number: report.projects.project_number,
            title: report.projects.name,
          };
        }

        if (item && key) {
          const existing = workMap.get(key);
          const hoursWorked = report.hours_worked || 0;
          const lastWorked = new Date(report.clock_out_time);
          
          if (existing) {
            existing.hoursToday += hoursWorked;
            existing.sessionCount += 1;
            if (lastWorked > existing.lastWorkedAt) {
              existing.lastWorkedAt = lastWorked;
            }
          } else {
            workMap.set(key, {
              ...item,
              hoursToday: hoursWorked,
              lastWorkedAt: lastWorked,
              sessionCount: 1,
            } as TodaysWorkItem);
          }
        }
      }

      return Array.from(workMap.values())
        .sort((a, b) => b.lastWorkedAt.getTime() - a.lastWorkedAt.getTime());
    },
    enabled: !!supabase.auth.getUser(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}