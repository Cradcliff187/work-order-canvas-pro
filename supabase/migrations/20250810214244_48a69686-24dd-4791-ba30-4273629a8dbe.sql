-- Add mentioned_user_ids for @mentions tracking on messages
ALTER TABLE public.work_order_messages
ADD COLUMN IF NOT EXISTS mentioned_user_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];