import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from './useUserProfile';

export interface WorkOrderAttachment {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
}

export interface WorkOrderMessage {
  id: string;
  message: string;
  is_internal: boolean;
  sender_id: string;
  work_order_id: string;
  created_at: string;
  crew_member_name?: string;
  attachment_ids?: string[];
  mentioned_user_ids?: string[];
  attachments?: WorkOrderAttachment[];
  sender: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
  sender_organization: {
    name: string;
  } | null;
  is_read: boolean;
  read_count: number;
  total_recipients: number;
}

export interface WorkOrderMessagesResult {
  messages: WorkOrderMessage[];
  hasMore: boolean;
  totalCount: number;
}

export function useWorkOrderMessages(
  workOrderId: string, 
  isInternal?: boolean, 
  page: number = 1, 
  pageSize: number = 50
) {
  const { profile } = useUserProfile();
  
  return useQuery({
    queryKey: ['work-order-messages', workOrderId, isInternal, page, pageSize, profile?.id],
    queryFn: async (): Promise<WorkOrderMessagesResult> => {
      if (!workOrderId) return { messages: [], hasMore: false, totalCount: 0 };

      // Calculate pagination range
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('work_order_messages')
        .select(`
          id,
          message,
          is_internal,
          sender_id,
          work_order_id,
          created_at,
          crew_member_name,
          attachment_ids,
          mentioned_user_ids,
          sender:profiles!sender_id(
            first_name,
            last_name,
            email
          )
        `, { count: 'exact' })
        .eq('work_order_id', workOrderId)
        .order('created_at', { ascending: false })
        .range(from, to);

      // Filter by internal flag if specified
      if (typeof isInternal === 'boolean') {
        query = query.eq('is_internal', isInternal);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      // Get enhanced message data with read receipts and organization info
      const enhancedMessages = await Promise.all(
        (data || []).map(async (message) => {
          // Get organization for the sender
          const { data: userOrg } = await supabase
            .from('organization_members')
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
            .select('message_id')
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
            
            // Calculate total recipients based on message visibility rules
            const { data: workOrder } = await supabase
              .from('work_orders')
              .select('organization_id, assigned_organization_id')
              .eq('id', workOrderId)
              .single();
            
            if (workOrder) {
              const uniqueUsers = new Set<string>();
              
              if (message.is_internal) {
                // INTERNAL messages: admins + assigned subcontractors + assigned employees only
                
                // Get internal organization members (admins + employees)
                const { data: internalUsers } = await supabase
                  .from('organization_members')
                  .select(`
                    user_id,
                    role,
                    organization:organizations!organization_id(organization_type)
                  `)
                  .eq('organization.organization_type', 'internal');
                
                // Add all internal users (admins and employees)
                internalUsers?.forEach(user => {
                  if (user.user_id) uniqueUsers.add(user.user_id);
                });
                
                // Get assigned subcontractors from work order assignments
                if (workOrder.assigned_organization_id) {
                  const { data: assignedSubcontractors } = await supabase
                    .from('organization_members')
                    .select('user_id')
                    .eq('organization_id', workOrder.assigned_organization_id);
                  
                  assignedSubcontractors?.forEach(user => {
                    if (user.user_id) uniqueUsers.add(user.user_id);
                  });
                }
                
              } else {
                // PUBLIC messages: admins + employees + partner organization members
                
                // Get internal organization members (admins + employees)
                const { data: internalUsers } = await supabase
                  .from('organization_members')
                  .select(`
                    user_id,
                    organization:organizations!organization_id(organization_type)
                  `)
                  .eq('organization.organization_type', 'internal');
                
                // Add internal users
                internalUsers?.forEach(user => {
                  if (user.user_id) uniqueUsers.add(user.user_id);
                });
                
                // Get partner organization members
                const { data: partnerUsers } = await supabase
                  .from('organization_members')
                  .select('user_id')
                  .eq('organization_id', workOrder.organization_id);
                
                partnerUsers?.forEach(user => {
                  if (user.user_id) uniqueUsers.add(user.user_id);
                });
              }
              
              // Remove sender from count
              uniqueUsers.delete(message.sender_id);
              totalRecipients = uniqueUsers.size;
            }
          }

          // Fetch attachments if message has attachment_ids
          let attachments: WorkOrderAttachment[] = [];
          if (message.attachment_ids && message.attachment_ids.length > 0) {
            const { data: attachmentData } = await supabase
              .from('work_order_attachments')
              .select('id, file_name, file_url, file_type')
              .in('id', message.attachment_ids);
            
            attachments = attachmentData || [];
          }

          return {
            ...message,
            attachments,
            sender_organization: userOrg?.[0]?.organization || null,
            is_read: isRead,
            read_count: readCount,
            total_recipients: totalRecipients,
          };
        })
      );

      const totalCount = count || 0;
      const hasMore = (data?.length || 0) === pageSize && (from + pageSize) < totalCount;

      return {
        messages: enhancedMessages as WorkOrderMessage[],
        hasMore,
        totalCount,
      };
    },
    enabled: !!workOrderId,
  });
}