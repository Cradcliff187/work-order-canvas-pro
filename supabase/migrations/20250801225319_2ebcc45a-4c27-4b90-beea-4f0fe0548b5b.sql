-- Safe database cleanup - removing verified unused legacy functions
-- Based on code analysis, these functions are NOT used in current codebase

BEGIN;

-- 1. Drop unused legacy functions that are not referenced in code
DROP FUNCTION IF EXISTS public.get_current_user_type() CASCADE;
DROP FUNCTION IF EXISTS public.get_jwt_user_type() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_organizations() CASCADE;
DROP FUNCTION IF EXISTS public.user_belongs_to_organization(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.user_assigned_to_work_order(uuid) CASCADE;

-- 2. Drop emergency functions (these were temporary fixes)
DROP FUNCTION IF EXISTS public.emergency_auth_bypass() CASCADE;
DROP FUNCTION IF EXISTS public.get_admin_profile_emergency() CASCADE;
DROP FUNCTION IF EXISTS public.get_admin_organizations_emergency() CASCADE;

-- 3. Add performance indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_organization_members_user_org 
  ON organization_members(user_id, organization_id);
  
CREATE INDEX IF NOT EXISTS idx_work_orders_assigned_org 
  ON work_orders(assigned_organization_id, status);
  
CREATE INDEX IF NOT EXISTS idx_profiles_active 
  ON profiles(is_active) WHERE is_active = true;

-- 4. Verify legacy table migration completion
-- Check if user_organizations table has any unmigrated data
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_organizations') THEN
    -- Check for unmigrated data
    IF EXISTS (
      SELECT 1 FROM user_organizations uo
      WHERE NOT EXISTS (
        SELECT 1 FROM organization_members om 
        WHERE om.user_id = uo.user_id 
        AND om.organization_id = uo.organization_id
      )
    ) THEN
      RAISE WARNING 'user_organizations table contains unmigrated data - migration incomplete';
    ELSE
      -- Safe to drop the legacy table
      DROP TABLE user_organizations CASCADE;
      RAISE NOTICE 'user_organizations table dropped - migration complete';
    END IF;
  END IF;
END $$;

-- 5. Clean up any remaining duplicate triggers (verification)
DO $$
DECLARE
  trigger_count integer;
BEGIN
  SELECT COUNT(*) INTO trigger_count
  FROM information_schema.triggers 
  WHERE trigger_name IN (
    'trigger_auto_report_status',
    'trigger_work_order_created', 
    'trigger_work_order_assigned',
    'trigger_report_submitted',
    'trigger_report_reviewed'
  );
  
  IF trigger_count > 0 THEN
    RAISE WARNING 'Found % duplicate email triggers that should be cleaned up', trigger_count;
  ELSE
    RAISE NOTICE 'No duplicate email triggers found - cleanup complete';
  END IF;
END $$;

COMMIT;