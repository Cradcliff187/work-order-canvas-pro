-- Drop the existing constraint that requires non-empty messages
ALTER TABLE work_order_messages DROP CONSTRAINT IF EXISTS work_order_messages_message_check;

-- Add new constraint that allows empty messages when attachments are present
ALTER TABLE work_order_messages 
ADD CONSTRAINT work_order_messages_message_check 
CHECK (
  (length(trim(message)) > 0) OR 
  (attachment_ids IS NOT NULL AND array_length(attachment_ids, 1) > 0)
);