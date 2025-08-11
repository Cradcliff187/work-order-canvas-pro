
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { nanoid } from 'nanoid';

interface UploadInput {
  conversationId: string;
  messageId: string;
  file: File;
}

interface MessageAttachment {
  id: string;
  message_id: string;
  file_url: string;
  file_name?: string | null;
  file_type?: string | null;
  file_size?: number | null;
  uploaded_by: string;
  created_at: string;
}

const BUCKET = 'message-attachments';

function sanitizeFileName(name: string) {
  // very basic sanitization
  return name.replace(/[^\w.\-]+/g, '_');
}

export function useUploadMessageAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['upload-message-attachment'],
    mutationFn: async ({ conversationId, messageId, file }: UploadInput): Promise<MessageAttachment> => {
      const safeName = sanitizeFileName(file.name || `file_${nanoid(6)}`);
      const path = `messages/${conversationId}/${messageId}/${Date.now()}_${safeName}`;

      // Upload file to private bucket
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, {
          contentType: file.type || 'application/octet-stream',
          upsert: false,
        });

      if (uploadError) {
        console.error('[useUploadMessageAttachment] storage upload error:', uploadError);
        throw uploadError;
      }

      const filePath = uploadData?.path || path;

      // Insert DB record
      const { data, error } = await supabase
        .from('message_attachments' as any)
        .insert({
          message_id: messageId,
          file_url: filePath, // we store the storage path; generate signed URLs when needed
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          // uploaded_by is set by RLS function via auth context if omitted in WITH CHECK;
          // but we provide no column here; DB policy checks uploaded_by = auth_profile_id_safe() on insert
        })
        .select('*')
        .single();

      if (error) {
        console.error('[useUploadMessageAttachment] insert error:', error);
        throw error;
      }

      return data as unknown as MessageAttachment;
    },
    onSuccess: (_data, variables) => {
      // Refresh the conversation messages to reflect attachment indicators if needed
      queryClient.invalidateQueries({ queryKey: ['conversation-messages', variables.conversationId] });
    },
  });
}
