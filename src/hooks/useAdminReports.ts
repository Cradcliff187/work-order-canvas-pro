
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
      
      // Handle search term - multi-field search across work orders, locations, and subcontractors
      if (searchTerm) {
        const search = `%${searchTerm.trim()}%`;
        
        try {
          // Find matching work order IDs (by work order number or store location)
          const { data: matchingWorkOrders } = await supabase
            .from('work_orders')
            .select('id')
            .or(`work_order_number.ilike.${search},store_location.ilike.${search}`);
          
          // Find matching subcontractor organization IDs (by organization name)
          const { data: matchingSubcontractorOrgs } = await supabase
            .from('organizations')
            .select('id')
            .eq('organization_type', 'subcontractor')
            .ilike('name', search);
          
          const workOrderIds = matchingWorkOrders?.map(wo => wo.id) || [];
          const subcontractorOrgIds = matchingSubcontractorOrgs?.map(org => org.id) || [];
          
          // Build OR conditions for all search fields
          const searchConditions = [];
          
          // Content search (existing functionality)
          searchConditions.push(`work_performed.ilike.${search}`);
          searchConditions.push(`notes.ilike.${search}`);
          searchConditions.push(`materials_used.ilike.${search}`);
          
          // Work order search (if any matches found)
          if (workOrderIds.length > 0) {
            query = query.in('work_order_id', workOrderIds);
          } else if (subcontractorOrgIds.length > 0) {
            query = query.in('subcontractor_organization_id', subcontractorOrgIds);
          } else {
            // Only apply content search if no work order or subcontractor matches
            query = query.or(searchConditions.join(','));
          }
          
          // If we have work order matches, still allow content search as alternative
          if (workOrderIds.length > 0 || subcontractorOrgIds.length > 0) {
            const additionalConditions = [...searchConditions];
            if (workOrderIds.length > 0) {
              additionalConditions.push(`work_order_id.in.(${workOrderIds.join(',')})`);
            }
            if (subcontractorOrgIds.length > 0) {
              additionalConditions.push(`subcontractor_organization_id.in.(${subcontractorOrgIds.join(',')})`);
            }
            query = query.or(additionalConditions.join(','));
          }
        } catch (searchError) {
          console.error('Search error, falling back to content-only search:', searchError);
          // Fallback to original content search
          query = query.or(`work_performed.ilike.${search},notes.ilike.${search},materials_used.ilike.${search}`);
        }
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
