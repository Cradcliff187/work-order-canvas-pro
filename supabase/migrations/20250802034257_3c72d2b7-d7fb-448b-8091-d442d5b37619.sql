-- Emergency Fix 4/4: Fix remaining database functions and verify login flow
-- This removes final references to user_type enum and ensures all systems work

-- 1. Fix test_auth_system() to use organization-based permissions
CREATE OR REPLACE FUNCTION public.test_auth_system()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  auth_uid uuid;
  profile_id uuid;
  primary_user_type text;
  org_ids uuid[];
  is_admin boolean;
  can_manage boolean;
  result jsonb;
BEGIN
  -- Test all auth functions
  SELECT auth.uid() INTO auth_uid;
  SELECT auth_profile_id_safe() INTO profile_id;
  
  -- Get primary user type from organization membership
  SELECT 
    CASE 
      WHEN COUNT(*) FILTER (WHERE o.organization_type = 'internal') > 0 THEN 'admin'
      WHEN COUNT(*) FILTER (WHERE o.organization_type = 'partner') > 0 THEN 'partner' 
      WHEN COUNT(*) FILTER (WHERE o.organization_type = 'subcontractor') > 0 THEN 'subcontractor'
      ELSE 'user'
    END INTO primary_user_type
  FROM organization_members om
  JOIN organizations o ON o.id = om.organization_id
  WHERE om.user_id = profile_id;
  
  SELECT get_user_organization_ids_safe() INTO org_ids;
  SELECT jwt_is_admin() INTO is_admin;
  SELECT can_manage_work_orders() INTO can_manage;
  
  -- Build comprehensive result
  result := jsonb_build_object(
    'auth_uid', COALESCE(auth_uid::text, 'NULL'),
    'profile_id', COALESCE(profile_id::text, 'NULL'),
    'user_type', COALESCE(primary_user_type, 'NULL'),
    'organization_ids', COALESCE(array_length(org_ids, 1), 0),
    'is_admin', is_admin,
    'can_manage_work_orders', can_manage,
    'auth_functions_working', (profile_id IS NOT NULL),
    'timestamp', now()
  );
  
  RETURN result;
END;
$function$;

-- 2. Update get_current_user_type() to use organization_members
CREATE OR REPLACE FUNCTION public.get_current_user_type()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  profile_id uuid;
  user_type_result text;
BEGIN
  SELECT auth_profile_id_safe() INTO profile_id;
  
  IF profile_id IS NULL THEN
    RETURN 'user';
  END IF;
  
  -- Determine user type from organization membership
  SELECT 
    CASE 
      WHEN COUNT(*) FILTER (WHERE o.organization_type = 'internal') > 0 THEN 'admin'
      WHEN COUNT(*) FILTER (WHERE o.organization_type = 'partner') > 0 THEN 'partner' 
      WHEN COUNT(*) FILTER (WHERE o.organization_type = 'subcontractor') > 0 THEN 'subcontractor'
      ELSE 'user'
    END INTO user_type_result
  FROM organization_members om
  JOIN organizations o ON o.id = om.organization_id
  WHERE om.user_id = profile_id;
  
  RETURN COALESCE(user_type_result, 'user');
END;
$function$;