import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface LocationHistoryItem {
  store_location: string;
  partner_location_number: string | null;
  usage_count: number;
}

export function useLocationHistory(organizationId?: string) {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['location-history', organizationId || profile?.id],
    queryFn: async () => {
      let query = supabase
        .from('work_orders')
        .select('store_location, partner_location_number, organization_id');

      // If organization ID is provided, filter by it
      // Otherwise, for partners, filter by their organizations
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      } else if (profile?.user_type === 'partner') {
        const { data: userOrgs } = await supabase
          .from('user_organizations')
          .select('organization_id')
          .eq('user_id', profile.id);
        
        if (userOrgs && userOrgs.length > 0) {
          const orgIds = userOrgs.map(org => org.organization_id);
          query = query.in('organization_id', orgIds);
        }
      }

      const { data, error } = await query
        .not('store_location', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by location and count usage
      const locationMap = new Map<string, LocationHistoryItem>();
      
      data?.forEach(order => {
        if (order.store_location) {
          const key = `${order.store_location}-${order.partner_location_number || ''}`;
          const existing = locationMap.get(key);
          
          if (existing) {
            existing.usage_count++;
          } else {
            locationMap.set(key, {
              store_location: order.store_location,
              partner_location_number: order.partner_location_number,
              usage_count: 1
            });
          }
        }
      });

      // Convert to array and sort by usage count
      return Array.from(locationMap.values())
        .sort((a, b) => b.usage_count - a.usage_count)
        .slice(0, 50); // Limit to 50 most used locations
    },
    enabled: !!profile,
  });
}
