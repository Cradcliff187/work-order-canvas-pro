import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export interface QueuedMessage {
  id: string;
  workOrderId: string;
  message: string;
  isInternal: boolean;
  senderId: string;
  queuedAt: number;
  retryCount?: number;
}

export function useOfflineMessageSync() {
  const { toast } = useToast();
  const { isOnline } = useNetworkStatus();

  const syncQueuedMessages = useCallback(async () => {
    if (!isOnline) return;

    const queuedMessageKeys = Object.keys(localStorage).filter(key => 
      key.startsWith('offline-message-')
    );

    if (queuedMessageKeys.length === 0) return;

    let successCount = 0;
    let failureCount = 0;

    for (const key of queuedMessageKeys) {
      try {
        const queuedMessageData = localStorage.getItem(key);
        if (!queuedMessageData) continue;

        const queuedMessage: QueuedMessage = JSON.parse(queuedMessageData);

        // Attempt to send the message
        const { error } = await supabase
          .from('work_order_messages')
          .insert({
            work_order_id: queuedMessage.workOrderId,
            message: queuedMessage.message.trim(),
            is_internal: queuedMessage.isInternal,
            sender_id: queuedMessage.senderId,
          });

        if (error) {
          console.error('Failed to sync queued message:', error);
          failureCount++;
          
          // Update retry count
          const updatedMessage = {
            ...queuedMessage,
            retryCount: (queuedMessage.retryCount || 0) + 1
          };
          localStorage.setItem(key, JSON.stringify(updatedMessage));
        } else {
          // Successfully sent, remove from localStorage
          localStorage.removeItem(key);
          successCount++;
        }
      } catch (error) {
        console.error('Error processing queued message:', error);
        failureCount++;
      }
    }

    // Show sync results
    if (successCount > 0) {
      toast({
        title: 'Messages synced',
        description: `${successCount} queued message${successCount > 1 ? 's' : ''} sent successfully`,
      });
    }

    if (failureCount > 0) {
      toast({
        title: 'Sync incomplete',
        description: `${failureCount} message${failureCount > 1 ? 's' : ''} failed to sync. Will retry when connection improves.`,
        variant: 'destructive',
      });
    }
  }, [isOnline, toast]);

  // Sync on mount and when coming back online
  useEffect(() => {
    if (isOnline) {
      syncQueuedMessages();
    }
  }, [isOnline, syncQueuedMessages]);

  // Also sync when the component mounts (in case we're already online)
  useEffect(() => {
    syncQueuedMessages();
  }, []);

  return {
    syncQueuedMessages,
    getQueuedMessages: () => {
      const queuedMessageKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('offline-message-')
      );
      return queuedMessageKeys.map(key => {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) as QueuedMessage : null;
      }).filter(Boolean) as QueuedMessage[];
    }
  };
}