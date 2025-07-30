-- PHASE 1: DATABASE SESSION CONTEXT REPAIR
-- Emergency Authentication System Recovery

-- 1. Create robust session-independent auth functions
CREATE OR REPLACE FUNCTION public.auth_profile_id_safe()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  profile_id uuid;
  current_user_id uuid;
  jwt_profile_id uuid;
BEGIN
  -- Get current auth user ID
  SELECT auth.uid() INTO current_user_id;
  
  -- If no auth context, return null (for emergency bypass)
  IF current_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Try to get from JWT app_metadata first
  SELECT (auth.jwt() -> 'app_metadata' ->> 'profile_id')::uuid INTO jwt_profile_id;
  
  -- If JWT has profile_id, verify it exists and return it
  IF jwt_profile_id IS NOT NULL THEN
    SELECT id INTO profile_id
    FROM profiles
    WHERE id = jwt_profile_id AND user_id = current_user_id
    LIMIT 1;
    
    IF profile_id IS NOT NULL THEN
      RETURN profile_id;
    END IF;
  END IF;
  
  -- Fallback: query profiles table directly
  SELECT id INTO profile_id
  FROM profiles
  WHERE user_id = current_user_id
  LIMIT 1;
  
  RETURN profile_id;
END;
$$;

-- 2. Create JWT metadata extraction function
CREATE OR REPLACE FUNCTION public.get_jwt_user_type()
RETURNS user_type
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  jwt_user_type text;
  profile_user_type user_type;
  profile_id uuid;
BEGIN
  -- Try to get from JWT first
  SELECT auth.jwt() -> 'app_metadata' ->> 'user_type' INTO jwt_user_type;
  
  IF jwt_user_type IS NOT NULL THEN
    RETURN jwt_user_type::user_type;
  END IF;
  
  -- Fallback: get from profile
  SELECT auth_profile_id_safe() INTO profile_id;
  
  IF profile_id IS NOT NULL THEN
    SELECT user_type INTO profile_user_type
    FROM profiles
    WHERE id = profile_id;
    
    RETURN profile_user_type;
  END IF;
  
  -- Default fallback
  RETURN 'subcontractor'::user_type;
END;
$$;

-- 3. Create organization membership function
CREATE OR REPLACE FUNCTION public.get_user_organization_ids_safe()
RETURNS uuid[]
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  jwt_org_ids uuid[];
  profile_id uuid;
  db_org_ids uuid[];
BEGIN
  -- Try to get from JWT first
  SELECT ARRAY(
    SELECT jsonb_array_elements_text(auth.jwt() -> 'app_metadata' -> 'organization_ids')
  )::uuid[] INTO jwt_org_ids;
  
  IF jwt_org_ids IS NOT NULL AND array_length(jwt_org_ids, 1) > 0 THEN
    RETURN jwt_org_ids;
  END IF;
  
  -- Fallback: get from database
  SELECT auth_profile_id_safe() INTO profile_id;
  
  IF profile_id IS NOT NULL THEN
    -- Try organization_members first (new structure)
    SELECT array_agg(organization_id) INTO db_org_ids
    FROM organization_members
    WHERE user_id = profile_id;
    
    -- If nothing found, try user_organizations (legacy)
    IF db_org_ids IS NULL OR array_length(db_org_ids, 1) = 0 THEN
      SELECT array_agg(organization_id) INTO db_org_ids
      FROM user_organizations
      WHERE user_id = profile_id;
    END IF;
  END IF;
  
  RETURN COALESCE(db_org_ids, ARRAY[]::uuid[]);
END;
$$;

-- 4. Update core security functions to use safe auth functions
CREATE OR REPLACE FUNCTION public.jwt_is_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_type_val user_type;
  profile_id uuid;
BEGIN
  -- Get user type using safe function
  SELECT get_jwt_user_type() INTO user_type_val;
  
  -- Admin check via user_type
  IF user_type_val = 'admin' THEN
    RETURN true;
  END IF;
  
  -- Admin check via organization membership
  SELECT auth_profile_id_safe() INTO profile_id;
  
  IF profile_id IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 
      FROM organization_members om
      JOIN organizations o ON o.id = om.organization_id
      WHERE om.user_id = profile_id
      AND o.organization_type = 'internal'
      AND om.role = 'admin'
    );
  END IF;
  
  RETURN false;
END;
$$;

-- 5. Update has_internal_role function
CREATE OR REPLACE FUNCTION public.has_internal_role(allowed_roles organization_role[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  profile_id uuid;
BEGIN
  SELECT auth_profile_id_safe() INTO profile_id;
  
  IF profile_id IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 
    FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = profile_id
    AND o.organization_type = 'internal'
    AND om.role = ANY(allowed_roles)
  );
END;
$$;

-- 6. Update can_manage_work_orders function
CREATE OR REPLACE FUNCTION public.can_manage_work_orders()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN has_internal_role(ARRAY['admin', 'manager']::organization_role[]);
END;
$$;

-- 7. Update can_view_financial_data function
CREATE OR REPLACE FUNCTION public.can_view_financial_data()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN has_internal_role(ARRAY['admin', 'manager']::organization_role[]);
END;
$$;

-- 8. Create comprehensive auth test function
CREATE OR REPLACE FUNCTION public.test_auth_system()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  auth_uid uuid;
  profile_id uuid;
  user_type_val user_type;
  org_ids uuid[];
  is_admin boolean;
  can_manage boolean;
  result jsonb;
BEGIN
  -- Test all auth functions
  SELECT auth.uid() INTO auth_uid;
  SELECT auth_profile_id_safe() INTO profile_id;
  SELECT get_jwt_user_type() INTO user_type_val;
  SELECT get_user_organization_ids_safe() INTO org_ids;
  SELECT jwt_is_admin() INTO is_admin;
  SELECT can_manage_work_orders() INTO can_manage;
  
  -- Build comprehensive result
  result := jsonb_build_object(
    'auth_uid', COALESCE(auth_uid::text, 'NULL'),
    'profile_id', COALESCE(profile_id::text, 'NULL'),
    'user_type', COALESCE(user_type_val::text, 'NULL'),
    'organization_ids', COALESCE(array_length(org_ids, 1), 0),
    'is_admin', is_admin,
    'can_manage_work_orders', can_manage,
    'auth_functions_working', (profile_id IS NOT NULL),
    'timestamp', now()
  );
  
  RETURN result;
END;
$$;

-- 9. Update auth_profile_id function to use safe version
CREATE OR REPLACE FUNCTION public.auth_profile_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN auth_profile_id_safe();
END;
$$;