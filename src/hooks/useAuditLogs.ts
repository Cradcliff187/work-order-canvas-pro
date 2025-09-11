import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AuditLog {
  id: string;
  time_entry_id: string;
  action: string;
  old_values?: any;
  new_values?: any;
  changed_by?: string;
  created_at: string;
  user?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export function useAuditLogs(timeEntryId?: string) {
  return useQuery({
    queryKey: ['audit-logs', timeEntryId],
    queryFn: async (): Promise<AuditLog[]> => {
      let query = supabase
        .from('time_entry_audits')
        .select(`
          id,
          time_entry_id,
          action,
          old_values,
          new_values,
          changed_by,
          created_at,
          user:profiles!changed_by(
            first_name,
            last_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (timeEntryId) {
        query = query.eq('time_entry_id', timeEntryId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!timeEntryId,
  });
}