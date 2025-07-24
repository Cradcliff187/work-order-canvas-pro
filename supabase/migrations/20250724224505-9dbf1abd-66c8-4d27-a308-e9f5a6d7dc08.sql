-- Fix remaining Function Search Path Mutable warnings and Auth settings
-- Part 3: Remaining functions and auth configuration

-- Continue with JWT functions
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

-- Update remaining trigger functions
CREATE OR REPLACE FUNCTION public.trigger_work_order_assigned()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only trigger when status changes to 'assigned'
  IF TG_OP = 'UPDATE' AND 
     OLD.status != 'assigned' AND 
     NEW.status = 'assigned' THEN
    
    PERFORM public.call_send_email_trigger(
      'work_order_assigned',
      NEW.id,
      'work_order'
    );
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the main transaction
  RAISE WARNING 'Work order assigned trigger failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trigger_report_submitted()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only trigger for actual new reports
  IF TG_OP = 'INSERT' THEN
    PERFORM public.call_send_email_trigger(
      'report_submitted',
      NEW.id,
      'work_order_report'
    );
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the main transaction
  RAISE WARNING 'Report submitted trigger failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trigger_report_reviewed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only trigger when status changes to approved or rejected
  IF TG_OP = 'UPDATE' AND 
     OLD.status = 'submitted' AND 
     NEW.status IN ('approved', 'rejected') THEN
    
    PERFORM public.call_send_email_trigger(
      'report_reviewed',
      NEW.id,
      'work_order_report'
    );
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the main transaction
  RAISE WARNING 'Report reviewed trigger failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$function$;

-- Update JWT metadata sync functions
CREATE OR REPLACE FUNCTION public.trigger_jwt_metadata_sync(p_user_id uuid DEFAULT auth.uid())
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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

CREATE OR REPLACE FUNCTION public.sync_user_organization_metadata()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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

CREATE OR REPLACE FUNCTION public.initialize_all_user_jwt_metadata()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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

-- Continue with remaining functions...
CREATE OR REPLACE FUNCTION public.fix_existing_test_user_organizations()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  partner1_id uuid;
  sub1_id uuid;
  employee1_id uuid;
  org_abc_id uuid;
  org_pipes_id uuid;
  org_internal_id uuid;
  user_orgs_fixed integer := 0;
  temp_count integer;
BEGIN
  -- Get existing test user profile IDs
  SELECT id INTO partner1_id FROM profiles WHERE email = 'partner1@workorderpro.test';
  SELECT id INTO sub1_id FROM profiles WHERE email = 'sub1@workorderpro.test';
  SELECT id INTO employee1_id FROM profiles WHERE email = 'employee1@workorderpro.test';

  -- Get organization IDs
  SELECT id INTO org_abc_id FROM organizations WHERE name = 'ABC Property Management';
  SELECT id INTO org_pipes_id FROM organizations WHERE name = 'Pipes & More Plumbing';
  SELECT id INTO org_internal_id FROM organizations WHERE name = 'WorkOrderPro Internal';

  -- Create missing user-organization relationships
  IF partner1_id IS NOT NULL AND org_abc_id IS NOT NULL THEN
    INSERT INTO user_organizations (user_id, organization_id) 
    VALUES (partner1_id, org_abc_id)
    ON CONFLICT (user_id, organization_id) DO NOTHING;
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    user_orgs_fixed := user_orgs_fixed + temp_count;
  END IF;

  IF sub1_id IS NOT NULL AND org_pipes_id IS NOT NULL THEN
    INSERT INTO user_organizations (user_id, organization_id) 
    VALUES (sub1_id, org_pipes_id)
    ON CONFLICT (user_id, organization_id) DO NOTHING;
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    user_orgs_fixed := user_orgs_fixed + temp_count;
  END IF;

  IF employee1_id IS NOT NULL AND org_internal_id IS NOT NULL THEN
    INSERT INTO user_organizations (user_id, organization_id) 
    VALUES (employee1_id, org_internal_id)
    ON CONFLICT (user_id, organization_id) DO NOTHING;
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    user_orgs_fixed := user_orgs_fixed + temp_count;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Fixed user-organization relationships',
    'user_organizations_fixed', user_orgs_fixed,
    'users_found', jsonb_build_object(
      'partner1', partner1_id IS NOT NULL,
      'sub1', sub1_id IS NOT NULL,
      'employee1', employee1_id IS NOT NULL
    ),
    'organizations_found', jsonb_build_object(
      'abc', org_abc_id IS NOT NULL,
      'pipes', org_pipes_id IS NOT NULL,
      'internal', org_internal_id IS NOT NULL
    )
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'message', 'Failed to fix user organizations: ' || SQLERRM
  );
END;
$function$;