-- PHASE 2: REMOVE EMERGENCY SCAFFOLDING (CORRECTED ORDER)
-- Remove policies first, then the function they depend on

-- 1. Remove emergency RLS policies first
DROP POLICY IF EXISTS "emergency_profile_access" ON public.profiles;
DROP POLICY IF EXISTS "emergency_org_member_access" ON public.organization_members; 
DROP POLICY IF EXISTS "emergency_user_org_access" ON public.user_organizations;

-- 2. Now remove the emergency bypass function
DROP FUNCTION IF EXISTS public.emergency_auth_bypass();

-- 3. Test that the system works without emergency scaffolding
SELECT 
  'Emergency scaffolding removal test' as test,
  'System should now use proper authentication' as note,
  get_current_user_id() as current_user_id,
  auth_profile_id_safe() as profile_id_safe,
  jwt_is_admin() as is_admin;