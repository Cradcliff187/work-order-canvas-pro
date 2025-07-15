-- Fix RLS circular dependency causing "No Organization Assigned" errors
-- Create SECURITY DEFINER functions that bypass RLS to break circular dependencies

-- Create a function that directly queries profile ID without RLS
CREATE OR REPLACE FUNCTION public.get_profile_id_direct(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_profile_id uuid;
BEGIN
  SELECT id INTO v_profile_id
  FROM profiles
  WHERE user_id = p_user_id
  LIMIT 1;
  
  RETURN v_profile_id;
END;
$$;

-- Create a function that directly queries user organizations without RLS
CREATE OR REPLACE FUNCTION public.get_user_organization_ids_direct(p_user_id uuid)
RETURNS TABLE(organization_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT uo.organization_id
  FROM user_organizations uo
  JOIN profiles p ON p.id = uo.user_id
  WHERE p.user_id = p_user_id;
END;
$$;

-- Update auth_profile_id to use direct profile lookup (fixes the core issue)
CREATE OR REPLACE FUNCTION public.auth_profile_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN public.get_profile_id_direct(auth.uid());
END;
$$;

-- Update auth_user_organizations to use direct query (breaks circular dependency)
CREATE OR REPLACE FUNCTION public.auth_user_organizations()
RETURNS TABLE(organization_id uuid)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.get_user_organization_ids_direct(auth.uid());
END;
$$;