-- Phase 1 Completion: Update auth helper functions for organization_members
-- This ensures all auth functions work with the new organization system

-- Update auth_profile_id function to handle both legacy and new systems
CREATE OR REPLACE FUNCTION public.auth_profile_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  profile_id uuid;
  current_user_id uuid;
BEGIN
  -- Get current auth user ID
  SELECT auth.uid() INTO current_user_id;
  
  -- If no auth context, return null
  IF current_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- First try to get from JWT app_metadata
  SELECT (auth.jwt() -> 'app_metadata' ->> 'profile_id')::uuid INTO profile_id;
  
  -- If JWT has profile_id and it exists, return it
  IF profile_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM profiles WHERE id = profile_id AND user_id = current_user_id) THEN
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

-- Create emergency admin access functions for phase 1 testing
CREATE OR REPLACE FUNCTION public.debug_session_context()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  auth_uid uuid;
  jwt_data jsonb;
  profile_data record;
  membership_count integer;
  legacy_count integer;
BEGIN
  -- Get basic auth info
  SELECT auth.uid() INTO auth_uid;
  SELECT auth.jwt() INTO jwt_data;
  
  -- Get profile info
  SELECT * INTO profile_data
  FROM profiles 
  WHERE user_id = auth_uid 
  LIMIT 1;
  
  -- Count memberships
  SELECT COUNT(*) INTO membership_count
  FROM organization_members 
  WHERE user_id = profile_data.id;
  
  SELECT COUNT(*) INTO legacy_count
  FROM user_organizations 
  WHERE user_id = profile_data.id;
  
  RETURN jsonb_build_object(
    'session_propagation', jsonb_build_object(
      'auth_uid', auth_uid,
      'context_available', auth_uid IS NOT NULL,
      'jwt_exists', jwt_data IS NOT NULL
    ),
    'profile_access', jsonb_build_object(
      'profile_found', profile_data IS NOT NULL,
      'profile_id', profile_data.id,
      'email', profile_data.email,
      'user_type', profile_data.user_type
    ),
    'organization_data', jsonb_build_object(
      'new_table_count', membership_count,
      'legacy_table_count', legacy_count,
      'migration_status', CASE 
        WHEN membership_count > 0 THEN 'migrated'
        WHEN legacy_count > 0 THEN 'needs_migration'
        ELSE 'no_data'
      END
    ),
    'timestamp', now()
  );
END;
$$;

-- Emergency admin bypass functions for testing
CREATE OR REPLACE FUNCTION public.get_admin_profile_emergency()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_profile record;
BEGIN
  -- Find any admin profile for emergency access
  SELECT * INTO admin_profile
  FROM profiles 
  WHERE user_type = 'admin'
  ORDER BY created_at ASC
  LIMIT 1;
  
  RETURN jsonb_build_object(
    'profile', row_to_json(admin_profile),
    'emergency_access', true,
    'timestamp', now()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_organizations_emergency()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_profile_id uuid;
  memberships jsonb;
BEGIN
  -- Get admin profile
  SELECT id INTO admin_profile_id
  FROM profiles 
  WHERE user_type = 'admin'
  ORDER BY created_at ASC
  LIMIT 1;
  
  -- Get organization memberships
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', om.id,
      'user_id', om.user_id,
      'organization_id', om.organization_id,
      'role', om.role,
      'organization', row_to_json(o)
    )
  ) INTO memberships
  FROM organization_members om
  JOIN organizations o ON o.id = om.organization_id
  WHERE om.user_id = admin_profile_id;
  
  RETURN jsonb_build_object(
    'memberships', COALESCE(memberships, '[]'::jsonb),
    'emergency_access', true,
    'timestamp', now()
  );
END;
$$;

-- Test basic database operations
CREATE OR REPLACE FUNCTION public.test_basic_db_operations()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  org_count integer;
  profile_count integer;
  member_count integer;
BEGIN
  SELECT COUNT(*) INTO org_count FROM organizations;
  SELECT COUNT(*) INTO profile_count FROM profiles;
  SELECT COUNT(*) INTO member_count FROM organization_members;
  
  RETURN jsonb_build_object(
    'organizations', org_count,
    'profiles', profile_count,
    'organization_members', member_count,
    'database_accessible', true,
    'timestamp', now()
  );
END;
$$;