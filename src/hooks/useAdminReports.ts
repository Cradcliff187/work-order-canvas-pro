
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { WorkOrderReport, PaginationState, SortingState } from '@/types/reports';

interface ReportFilters {
  status?: string[];
  trade_id?: string[];
  partner_organization_ids?: string[];
  completed_by?: string[]; // 'internal' and/or subcontractor org IDs
  search?: string;
  date_from?: string;
  date_to?: string;
  location_filter?: string[];
}

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
      
      // Handle completed_by filter (maps to subcontractor filtering)
      if (filters.completed_by?.length) {
        const conditions: string[] = [];
        
        for (const completedBy of filters.completed_by) {
          if (completedBy === 'internal') {
            // Filter for internal users - reports where subcontractor is from internal org
            conditions.push('subcontractor.organization_members.organizations.organization_type.eq.internal');
          } else {
            // It's a subcontractor organization ID
            conditions.push(`subcontractor_organization_id.eq.${completedBy}`);
          }
        }
        
        if (conditions.length > 0) {
          query = query.or(conditions.join(','));
        }
      }
      
      // Handle partner organization filter by looking at work order organization
      if (filters.partner_organization_ids?.length) {
        query = query.in('work_orders.organization_id', filters.partner_organization_ids);
      }
      
      // Handle trade filter by looking at work order trade
      if (filters.trade_id?.length) {
        query = query.in('work_orders.trade_id', filters.trade_id);
      }
      
      // Handle location filter by looking at work order store_location and partner_location_number
      if (filters.location_filter?.length) {
        const locationConditions: string[] = [];
        for (const loc of filters.location_filter) {
          locationConditions.push(`work_orders.store_location.ilike.%${loc}%`);
          locationConditions.push(`work_orders.partner_location_number.ilike.%${loc}%`);
        }
        query = query.or(locationConditions.join(','));
      }
      
      if (filters.date_from) {
        query = query.gte('submitted_at', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('submitted_at', filters.date_to);
      }
      if (filters.search) {
        const searchTerm = `%${filters.search.trim()}%`;
        query = query.or(`work_performed.ilike.${searchTerm},notes.ilike.${searchTerm},invoice_number.ilike.${searchTerm}`);
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
        data: (data as any[]) || [], // Temporarily bypass type checking during migration
        totalCount: count || 0,
        pageCount: Math.ceil((count || 0) / pagination.pageSize)
      };
    },
  });
}
