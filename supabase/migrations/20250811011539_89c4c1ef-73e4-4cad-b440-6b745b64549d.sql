
-- Ensure realtime works for messages and improve pagination performance

-- 1) Real-time: capture full row changes for unified_messages
ALTER TABLE public.unified_messages REPLICA IDENTITY FULL;

-- 2) Real-time: add unified_messages to the supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.unified_messages;

-- 3) Performance: help pagination queries (conversation_id + created_at DESC)
CREATE INDEX IF NOT EXISTS idx_unified_messages_conversation_created
  ON public.unified_messages (conversation_id, created_at DESC);
