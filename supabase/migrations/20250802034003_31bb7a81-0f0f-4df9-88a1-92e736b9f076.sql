-- Emergency Fix 3/4: Update database functions to use organization_members exclusively
-- This removes all remaining references to user_organizations table

-- 1. Update sync_user_auth_metadata() to use organization_members only
CREATE OR REPLACE FUNCTION public.sync_user_auth_metadata(target_user_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id uuid;
  v_profile record;
  v_organization_ids uuid[];
  v_result jsonb;
BEGIN
  -- Use provided user_id or try to get from auth context
  v_user_id := COALESCE(target_user_id, auth.uid());
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'No user ID provided and no auth context');
  END IF;
  
  -- Get user profile (no more user_type column)
  SELECT id, is_active, email
  INTO v_profile
  FROM profiles
  WHERE user_id = v_user_id;
  
  IF v_profile IS NULL THEN
    RETURN jsonb_build_object('error', 'Profile not found for user: ' || v_user_id::text);
  END IF;
  
  -- Get organization memberships from organization_members only
  SELECT array_agg(DISTINCT organization_id) INTO v_organization_ids
  FROM organization_members 
  WHERE user_id = v_profile.id;
  
  -- Handle case where no organizations exist
  IF v_organization_ids IS NULL THEN
    v_organization_ids := ARRAY[]::uuid[];
  END IF;
  
  -- Get primary user type from organization membership
  DECLARE
    v_primary_user_type text;
  BEGIN
    SELECT 
      CASE 
        WHEN COUNT(*) FILTER (WHERE o.organization_type = 'internal') > 0 THEN 'admin'
        WHEN COUNT(*) FILTER (WHERE o.organization_type = 'partner') > 0 THEN 'partner' 
        WHEN COUNT(*) FILTER (WHERE o.organization_type = 'subcontractor') > 0 THEN 'subcontractor'
        ELSE 'user'
      END INTO v_primary_user_type
    FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = v_profile.id;
  END;
  
  -- Update auth metadata
  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
    'user_type', v_primary_user_type,
    'profile_id', v_profile.id,
    'organization_ids', v_organization_ids,
    'is_active', v_profile.is_active,
    'email', v_profile.email
  )
  WHERE id = v_user_id;
  
  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'profile_id', v_profile.id,
    'user_type', v_primary_user_type,
    'organization_count', array_length(v_organization_ids, 1)
  );
END;
$function$;

-- 2. Update debug_session_context() to reflect completed migration
CREATE OR REPLACE FUNCTION public.debug_session_context()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  auth_uid uuid;
  jwt_data jsonb;
  profile_data record;
  membership_count integer;
BEGIN
  -- Get basic auth info
  SELECT auth.uid() INTO auth_uid;
  SELECT auth.jwt() INTO jwt_data;
  
  -- Get profile info
  SELECT * INTO profile_data
  FROM profiles 
  WHERE user_id = auth_uid 
  LIMIT 1;
  
  -- Count memberships in organization_members
  SELECT COUNT(*) INTO membership_count
  FROM organization_members 
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
      'email', profile_data.email
    ),
    'organization_data', jsonb_build_object(
      'organization_members_count', membership_count,
      'migration_status', 'completed',
      'using_new_structure', true
    ),
    'timestamp', now()
  );
END;
$function$;