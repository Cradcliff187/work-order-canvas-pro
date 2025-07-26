import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { WorkOrderMessage } from './useWorkOrderMessages';

export function useMessageSubscription(
  workOrderId: string,
  onMessageReceived?: (message: WorkOrderMessage) => void
) {
  const queryClient = useQueryClient();

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
        (payload) => {
          console.log('New message received:', payload);
          
          // Refetch message queries to get the latest data
          queryClient.invalidateQueries({
            queryKey: ['work-order-messages', workOrderId],
          });

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
  }, [workOrderId, queryClient, onMessageReceived]);
}