-- Emergency fix for stack depth limit exceeded error (circular dependency in JWT functions)
-- This migration replaces the problematic JWT functions with SECURITY DEFINER versions that bypass RLS

-- Drop all existing JWT functions to break circular dependencies
DROP FUNCTION IF EXISTS public.jwt_is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.jwt_profile_id() CASCADE;
DROP FUNCTION IF EXISTS public.jwt_user_type() CASCADE;
DROP FUNCTION IF EXISTS public.jwt_organization_ids() CASCADE;

-- Create SECURITY DEFINER functions that bypass RLS to prevent infinite recursion
-- These functions directly query the database without triggering RLS policies

-- Function to get profile ID directly from auth.users app_metadata (bypass RLS)
CREATE OR REPLACE FUNCTION public.jwt_profile_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
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
$$;

-- Function to check admin status directly from auth.users app_metadata (bypass RLS)
CREATE OR REPLACE FUNCTION public.jwt_is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
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
$$;

-- Function to get user type directly from auth.users app_metadata (bypass RLS)
CREATE OR REPLACE FUNCTION public.jwt_user_type()
RETURNS user_type
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
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
$$;

-- Function to get organization IDs directly from auth.users app_metadata (bypass RLS)
CREATE OR REPLACE FUNCTION public.jwt_organization_ids()
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  org_ids uuid[];
  profile_id uuid;
BEGIN
  -- First try to get from JWT app_metadata
  SELECT ARRAY(
    SELECT jsonb_array_elements_text(auth.jwt() -> 'app_metadata' -> 'organization_ids')::uuid
  ) INTO org_ids;
  
  -- If not in JWT, query user_organizations table directly (bypassing RLS)
  IF org_ids IS NULL OR array_length(org_ids, 1) IS NULL THEN
    -- Get profile ID first
    SELECT id INTO profile_id
    FROM profiles
    WHERE user_id = auth.uid()
    LIMIT 1;
    
    -- Get organization IDs
    SELECT array_agg(organization_id) INTO org_ids
    FROM user_organizations
    WHERE user_id = profile_id;
  END IF;
  
  RETURN COALESCE(org_ids, '{}');
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.jwt_profile_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.jwt_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.jwt_user_type() TO authenticated;
GRANT EXECUTE ON FUNCTION public.jwt_organization_ids() TO authenticated;