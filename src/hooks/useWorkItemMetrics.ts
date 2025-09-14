import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { parseDateOnly } from '@/lib/utils/date';

export interface WorkItemMetrics {
  lastWorked?: string;  // "2 days ago"
  location?: string;    // "Cincinnati, KY"
  hoursLogged?: number; // 24.5
  totalReports?: number; // 3
}

export function useWorkItemMetrics(workItemId: string, workItemType: 'work_order' | 'project') {
  return useQuery({
    queryKey: ['work-item-metrics', workItemId, workItemType],
    queryFn: async (): Promise<WorkItemMetrics> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return {};

      // Get current user's profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return {};

      // Query employee reports for this work item
      const query = supabase
        .from('employee_reports')
        .select(`
          report_date,
          hours_worked,
          location_address,
          created_at
        `)
        .eq('employee_user_id', profile.id)
        .order('report_date', { ascending: false });

      // Filter by work item type
      if (workItemType === 'work_order') {
        query.eq('work_order_id', workItemId);
      } else {
        query.eq('project_id', workItemId);
      }

      const { data: reports, error } = await query;

      if (error || !reports?.length) {
        return {};
      }

      // Calculate metrics
      const totalHours = reports.reduce((sum, report) => sum + (Number(report.hours_worked) || 0), 0);
      const lastReport = reports[0];
      const lastWorked = lastReport ? formatDistanceToNow(parseDateOnly(lastReport.report_date), { addSuffix: true }) : undefined;
      
      // Extract location (get most recent non-null location)
      const locationReport = reports.find(r => r.location_address);
      const location = locationReport?.location_address ? 
        locationReport.location_address.split(',').slice(0, 2).join(', ').trim()
        : undefined;

      return {
        lastWorked,
        location,
        hoursLogged: totalHours > 0 ? totalHours : undefined,
        totalReports: reports.length
      };
    },
    enabled: !!workItemId && !!workItemType,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}