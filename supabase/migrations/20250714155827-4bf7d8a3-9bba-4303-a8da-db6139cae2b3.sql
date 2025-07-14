-- Remove Resend-specific database elements
-- This migration removes Resend dependencies while keeping email infrastructure for Supabase emails

-- Remove resend_message_id column from email_logs table
-- This column was used for tracking Resend email delivery status
-- Safe to remove as it's nullable and not referenced by constraints
ALTER TABLE public.email_logs DROP COLUMN IF EXISTS resend_message_id;

-- Add comment explaining the change
COMMENT ON TABLE public.email_logs IS 'Email logs for tracking email delivery - now using Supabase native email capabilities';