-- CORRECTED User Creation Fix
-- Only adds what's missing, doesn't duplicate existing functionality

-- ============================================
-- PART 1: Fix Missing auth_user_id Function
-- ============================================
-- This is the ONLY missing function causing user creation failures
CREATE OR REPLACE FUNCTION public.auth_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid()
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.auth_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_id() TO service_role;

-- ============================================
-- PART 2: Verify jwt_organization_ids exists
-- ============================================
-- Just verify it exists, don't recreate it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'jwt_organization_ids'
  ) THEN
    RAISE EXCEPTION 'jwt_organization_ids function is missing - this migration needs updating';
  END IF;
END$$;

-- ============================================
-- PART 3: Email Trigger Cleanup
-- ============================================
-- Remove duplicate triggers as discussed
DROP TRIGGER IF EXISTS trigger_auto_report_status ON work_order_reports;
DROP TRIGGER IF EXISTS trigger_work_order_created ON work_orders;
DROP TRIGGER IF EXISTS trigger_work_order_assigned ON work_orders;
DROP TRIGGER IF EXISTS trigger_report_submitted ON work_order_reports;
DROP TRIGGER IF EXISTS trigger_report_reviewed ON work_order_reports;

-- Remove deprecated trigger functions
DROP FUNCTION IF EXISTS public.notify_work_order_created();
DROP FUNCTION IF EXISTS public.notify_work_order_assigned(); 
DROP FUNCTION IF EXISTS public.notify_report_submitted();
DROP FUNCTION IF EXISTS public.notify_report_reviewed();
DROP FUNCTION IF EXISTS public.notify_user_welcome();

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these after migration to verify success:

-- 1. Check auth_user_id exists
-- SELECT proname FROM pg_proc WHERE proname = 'auth_user_id';

-- 2. Test user creation
-- Try creating a user through the UI

-- 3. Check for duplicate email triggers
-- SELECT trigger_name, event_object_table 
-- FROM information_schema.triggers 
-- WHERE trigger_schema = 'public' 
-- AND trigger_name LIKE '%email%' OR trigger_name LIKE '%report%'
-- ORDER BY event_object_table, trigger_name;

-- ============================================
-- IMPORTANT NOTES
-- ============================================
-- DO NOT create sync_user_type_to_auth trigger - use existing sync-jwt-metadata edge function
-- DO NOT recreate jwt_organization_ids - it already exists
-- DO NOT add complex sync logic - keep it simple