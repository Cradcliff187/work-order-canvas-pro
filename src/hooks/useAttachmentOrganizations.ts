import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useAttachmentOrganizations(uploaderIds: string[]) {
  return useQuery({
    queryKey: ['attachment-organizations', uploaderIds],
    queryFn: async () => {
      if (!uploaderIds.length) return {};

      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          user_id,
          organizations!organization_id(
            name,
            organization_type
          )
        `)
        .in('user_id', uploaderIds);

      if (error) throw error;

      // Create a map of user_id -> organization data
      const organizationMap: Record<string, { name: string; organization_type: string } | null> = {};
      
      uploaderIds.forEach(id => {
        const memberData = data?.find(item => item.user_id === id);
        organizationMap[id] = memberData?.organizations || null;
      });

      return organizationMap;
    },
    enabled: uploaderIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}