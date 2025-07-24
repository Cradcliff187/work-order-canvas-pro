-- Test Batch 1: Fix Function Search Path Mutable warnings for 5 core auth functions
-- This is a low-risk security enhancement that adds SET search_path TO 'public' to functions

CREATE OR REPLACE FUNCTION public.jwt_profile_id()
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  profile_id uuid;
BEGIN
  -- First try to get from JWT app_metadata
  SELECT (auth.jwt() -> 'app_metadata' ->> 'profile_id')::uuid INTO profile_id;
  
  -- If not in JWT, query profiles table directly (bypassing RLS)
  IF profile_id IS NULL THEN
    SELECT id INTO profile_id
    FROM profiles
    WHERE user_id = auth.uid()
    LIMIT 1;
  END IF;
  
  RETURN profile_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.jwt_user_type()
 RETURNS user_type
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_type text;
BEGIN
  -- First try to get from JWT app_metadata
  SELECT auth.jwt() -> 'app_metadata' ->> 'user_type' INTO user_type;
  
  -- If not in JWT, query profiles table directly (bypassing RLS)
  IF user_type IS NULL THEN
    SELECT profiles.user_type::text INTO user_type
    FROM profiles
    WHERE user_id = auth.uid()
    LIMIT 1;
  END IF;
  
  RETURN COALESCE(user_type::user_type, 'subcontractor'::user_type);
END;
$function$;

CREATE OR REPLACE FUNCTION public.jwt_is_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_type text;
BEGIN
  -- First try to get from JWT app_metadata
  SELECT auth.jwt() -> 'app_metadata' ->> 'user_type' INTO user_type;
  
  -- If not in JWT, query profiles table directly (bypassing RLS)
  IF user_type IS NULL THEN
    SELECT profiles.user_type::text INTO user_type
    FROM profiles
    WHERE user_id = auth.uid()
    LIMIT 1;
  END IF;
  
  RETURN COALESCE(user_type = 'admin', false);
END;
$function$;

CREATE OR REPLACE FUNCTION public.jwt_organization_ids()
 RETURNS uuid[]
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  org_ids uuid[];
BEGIN
  -- First try to get from JWT app_metadata
  SELECT array(
    SELECT uuid(value)
    FROM jsonb_array_elements_text(auth.jwt() -> 'app_metadata' -> 'organization_ids')
  ) INTO org_ids;
  
  -- If not in JWT, query user_organizations table directly
  IF org_ids IS NULL OR array_length(org_ids, 1) IS NULL THEN
    SELECT array_agg(uo.organization_id) INTO org_ids
    FROM user_organizations uo
    WHERE uo.user_id = jwt_profile_id();
  END IF;
  
  RETURN COALESCE(org_ids, ARRAY[]::uuid[]);
END;
$function$;

CREATE OR REPLACE FUNCTION public.auth_user_belongs_to_organization(p_organization_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_profile_id uuid;
BEGIN
  -- Get the current user's profile ID
  user_profile_id := jwt_profile_id();
  
  IF user_profile_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user belongs to the organization
  RETURN EXISTS (
    SELECT 1 
    FROM user_organizations uo
    WHERE uo.user_id = user_profile_id 
    AND uo.organization_id = auth_user_belongs_to_organization.p_organization_id
  );
END;
$function$;