import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RecentClockItem {
  id: string;
  type: 'work_order' | 'project';
  number: string;
  title: string;
  lastClocked: string;
}

export function useRecentlyClocked() {
  return useQuery({
    queryKey: ['recently-clocked'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('employee_reports')
        .select(`
          work_order_id,
          project_id,
          clock_in_time,
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
        .not('clock_in_time', 'is', null)
        .order('clock_in_time', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Process and deduplicate recent items
      const recentItems: RecentClockItem[] = [];
      const seenIds = new Set<string>();

      for (const report of data || []) {
        let item: RecentClockItem | null = null;

        if (report.work_order_id && report.work_orders) {
          const id = `work_order_${report.work_orders.id}`;
          if (!seenIds.has(id)) {
            item = {
              id: report.work_orders.id,
              type: 'work_order',
              number: report.work_orders.work_order_number,
              title: report.work_orders.title,
              lastClocked: report.clock_in_time
            };
            seenIds.add(id);
          }
        } else if (report.project_id && report.projects) {
          const id = `project_${report.projects.id}`;
          if (!seenIds.has(id)) {
            item = {
              id: report.projects.id,
              type: 'project',
              number: report.projects.project_number,
              title: report.projects.name,
              lastClocked: report.clock_in_time
            };
            seenIds.add(id);
          }
        }

        if (item) {
          recentItems.push(item);
          if (recentItems.length >= 3) break;
        }
      }

      return recentItems;
    },
    enabled: !!supabase.auth.getUser(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}