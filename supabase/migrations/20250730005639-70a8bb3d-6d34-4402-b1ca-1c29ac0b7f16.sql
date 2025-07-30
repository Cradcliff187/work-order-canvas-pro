-- PHASE 2: REMOVE EMERGENCY SCAFFOLDING
-- Now that authentication functions are fixed, remove the emergency bypasses

-- 1. Remove the emergency bypass function
DROP FUNCTION IF EXISTS public.emergency_auth_bypass();

-- 2. Remove emergency RLS policies
DROP POLICY IF EXISTS "emergency_profile_access" ON public.profiles;
DROP POLICY IF EXISTS "emergency_org_member_access" ON public.organization_members;
DROP POLICY IF EXISTS "emergency_user_org_access" ON public.user_organizations;

-- 3. Test that regular RLS policies work correctly
SELECT 
  'Emergency scaffolding removal test' as test,
  'Authentication functions should now work properly' as note,
  get_current_user_id() as current_user_id,
  auth_profile_id_safe() as profile_id_safe,
  jwt_is_admin() as is_admin;