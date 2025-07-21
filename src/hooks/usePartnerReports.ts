
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type WorkOrderReport = Database['public']['Tables']['work_order_reports']['Row'] & {
  work_orders: {
    work_order_number: string | null;
    title: string;
    organizations: { name: string } | null;
    trades: { name: string } | null;
    store_location: string | null;
    street_address: string | null;
    city: string | null;
    state: string | null;
    zip_code: string | null;
    description: string | null;
    partner_location_number: string | null;
  } | null;
  subcontractor: {
    first_name: string;
    last_name: string;
  } | null;
  reviewed_by: {
    first_name: string;
    last_name: string;
  } | null;
};

interface ReportFilters {
  status?: string[];
  date_from?: string;
  date_to?: string;
  search?: string;
  location_filter?: string;
}

interface PaginationState {
  pageIndex: number;
  pageSize: number;
}

interface SortingState {
  id: string;
  desc: boolean;
}

export function usePartnerReports(
  pagination: PaginationState,
  sorting: SortingState[],
  filters: ReportFilters
) {
  return useQuery({
    queryKey: ['partner-reports', pagination, sorting, filters],
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
            partner_location_number,
            organizations!organization_id(name),
            trades!trade_id(name)
          ),
          subcontractor:profiles!subcontractor_user_id(
            first_name,
            last_name
          ),
          reviewed_by:profiles!reviewed_by_user_id(
            first_name,
            last_name
          )
        `, { count: 'exact' });

      // Filter to only include reports for work orders in partner's organizations
      query = query.not('work_orders.organization_id', 'is', null);

      // Apply location filter
      if (filters.location_filter && filters.location_filter !== 'all') {
        if (filters.location_filter === 'manual') {
          // Filter for work orders without partner location numbers (manual locations)
          query = query.is('work_orders.partner_location_number', null);
        } else {
          // Filter for specific partner location number
          query = query.eq('work_orders.partner_location_number', filters.location_filter);
        }
      }

      // Apply additional filters
      if (filters.status?.length) {
        query = query.in('status', filters.status as Database['public']['Enums']['report_status'][]);
      }
      if (filters.date_from) {
        query = query.gte('submitted_at', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('submitted_at', filters.date_to);
      }
      if (filters.search) {
        query = query.or(`work_performed.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`);
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

export function usePartnerReportDetail(reportId: string) {
  return useQuery({
    queryKey: ['partner-report-detail', reportId],
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
            last_name
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
