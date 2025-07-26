import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast, toast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/useUserProfile';
import { WorkOrderMessage } from './useWorkOrderMessages';

export function useMessageSubscription(
  workOrderId: string,
  onMessageReceived?: (message: WorkOrderMessage) => void,
  toastFn?: typeof toast
) {
  const queryClient = useQueryClient();
  const { toast: defaultToast } = useToast();
  const toast = toastFn || defaultToast;
  const { profile } = useUserProfile();

  useEffect(() => {
    if (!workOrderId) return;

    const channel = supabase
      .channel(`work-order-messages-${workOrderId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'work_order_messages',
          filter: `work_order_id=eq.${workOrderId}`,
        },
        async (payload) => {
          console.log('New message received:', payload);
          
          // Refetch message queries to get the latest data
          queryClient.invalidateQueries({
            queryKey: ['work-order-messages', workOrderId],
          });

          // Show toast notification if message is not from current user
          if (payload.new && profile?.id && payload.new.sender_id !== profile.id) {
            try {
              // Fetch work order details to get the work order number
              const { data: workOrder } = await supabase
                .from('work_orders')
                .select('work_order_number')
                .eq('id', workOrderId)
                .single();

              const workOrderNumber = workOrder?.work_order_number || workOrderId;
              const messagePreview = payload.new.message.length > 80 
                ? `${payload.new.message.substring(0, 80)}...`
                : payload.new.message;

              toast({
                title: "New message",
                description: `Work Order ${workOrderNumber}: ${messagePreview}`,
              });
            } catch (error) {
              console.error('Failed to fetch work order details for notification:', error);
              toast({
                title: 'New message received',
                description: 'A new message has been posted to this work order.',
              });
            }
          }

          // Call optional callback if provided
          if (onMessageReceived && payload.new) {
            // Note: The subscription payload doesn't include joined data,
            // so we'll rely on the query refetch to update the UI
            // and this callback for any additional handling
            onMessageReceived(payload.new as WorkOrderMessage);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'work_order_messages',
          filter: `work_order_id=eq.${workOrderId}`,
        },
        (payload) => {
          console.log('Message updated:', payload);
          
          // Refetch message queries to get the latest data
          queryClient.invalidateQueries({
            queryKey: ['work-order-messages', workOrderId],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workOrderId, queryClient, onMessageReceived, toast, profile?.id]);
}