import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { WorkOrderReport } from '@/types/reports';

export function useAdminReportDetail(reportId: string) {
  return useQuery({
    queryKey: ['admin-report-detail', reportId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_order_reports')
        .select(`
          *,
          work_orders!work_order_id(
            *,
            organizations!organization_id(name),
            trades!trade_id(name)
          ),
          subcontractor:profiles!subcontractor_user_id(
            first_name,
            last_name,
            email,
            phone
          ),
          reviewed_by:profiles!reviewed_by_user_id(
            first_name,
            last_name
          ),
          work_order_attachments!work_order_report_id(
            id,
            file_name,
            file_url,
            file_type,
            uploaded_at
          )
        `)
        .eq('id', reportId)
        .single();

      if (error) throw error;
      return data as WorkOrderReport & {
        work_order_attachments: Array<{
          id: string;
          file_name: string;
          file_url: string;
          file_type: string;
          uploaded_at: string;
        }>;
      };
    },
    enabled: !!reportId,
  });
}