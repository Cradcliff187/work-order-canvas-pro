-- Phase 2: Schedule Automatic Email Queue Processing Every 5 Minutes
-- ============================================================================
-- This migration creates a scheduled cron job to automatically process the
-- email queue every 5 minutes using the existing process_email_queue() function.
--
-- Purpose:
-- - Automates email queue processing without manual intervention
-- - Ensures timely delivery of queued emails every 5 minutes
-- - Uses existing process_email_queue() function without modification
-- - Only affects emails in the queue, not auth emails which bypass the queue
--
-- Job Details:
-- - Job Name: 'process-email-queue-5min'
-- - Schedule: Every 5 minutes (*/5 * * * *)
-- - Function: Calls existing process_email_queue() function
-- - Target: Processes emails in email_queue table
--
-- Safety Notes:
-- - Uses existing function - no function modifications
-- - Only processes queued emails, not direct auth emails
-- - Includes error handling within the scheduled job
-- - Can be monitored via cron job logs
-- ============================================================================

-- Create scheduled job to process email queue every 5 minutes
-- This will automatically call the existing process_email_queue() function
SELECT cron.schedule(
  'process-email-queue-5min',  -- Job name for identification and management
  '*/5 * * * *',               -- Cron expression: every 5 minutes
  $$
  -- Call the existing process_email_queue function
  -- This function handles all email processing logic and error handling
  SELECT process_email_queue();
  $$
);

-- Verification comment: Email queue processing is now scheduled every 5 minutes
-- The job 'process-email-queue-5min' will automatically:
-- 1. Process pending emails in the email_queue table
-- 2. Handle retry logic for failed emails
-- 3. Update email statuses appropriately
-- 4. Log processing results for monitoring