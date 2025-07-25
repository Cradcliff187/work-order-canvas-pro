import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { WorkOrderReport, ReportFilters, PaginationState, SortingState } from '@/types/reports';

export function useAdminReports(
  pagination: PaginationState,
  sorting: SortingState[],
  filters: ReportFilters
) {
  return useQuery({
    queryKey: ['admin-reports', pagination, sorting, filters],
    queryFn: async () => {
      let query = supabase
        .from('work_order_reports')
        .select(`
          *,
          work_orders!work_order_id(
            work_order_number,
            title,
            store_location,
            street_address,
            city,
            state,
            zip_code,
            description,
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
          submitted_by:profiles!submitted_by_user_id(
            first_name,
            last_name,
            user_type
          )
        `, { count: 'exact' });

      // Apply filters
      if (filters.status?.length) {
        query = query.in('status', filters.status as Database['public']['Enums']['report_status'][]);
      }
      if (filters.subcontractor_id) {
        query = query.eq('subcontractor_user_id', filters.subcontractor_id);
      }
      if (filters.date_from) {
        query = query.gte('submitted_at', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('submitted_at', filters.date_to);
      }
      if (filters.search) {
        query = query.or(`work_performed.ilike.%${filters.search}%,notes.ilike.%${filters.search}%,invoice_number.ilike.%${filters.search}%`);
      }

      // Apply sorting
      if (sorting.length > 0) {
        const sort = sorting[0];
        query = query.order(sort.id, { ascending: !sort.desc });
      } else {
        query = query.order('submitted_at', { ascending: false });
      }

      // Apply pagination
      const from = pagination.pageIndex * pagination.pageSize;
      const to = from + pagination.pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        data: (data as WorkOrderReport[]) || [],
        totalCount: count || 0,
        pageCount: Math.ceil((count || 0) / pagination.pageSize)
      };
    },
  });
}