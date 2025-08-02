-- Phase 4/7: Update Database Triggers & Metadata Sync Functions

-- Update sync_user_organization_metadata() to use organization_members
CREATE OR REPLACE FUNCTION public.sync_user_organization_metadata(target_user_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_profile record;
  v_organization_ids uuid[];
  v_organization_types text[];
  v_result jsonb;
BEGIN
  -- Use provided user_id or try to get from auth context
  v_user_id := COALESCE(target_user_id, auth.uid());
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'No user ID provided and no auth context');
  END IF;
  
  -- Get user profile
  SELECT id, is_active, email
  INTO v_profile
  FROM profiles
  WHERE user_id = v_user_id;
  
  IF v_profile IS NULL THEN
    RETURN jsonb_build_object('error', 'Profile not found for user: ' || v_user_id::text);
  END IF;
  
  -- Get organization memberships from organization_members table
  SELECT 
    array_agg(DISTINCT om.organization_id),
    array_agg(DISTINCT o.organization_type::text)
  INTO v_organization_ids, v_organization_types
  FROM organization_members om
  JOIN organizations o ON o.id = om.organization_id
  WHERE om.user_id = v_profile.id;
  
  -- Handle case where no organizations exist
  IF v_organization_ids IS NULL THEN
    v_organization_ids := '{}';
    v_organization_types := '{}';
  END IF;
  
  -- Update auth metadata
  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
    'profile_id', v_profile.id,
    'organization_ids', COALESCE(v_organization_ids, ARRAY[]::uuid[]),
    'organization_types', COALESCE(v_organization_types, ARRAY[]::text[]),
    'is_active', v_profile.is_active,
    'email', v_profile.email
  )
  WHERE id = v_user_id;
  
  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'profile_id', v_profile.id,
    'organization_count', COALESCE(array_length(v_organization_ids, 1), 0),
    'organization_types', v_organization_types
  );
END;
$function$;

-- Create audit trigger for organization_members table
CREATE OR REPLACE FUNCTION public.audit_trigger_organization_members()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  profile_id uuid;
BEGIN
  -- Get current user profile ID
  SELECT auth_profile_id_safe() INTO profile_id;
  
  -- Insert audit log
  INSERT INTO audit_logs (
    table_name,
    record_id,
    action,
    old_values,
    new_values,
    user_id
  ) VALUES (
    'organization_members',
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    profile_id
  );
  
  -- Trigger JWT metadata sync for organization membership changes
  IF TG_OP IN ('INSERT', 'UPDATE', 'DELETE') THEN
    PERFORM trigger_jwt_metadata_sync(
      CASE 
        WHEN TG_OP = 'DELETE' THEN (SELECT user_id FROM profiles WHERE id = OLD.user_id)
        ELSE (SELECT user_id FROM profiles WHERE id = NEW.user_id)
      END
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Create the audit trigger for organization_members
DROP TRIGGER IF EXISTS audit_trigger_organization_members ON organization_members;
CREATE TRIGGER audit_trigger_organization_members
  AFTER INSERT OR UPDATE OR DELETE ON organization_members
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_organization_members();

-- Update initialize_all_user_jwt_metadata() to use organization_members
CREATE OR REPLACE FUNCTION public.initialize_all_user_jwt_metadata()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_count integer := 0;
  success_count integer := 0;
  error_count integer := 0;
  current_user record;
  sync_result jsonb;
BEGIN
  -- Get all users who have profiles
  FOR current_user IN
    SELECT DISTINCT p.user_id, p.id as profile_id
    FROM profiles p
    WHERE p.user_id IS NOT NULL
  LOOP
    user_count := user_count + 1;
    
    -- Sync metadata for this user
    SELECT trigger_jwt_metadata_sync(current_user.user_id) INTO sync_result;
    
    IF (sync_result->>'success')::boolean THEN
      success_count := success_count + 1;
    ELSE
      error_count := error_count + 1;
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'JWT metadata initialization completed',
    'total_users', user_count,
    'successful_syncs', success_count,
    'failed_syncs', error_count,
    'timestamp', now()
  );
END;
$function$;