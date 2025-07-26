import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from './useUserProfile';

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
  is_read: boolean;
  read_count: number;
  total_recipients: number;
}

export function useWorkOrderMessages(workOrderId: string, isInternal?: boolean) {
  const { profile } = useUserProfile();
  
  return useQuery({
    queryKey: ['work-order-messages', workOrderId, isInternal, profile?.id],
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

      // Get enhanced message data with read receipts and organization info
      const enhancedMessages = await Promise.all(
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

          // Check if current user has read this message
          let isRead = false;
          if (profile?.id) {
            const { data: readReceipt } = await supabase
              .from('message_read_receipts')
              .select('id')
              .eq('message_id', message.id)
              .eq('user_id', profile.id)
              .limit(1);
            
            isRead = !!readReceipt?.length;
          }

          // Get read count for messages sent by current user
          let readCount = 0;
          let totalRecipients = 0;
          if (profile?.id && message.sender_id === profile.id) {
            const { data: readReceipts } = await supabase
              .from('message_read_receipts')
              .select('user_id')
              .eq('message_id', message.id);
            
            readCount = readReceipts?.length || 0;
            
            // Estimate total recipients based on work order participants
            const { data: assignments } = await supabase
              .from('work_order_assignments')
              .select('assigned_to')
              .eq('work_order_id', workOrderId);
            
            const { data: workOrder } = await supabase
              .from('work_orders')
              .select('organization_id, created_by')
              .eq('id', workOrderId)
              .single();
            
            if (workOrder) {
              const { data: orgUsers } = await supabase
                .from('user_organizations')
                .select('user_id')
                .eq('organization_id', workOrder.organization_id);
              
              const uniqueUsers = new Set([
                workOrder.created_by,
                ...(assignments?.map(a => a.assigned_to) || []),
                ...(orgUsers?.map(u => u.user_id) || [])
              ]);
              
              totalRecipients = Math.max(uniqueUsers.size - 1, 0); // Exclude sender
            }
          }

          return {
            ...message,
            sender_organization: userOrg?.[0]?.organization || null,
            is_read: isRead,
            read_count: readCount,
            total_recipients: totalRecipients,
          };
        })
      );

      return enhancedMessages as WorkOrderMessage[];
    },
    enabled: !!workOrderId,
  });
}