import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PartnerInvoiceAuditLog {
  id: string;
  invoice_id: string;
  action_type: string;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  user_id: string | null;
  user_agent: string | null;
  ip_address: string | null;
  created_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
}

export const usePartnerInvoiceAuditLogs = (invoiceId: string) => {
  return useQuery({
    queryKey: ['partner-invoice-audit-logs', invoiceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partner_invoice_audit_log')
        .select(`
          id,
          invoice_id,
          action_type,
          old_values,
          new_values,
          user_id,
          user_agent,
          ip_address,
          created_at,
          profiles:user_id (
            first_name,
            last_name,
            email
          )
        `)
        .eq('invoice_id', invoiceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PartnerInvoiceAuditLog[];
    },
    enabled: !!invoiceId,
  });
};

export const useLogPartnerInvoiceAction = () => {
  const logAction = async (
    invoiceId: string, 
    actionType: string, 
    details?: Record<string, any>
  ) => {
    try {
      const { error } = await supabase
        .from('partner_invoice_audit_log')
        .insert({
          invoice_id: invoiceId,
          action_type: actionType,
          new_values: details || null,
          user_agent: navigator.userAgent
        });

      if (error) {
        console.error('Failed to log audit action:', error);
      }
    } catch (error) {
      console.error('Failed to log audit action:', error);
    }
  };

  return { logAction };
};