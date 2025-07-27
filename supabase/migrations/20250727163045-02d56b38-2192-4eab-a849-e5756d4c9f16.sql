-- Phase 3: Email Queue Monitoring Function
-- ============================================================================
-- This migration creates a read-only monitoring function to track email queue
-- health and verify that the automated processing is working correctly.
--
-- Purpose:
-- - Monitor email queue status without modifying any data
-- - Track pending and failed email counts
-- - Identify oldest pending emails for processing delays
-- - Verify automation effectiveness
--
-- Function: monitor_email_queue()
-- Returns: jsonb object with queue metrics
-- Security: Read-only function, no data modifications
-- ============================================================================

-- Create monitoring function for email queue status
CREATE OR REPLACE FUNCTION public.monitor_email_queue()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  pending_count integer := 0;
  failed_count integer := 0;
  oldest_pending_age interval;
  oldest_pending_age_text text := null;
BEGIN
  -- Count pending emails (status = 'pending')
  SELECT COUNT(*) INTO pending_count
  FROM email_queue
  WHERE status = 'pending';
  
  -- Count permanently failed emails (retry_count >= 3)
  SELECT COUNT(*) INTO failed_count
  FROM email_queue
  WHERE retry_count >= 3;
  
  -- Get age of oldest pending email
  SELECT (NOW() - MIN(created_at)) INTO oldest_pending_age
  FROM email_queue
  WHERE status = 'pending';
  
  -- Convert interval to readable text format
  IF oldest_pending_age IS NOT NULL THEN
    oldest_pending_age_text := oldest_pending_age::text;
  END IF;
  
  -- Return monitoring data as JSON
  RETURN jsonb_build_object(
    'pending_count', pending_count,
    'failed_count', failed_count,
    'oldest_pending_age', oldest_pending_age_text,
    'queue_health', CASE 
      WHEN pending_count = 0 THEN 'healthy'
      WHEN oldest_pending_age > interval '15 minutes' THEN 'delayed'
      ELSE 'normal'
    END,
    'monitored_at', NOW()
  );
END;
$$;

-- Add comment explaining the function
COMMENT ON FUNCTION public.monitor_email_queue() IS 'Read-only monitoring function that returns email queue health metrics including pending count, failed count, and oldest pending email age';

-- Grant execute permissions to admin and employee roles
-- This allows monitoring without giving access to modify queue data
GRANT EXECUTE ON FUNCTION public.monitor_email_queue() TO authenticated;