import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WorkOrderLocationCounts {
  location_id: string;
  organization_id: string;
  location_number: string;
  received: number;
  assigned: number;
  in_progress: number;
  completed: number;
  cancelled: number;
  estimate_needed: number;
  estimate_pending_approval: number;
  total: number;
}

export function useWorkOrdersByLocation() {
  return useQuery({
    queryKey: ['work-orders-by-location'],
    queryFn: async (): Promise<Record<string, WorkOrderLocationCounts>> => {
      // First get all partner locations
      const { data: locations, error: locationsError } = await supabase
        .from('partner_locations')
        .select('id, organization_id, location_number, location_name');
        
      if (locationsError) throw locationsError;
      
      // Then get work order counts for each location
      const result: Record<string, WorkOrderLocationCounts> = {};
      
      if (locations) {
        // Initialize all locations with zero counts
        locations.forEach(location => {
          result[location.id] = {
            location_id: location.id,
            organization_id: location.organization_id,
            location_number: location.location_number,
            received: 0,
            assigned: 0,
            in_progress: 0,
            completed: 0,
            cancelled: 0,
            estimate_needed: 0,
            estimate_pending_approval: 0,
            total: 0,
          };
        });

        // Query work orders and count by status for each location
        const { data: workOrders, error: workOrdersError } = await supabase
          .from('work_orders')
          .select('status, organization_id, partner_location_number, store_location');
          
        if (workOrdersError) throw workOrdersError;
        
        if (workOrders) {
          // Count work orders for each location
          workOrders.forEach(workOrder => {
            // Find matching location by organization_id and location identifier
            const matchingLocation = locations.find(loc => 
              loc.organization_id === workOrder.organization_id && (
                loc.location_number === workOrder.partner_location_number ||
                loc.location_name === workOrder.store_location
              )
            );
            
            if (matchingLocation && result[matchingLocation.id]) {
              const counts = result[matchingLocation.id];
              counts.total++;
              
              switch (workOrder.status) {
                case 'received':
                  counts.received++;
                  break;
                case 'assigned':
                  counts.assigned++;
                  break;
                case 'in_progress':
                  counts.in_progress++;
                  break;
                case 'completed':
                  counts.completed++;
                  break;
                case 'cancelled':
                  counts.cancelled++;
                  break;
                case 'estimate_needed':
                  counts.estimate_needed++;
                  break;
                case 'estimate_pending_approval':
                  counts.estimate_pending_approval++;
                  break;
              }
            }
          });
        }
      }
      
      return result;
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}