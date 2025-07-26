import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { QueuedMessage } from '@/hooks/useOfflineMessageSync';

export interface PostMessageData {
  workOrderId: string;
  message: string;
  isInternal: boolean;
  attachmentIds?: string[];
}

export function usePostMessage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ workOrderId, message, isInternal, attachmentIds }: PostMessageData) => {
      // Check if offline
      if (!navigator.onLine) {
        // Get current user's profile ID for offline storage
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          throw new Error('User not authenticated');
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (profileError || !profile) {
          throw new Error('User profile not found');
        }

        // Create queued message object
        const queuedMessage: QueuedMessage = {
          id: `temp-${Date.now()}`,
          workOrderId,
          message: message.trim(),
          isInternal,
          senderId: profile.id,
          queuedAt: Date.now(),
        };

        // Store in localStorage
        const storageKey = `offline-message-${Date.now()}`;
        localStorage.setItem(storageKey, JSON.stringify(queuedMessage));

        // Return mock success response with special flag
        return {
          id: queuedMessage.id,
          message: queuedMessage.message,
          is_internal: queuedMessage.isInternal,
          sender_id: queuedMessage.senderId,
          work_order_id: queuedMessage.workOrderId,
          created_at: new Date().toISOString(),
          sender: null,
          isQueued: true, // Special flag for offline messages
        };
      }

      // Online flow - proceed normally
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      // Get profile ID from the authenticated user
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile) {
        throw new Error('User profile not found');
      }

      const { data, error } = await supabase
        .from('work_order_messages')
        .insert({
          work_order_id: workOrderId,
          message: message.trim(),
          is_internal: isInternal,
          sender_id: profile.id,
          attachment_ids: attachmentIds || [],
        })
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
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      // Handle offline queued messages
      if (data.isQueued) {
        toast({
          title: 'Message queued',
          description: 'Message will be sent when connection is restored',
        });
        return;
      }

      // Invalidate message queries to refetch data (only for online messages)
      queryClient.invalidateQueries({ 
        queryKey: ['work-order-messages', data.work_order_id] 
      });
      
      toast({
        title: 'Message posted',
        description: data.is_internal ? 'Internal note added successfully' : 'Message posted to discussion',
      });
    },
    onError: (error: any) => {
      console.error('Failed to post message:', error);
      toast({
        title: 'Failed to post message',
        description: error.message || 'Unable to post message. Please try again.',
        variant: 'destructive',
      });
    },
  });
}