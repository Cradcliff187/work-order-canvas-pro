import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MentionCandidate {
  id: string;
  fullName: string;
  orgName: string | null;
  avatarUrl?: string | null;
  email?: string | null;
}

export function useMentionCandidates(workOrderId: string, isInternal: boolean) {
  return useQuery<MentionCandidate[]>({
    queryKey: ['mention-candidates', workOrderId, isInternal],
    enabled: !!workOrderId,
    queryFn: async () => {
      if (!workOrderId) return [];

      // Get work order org context
      const { data: wo, error: woErr } = await supabase
        .from('work_orders')
        .select('organization_id, assigned_organization_id')
        .eq('id', workOrderId)
        .single();
      if (woErr || !wo) return [];

      const userIds = new Set<string>();
      const userOrgMap = new Map<string, string | null>();

      // Always include internal org members
      const { data: internalMembers } = await supabase
        .from('organization_members')
        .select(`
          user_id,
          organization:organizations!organization_id(
            name,
            organization_type
          )
        `)
        .eq('organization.organization_type', 'internal');

      internalMembers?.forEach((m: any) => {
        if (m.user_id) {
          userIds.add(m.user_id);
          userOrgMap.set(m.user_id, m.organization?.name ?? 'Internal Team');
        }
      });

      if (isInternal) {
        // Add assigned subcontractor members
        if (wo.assigned_organization_id) {
          const { data: subMembers } = await supabase
            .from('organization_members')
            .select(`user_id, organization:organizations!organization_id(name)`) 
            .eq('organization_id', wo.assigned_organization_id);
          subMembers?.forEach((m: any) => {
            if (m.user_id) {
              userIds.add(m.user_id);
              userOrgMap.set(m.user_id, m.organization?.name ?? null);
            }
          });
        }
      } else {
        // Public: add partner org members for this work order's organization
        if (wo.organization_id) {
          const { data: partnerMembers } = await supabase
            .from('organization_members')
            .select(`user_id, organization:organizations!organization_id(name)`) 
            .eq('organization_id', wo.organization_id);
          partnerMembers?.forEach((m: any) => {
            if (m.user_id) {
              userIds.add(m.user_id);
              userOrgMap.set(m.user_id, m.organization?.name ?? null);
            }
          });
        }
      }

      if (userIds.size === 0) return [];

      // Fetch profiles in a single query
      const ids = Array.from(userIds);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, avatar_url')
        .in('id', ids);

      const candidates: MentionCandidate[] = (profiles || []).map((p: any) => ({
        id: p.id,
        fullName: `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email,
        orgName: userOrgMap.get(p.id) ?? null,
        avatarUrl: p.avatar_url ?? null,
        email: p.email ?? null,
      }));

      // Sort by name
      candidates.sort((a, b) => a.fullName.localeCompare(b.fullName));
      return candidates;
    },
  });
}
