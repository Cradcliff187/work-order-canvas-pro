import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ReportLocation {
  value: string;
  label: string;
}

export function useReportLocations() {
  return useQuery({
    queryKey: ['report-locations'],
    queryFn: async (): Promise<ReportLocation[]> => {
      // Get distinct locations from work orders that have reports
      const { data, error } = await supabase
        .from('work_order_reports')
        .select(`
          work_order_id,
          work_orders!inner(
            store_location,
            partner_location_number
          )
        `);

      if (error) throw error;

      // Extract unique location values
      const locationSet = new Set<string>();
      
      data?.forEach((report) => {
        const workOrder = report.work_orders;
        if (workOrder?.store_location) {
          locationSet.add(workOrder.store_location);
        }
        if (workOrder?.partner_location_number) {
          locationSet.add(workOrder.partner_location_number);
        }
      });

      // Convert to sorted array of options
      return Array.from(locationSet)
        .filter(Boolean)
        .sort()
        .map(location => ({
          value: location,
          label: location
        }));
    },
  });
}