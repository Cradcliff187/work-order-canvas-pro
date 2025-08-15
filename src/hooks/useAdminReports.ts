
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { WorkOrderReport, PaginationState, SortingState } from '@/types/reports';
import { ReportsFiltersValue } from '@/components/admin/reports/ReportsFilters';

export function useAdminReports(
  pagination: PaginationState,
  sorting: SortingState[],
  filters: ReportsFiltersValue,
  searchTerm?: string
) {
  return useQuery({
    queryKey: ['admin-reports', pagination, sorting, filters, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('work_order_reports')
        .select(`
          *,
          work_orders!work_order_id(
            work_order_number,
            title,
            store_location,
            partner_location_number,
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
            phone,
            organization_members(
              role,
              organizations(
                id,
                name,
                organization_type
              )
            )
          ),
          subcontractor_organization:organizations!subcontractor_organization_id(
            id,
            name,
            initials
          ),
          reviewed_by:profiles!reviewed_by_user_id(
            first_name,
            last_name
          ),
          submitted_by:profiles!submitted_by_user_id(
            first_name,
            last_name,
            email,
            organization_members(
              role,
              organizations(
                id,
                name,
                organization_type
              )
            )
          )
        `, { count: 'exact' });

      // Apply filters
      if (filters.status?.length) {
        query = query.in('status', filters.status as Database['public']['Enums']['report_status'][]);
      }
      
      if (filters.date_from) {
        query = query.gte('submitted_at', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('submitted_at', filters.date_to);
      }

      // Simple location filter
      if (filters.location) {
        try {
          const { data: matchingWorkOrders } = await supabase
            .from('work_orders')
            .select('id')
            .eq('store_location', filters.location);
          
          if (matchingWorkOrders && matchingWorkOrders.length > 0) {
            const workOrderIds = matchingWorkOrders.map(wo => wo.id);
            query = query.in('work_order_id', workOrderIds);
          } else {
            query = query.eq('id', '00000000-0000-0000-0000-000000000000');
          }
        } catch (error) {
          console.error('Error filtering by location:', error);
        }
      }
      
      // Note: Filtering by related table fields (submitted_by, work_order) 
      // requires more complex queries and should be implemented with proper PostgREST syntax
      // For now, these filters are disabled to prevent SQL syntax errors
      
      // Note: Search is now handled client-side after data fetching for better reliability

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

      const allData = (data as any[]) || [];

      // Apply client-side search filtering (similar to WorkOrderList.tsx pattern)
      const filteredData = searchTerm ? 
        allData.filter(report => {
          const searchLower = searchTerm.toLowerCase();
          return (
            report.work_orders?.work_order_number?.toLowerCase().includes(searchLower) ||
            report.work_orders?.store_location?.toLowerCase().includes(searchLower) ||
            report.subcontractor_organization?.name?.toLowerCase().includes(searchLower) ||
            report.work_performed?.toLowerCase().includes(searchLower) ||
            report.notes?.toLowerCase().includes(searchLower) ||
            report.materials_used?.toLowerCase().includes(searchLower)
          );
        }) : allData;

      return {
        data: filteredData,
        totalCount: count || 0,
        pageCount: Math.ceil((count || 0) / pagination.pageSize)
      };
    },
  });
}
