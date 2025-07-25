import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AuditLogEntry {
  id: string;
  action: string;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  created_at: string;
  user_id: string | null;
  profiles?: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
}

export const useWorkOrderAuditLogs = (workOrderId: string) => {
  return useQuery({
    queryKey: ['work-order-audit-logs', workOrderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          id,
          action,
          old_values,
          new_values,
          created_at,
          user_id,
          profiles:user_id (
            first_name,
            last_name,
            email
          )
        `)
        .eq('table_name', 'work_orders')
        .eq('record_id', workOrderId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AuditLogEntry[];
    },
    enabled: !!workOrderId,
  });
};