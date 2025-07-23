-- Phase 1: Fix Server-Side JWT Metadata Sync
-- This migration fixes the core JWT metadata synchronization issues

-- Step 1: Update sync_auth_user_metadata function to include all required metadata
DROP FUNCTION IF EXISTS public.sync_auth_user_metadata();

CREATE OR REPLACE FUNCTION public.sync_auth_user_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_organization_ids uuid[];
BEGIN
  -- Get organization IDs for this user
  SELECT array_agg(uo.organization_id) INTO v_organization_ids
  FROM user_organizations uo
  WHERE uo.user_id = NEW.id;
  
  -- Handle case where no organizations exist
  IF v_organization_ids IS NULL THEN
    v_organization_ids := '{}';
  END IF;
  
  -- Update auth.users app_metadata with complete user context
  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object(
      'user_type', NEW.user_type,
      'profile_id', NEW.id,
      'organization_ids', v_organization_ids,
      'is_active', NEW.is_active
    )
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$function$;

-- Step 2: Create function to sync metadata when organizations change
CREATE OR REPLACE FUNCTION public.sync_user_organization_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id uuid;
  v_user_type user_type;
  v_is_active boolean;
  v_organization_ids uuid[];
BEGIN
  -- Determine which user to update based on trigger operation
  IF TG_OP = 'DELETE' THEN
    v_user_id := OLD.user_id;
  ELSE
    v_user_id := NEW.user_id;
  END IF;
  
  -- Get user profile info
  SELECT user_id, user_type, is_active INTO v_user_id, v_user_type, v_is_active
  FROM profiles
  WHERE id = v_user_id;
  
  -- Get updated organization IDs
  SELECT array_agg(uo.organization_id) INTO v_organization_ids
  FROM user_organizations uo
  WHERE uo.user_id = v_user_id;
  
  -- Handle case where no organizations exist
  IF v_organization_ids IS NULL THEN
    v_organization_ids := '{}';
  END IF;
  
  -- Update auth.users app_metadata
  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object(
      'user_type', v_user_type,
      'profile_id', v_user_id,
      'organization_ids', v_organization_ids,
      'is_active', v_is_active
    )
  WHERE id = v_user_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Step 3: Recreate profile trigger to fire on both INSERT and UPDATE
DROP TRIGGER IF EXISTS sync_user_type_to_auth ON public.profiles;

CREATE TRIGGER sync_user_type_to_auth
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_auth_user_metadata();

-- Step 4: Create trigger for user_organizations changes
DROP TRIGGER IF EXISTS sync_user_org_metadata ON public.user_organizations;

CREATE TRIGGER sync_user_org_metadata
  AFTER INSERT OR UPDATE OR DELETE ON public.user_organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_organization_metadata();

-- Step 5: Create function to initialize missing JWT metadata for existing users
CREATE OR REPLACE FUNCTION public.initialize_all_user_jwt_metadata()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_updated_count integer := 0;
  v_user_record record;
  v_organization_ids uuid[];
BEGIN
  -- Loop through all profiles and sync their metadata
  FOR v_user_record IN 
    SELECT p.id, p.user_id, p.user_type, p.is_active
    FROM profiles p
  LOOP
    -- Get organization IDs for this user
    SELECT array_agg(uo.organization_id) INTO v_organization_ids
    FROM user_organizations uo
    WHERE uo.user_id = v_user_record.id;
    
    -- Handle case where no organizations exist
    IF v_organization_ids IS NULL THEN
      v_organization_ids := '{}';
    END IF;
    
    -- Update auth.users app_metadata
    UPDATE auth.users
    SET raw_app_meta_data = 
      COALESCE(raw_app_meta_data, '{}'::jsonb) || 
      jsonb_build_object(
        'user_type', v_user_record.user_type,
        'profile_id', v_user_record.id,
        'organization_ids', v_organization_ids,
        'is_active', v_user_record.is_active
      )
    WHERE id = v_user_record.user_id;
    
    v_updated_count := v_updated_count + 1;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'users_updated', v_updated_count,
    'message', 'JWT metadata initialized for all users'
  );
END;
$function$;

-- Step 6: Create function callable from client to trigger metadata sync
CREATE OR REPLACE FUNCTION public.trigger_jwt_metadata_sync(p_user_id uuid DEFAULT auth.uid())
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_profile_id uuid;
  v_user_type user_type;
  v_is_active boolean;
  v_organization_ids uuid[];
BEGIN
  -- Get profile info
  SELECT id, user_type, is_active INTO v_profile_id, v_user_type, v_is_active
  FROM profiles
  WHERE user_id = p_user_id;
  
  IF v_profile_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Profile not found'
    );
  END IF;
  
  -- Get organization IDs
  SELECT array_agg(uo.organization_id) INTO v_organization_ids
  FROM user_organizations uo
  WHERE uo.user_id = v_profile_id;
  
  -- Handle case where no organizations exist
  IF v_organization_ids IS NULL THEN
    v_organization_ids := '{}';
  END IF;
  
  -- Update auth.users app_metadata
  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object(
      'user_type', v_user_type,
      'profile_id', v_profile_id,
      'organization_ids', v_organization_ids,
      'is_active', v_is_active
    )
  WHERE id = p_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'metadata', jsonb_build_object(
      'user_type', v_user_type,
      'profile_id', v_profile_id,
      'organization_ids', v_organization_ids,
      'is_active', v_is_active
    )
  );
END;
$function$;

-- Step 7: Initialize metadata for all existing users
SELECT public.initialize_all_user_jwt_metadata();