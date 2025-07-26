import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WorkOrderMessage {
  id: string;
  message: string;
  is_internal: boolean;
  sender_id: string;
  work_order_id: string;
  created_at: string;
  sender: {
    first_name: string;
    last_name: string;
    email: string;
    user_type: string;
  };
  sender_organization: {
    name: string;
  } | null;
}

export function useWorkOrderMessages(workOrderId: string, isInternal?: boolean) {
  return useQuery({
    queryKey: ['work-order-messages', workOrderId, isInternal],
    queryFn: async () => {
      if (!workOrderId) return [];

      let query = supabase
        .from('work_order_messages')
        .select(`
          id,
          message,
          is_internal,
          sender_id,
          work_order_id,
          created_at,
          sender:profiles!sender_id(
            first_name,
            last_name,
            email,
            user_type
          )
        `)
        .eq('work_order_id', workOrderId)
        .order('created_at', { ascending: false });

      // Filter by internal flag if specified
      if (typeof isInternal === 'boolean') {
        query = query.eq('is_internal', isInternal);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Get sender organization information
      const messagesWithOrganizations = await Promise.all(
        (data || []).map(async (message) => {
          // Get organization for the sender
          const { data: userOrg } = await supabase
            .from('user_organizations')
            .select(`
              organization:organizations!organization_id(
                name
              )
            `)
            .eq('user_id', message.sender_id)
            .limit(1);

          return {
            ...message,
            sender_organization: userOrg?.[0]?.organization || null,
          };
        })
      );

      return messagesWithOrganizations as WorkOrderMessage[];
    },
    enabled: !!workOrderId,
  });
}