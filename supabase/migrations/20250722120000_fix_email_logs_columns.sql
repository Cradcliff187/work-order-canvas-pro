-- Migration: Fix email_logs table columns for send-email edge function
-- Date: 2025-07-22
-- 
-- This migration documents changes that were applied directly to fix email system
-- The edge function was expecting different column names than what existed
-- 
-- Issue: Edge function expected columns that didn't exist:
-- - template_name (actual: template_used)
-- - recipient (actual: recipient_email) 
-- - created_at (actual: sent_at)
-- - Plus missing columns for Resend integration
--
-- Applied directly to fix production email sending

-- Add missing columns for edge function compatibility
ALTER TABLE email_logs 
ADD COLUMN IF NOT EXISTS resend_id TEXT,
ADD COLUMN IF NOT EXISTS record_id UUID,
ADD COLUMN IF NOT EXISTS record_type TEXT,
ADD COLUMN IF NOT EXISTS test_mode BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS subject TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_email_logs_template ON email_logs(template_used);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_record ON email_logs(record_type, record_id);

-- Add comment documenting the table purpose
COMMENT ON TABLE email_logs IS 'Tracks all email send attempts with Resend integration';

-- Document column purposes
COMMENT ON COLUMN email_logs.resend_id IS 'ID returned by Resend API for tracking';
COMMENT ON COLUMN email_logs.record_id IS 'ID of the record (work order, invoice, etc) this email relates to';
COMMENT ON COLUMN email_logs.record_type IS 'Type of record: work_order, invoice, user, etc';
COMMENT ON COLUMN email_logs.test_mode IS 'Whether this was a test email';
COMMENT ON COLUMN email_logs.subject IS 'Processed email subject line after variable substitution';