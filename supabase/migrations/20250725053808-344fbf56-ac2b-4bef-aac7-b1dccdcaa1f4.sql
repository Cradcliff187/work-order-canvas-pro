-- Remove broken email audit trigger and function
-- These are redundant and broken (column mismatches causing silent failures)

-- Drop the broken trigger first
DROP TRIGGER IF EXISTS email_log_audit_trigger ON public.email_logs;

-- Drop the broken function
DROP FUNCTION IF EXISTS public.log_email_audit();

-- Verify that the standard audit trigger is still in place for email_logs
-- (This should already exist and work correctly)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'audit_trigger_email_logs' 
    AND tgrelid = 'public.email_logs'::regclass
  ) THEN
    RAISE WARNING 'Standard audit trigger missing for email_logs - this should be investigated';
  ELSE
    RAISE NOTICE 'Standard audit trigger confirmed active for email_logs';
  END IF;
END $$;