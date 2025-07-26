-- Add performance indexes for messaging system

-- Index for fetching messages for a work order ordered by creation date (most recent first)
CREATE INDEX IF NOT EXISTS idx_work_order_messages_work_order_created 
ON work_order_messages(work_order_id, created_at DESC);

-- Index for checking which messages a specific user has read
CREATE INDEX IF NOT EXISTS idx_message_read_receipts_user_message 
ON message_read_receipts(user_id, message_id);

-- Index for filtering messages by work order and internal/public status
CREATE INDEX IF NOT EXISTS idx_work_order_messages_internal 
ON work_order_messages(work_order_id, is_internal);