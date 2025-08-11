
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DmCandidate {
  id: string;
  full_name: string;
  org_name: string | null;
  email?: string | null;
  avatar_url?: string | null;
}

export interface ListDmCandidatesOptions {
  search?: string;
  work_order_id?: string;
  limit?: number;
  // Additional filters can be passed and forwarded to the RPC
  [key: string]: any;
}

/**
 * Phase B5 – RPC wiring:
 * Lists candidates you can DM using the list_dm_candidates RPC.
 */
export function useListDmCandidates(options: ListDmCandidatesOptions = {}) {
  return useQuery({
    queryKey: ['dm-candidates', options],
    queryFn: async (): Promise<DmCandidate[]> => {
      const payload = {
        search: options.search ?? null,
        work_order_id: options.work_order_id ?? null,
        limit: options.limit ?? 50,
      };

      const { data, error } = await supabase.rpc('list_dm_candidates', payload as any);
      if (error) {
        console.error('[useListDmCandidates] RPC error:', error);
        throw error;
      }
      const rows = (data || []) as any[];
      return rows.map((row) => ({
        id: row.id,
        full_name: [row.first_name, row.last_name].filter(Boolean).join(' '),
        org_name: row.org_name ?? null,
        email: row.email ?? null,
        avatar_url: row.avatar_url ?? null,
      }));
    },
    enabled: true,
  });
}
