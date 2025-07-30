-- PHASE 1: AUTHENTICATION SYSTEM REPAIR
-- Fix the core authentication functions to work properly with session context

-- 1. Create a robust session-aware authentication function
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  -- Try to get from current auth context
  SELECT auth.uid() INTO current_user_id;
  
  -- If we have a valid auth context, return it
  IF current_user_id IS NOT NULL THEN
    RETURN current_user_id;
  END IF;
  
  -- If no auth context, this means we're in a context without session
  -- Return NULL to indicate no authenticated user
  RETURN NULL;
END;
$$;

-- 2. Update auth_profile_id_safe to be more robust
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
  SELECT get_current_user_id() INTO current_user_id;
  
  -- If no auth context, return null
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

-- 3. Update jwt_is_admin to be more robust
CREATE OR REPLACE FUNCTION public.jwt_is_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_type_val user_type;
  profile_id uuid;
  current_user_id uuid;
BEGIN
  -- Get current user ID
  SELECT get_current_user_id() INTO current_user_id;
  
  -- If no auth context, not admin
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;
  
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

-- 4. Update get_jwt_user_type to be more robust
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
  current_user_id uuid;
BEGIN
  -- Get current user ID
  SELECT get_current_user_id() INTO current_user_id;
  
  -- If no auth context, return default
  IF current_user_id IS NULL THEN
    RETURN 'subcontractor'::user_type;
  END IF;
  
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
    
    RETURN COALESCE(profile_user_type, 'subcontractor'::user_type);
  END IF;
  
  -- Default fallback
  RETURN 'subcontractor'::user_type;
END;
$$;

-- 5. Update other auth functions to use the new pattern
CREATE OR REPLACE FUNCTION public.has_internal_role(allowed_roles organization_role[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  profile_id uuid;
  current_user_id uuid;
BEGIN
  -- Get current user ID
  SELECT get_current_user_id() INTO current_user_id;
  
  -- If no auth context, return false
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;
  
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

-- 6. Update get_user_organization_ids_safe
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
  current_user_id uuid;
BEGIN
  -- Get current user ID
  SELECT get_current_user_id() INTO current_user_id;
  
  -- If no auth context, return empty array
  IF current_user_id IS NULL THEN
    RETURN ARRAY[]::uuid[];
  END IF;
  
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

-- 7. Test the authentication system
SELECT 
  'Authentication system test' as test,
  get_current_user_id() as current_user_id,
  auth_profile_id_safe() as profile_id_safe,
  jwt_is_admin() as is_admin,
  get_jwt_user_type() as user_type;