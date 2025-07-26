-- Phase 1: Add photo attachment capability to work order messages
-- Add attachment_ids array column to work_order_messages table
ALTER TABLE public.work_order_messages 
ADD COLUMN attachment_ids UUID[] DEFAULT ARRAY[]::UUID[];

-- Add work_order_message_id reference to work_order_attachments table
ALTER TABLE public.work_order_attachments 
ADD COLUMN work_order_message_id UUID REFERENCES public.work_order_messages(id) ON DELETE CASCADE;

-- Add indexes for performance
CREATE INDEX idx_work_order_messages_attachment_ids ON public.work_order_messages USING GIN(attachment_ids);
CREATE INDEX idx_work_order_attachments_message_id ON public.work_order_attachments(work_order_message_id);

-- Add comments for documentation
COMMENT ON COLUMN public.work_order_messages.attachment_ids IS 'Array of attachment IDs associated with this message';
COMMENT ON COLUMN public.work_order_attachments.work_order_message_id IS 'Reference to work order message if attachment belongs to a message';