-- EMERGENCY FIX: Enable RLS on tables with policies but disabled RLS
-- Phase 1: Critical Database Security Fix

-- Enable RLS on all tables that should have it enabled
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Add missing RLS policies for organizations table
CREATE POLICY "admins_can_manage_organizations" ON public.organizations
FOR ALL USING (jwt_is_admin())
WITH CHECK (jwt_is_admin());

CREATE POLICY "users_can_view_own_organizations" ON public.organizations
FOR SELECT USING (
  id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth_profile_id_safe()
  )
);

-- Add missing RLS policies for profiles table  
CREATE POLICY "users_can_view_own_profile" ON public.profiles
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "users_can_update_own_profile" ON public.profiles
FOR UPDATE USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "admins_can_manage_all_profiles" ON public.profiles
FOR ALL USING (jwt_is_admin())
WITH CHECK (jwt_is_admin());

CREATE POLICY "system_can_create_profiles" ON public.profiles
FOR INSERT WITH CHECK (true);

-- Fix auth_profile_id function to be more robust
CREATE OR REPLACE FUNCTION public.auth_profile_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Use the safe version
  RETURN auth_profile_id_safe();
END;
$function$;

-- Update trigger_jwt_metadata_sync function to handle organization-based system
CREATE OR REPLACE FUNCTION public.trigger_jwt_metadata_sync(p_user_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  target_user_id uuid;
  profile_id uuid;
  org_memberships jsonb;
  org_ids uuid[];
  org_types text[];
  is_active boolean := true;
  result jsonb;
BEGIN
  -- Use provided user_id or current auth user
  target_user_id := COALESCE(p_user_id, auth.uid());
  
  IF target_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No user ID provided and no authenticated user'
    );
  END IF;
  
  -- Get profile ID
  SELECT id INTO profile_id
  FROM profiles
  WHERE user_id = target_user_id
  LIMIT 1;
  
  IF profile_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Profile not found for user'
    );
  END IF;
  
  -- Get organization memberships using organization_members table
  SELECT 
    array_agg(om.organization_id),
    array_agg(o.organization_type::text),
    jsonb_agg(
      jsonb_build_object(
        'organization_id', om.organization_id,
        'organization_name', o.name,
        'organization_type', o.organization_type,
        'role', om.role
      )
    )
  INTO org_ids, org_types, org_memberships
  FROM organization_members om
  JOIN organizations o ON o.id = om.organization_id
  WHERE om.user_id = profile_id
  AND o.is_active = true;
  
  -- Update auth.users metadata
  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
    'profile_id', profile_id,
    'organization_ids', COALESCE(org_ids, ARRAY[]::uuid[]),
    'organization_types', COALESCE(org_types, ARRAY[]::text[]),
    'organizations', COALESCE(org_memberships, '[]'::jsonb),
    'is_active', is_active,
    'last_sync', now()
  )
  WHERE id = target_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'metadata', jsonb_build_object(
      'profile_id', profile_id,
      'organization_ids', COALESCE(org_ids, ARRAY[]::uuid[]),
      'organization_types', COALESCE(org_types, ARRAY[]::text[]),
      'is_active', is_active
    )
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$function$;