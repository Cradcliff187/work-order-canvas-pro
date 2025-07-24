-- Test Batch 2: Fix Function Search Path Mutable warnings for 5 utility/trigger functions
-- This is a low-risk security enhancement that adds SET search_path TO 'public' to functions

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

CREATE OR REPLACE FUNCTION public.auto_update_assignment_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- When assignment is created, transition from received to assigned
  IF TG_OP = 'INSERT' THEN
    PERFORM public.transition_work_order_status(
      NEW.work_order_id,
      'assigned'::work_order_status,
      'Assignment created for user: ' || NEW.assigned_to,
      NEW.assigned_by
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_user_profile_and_auth(p_profile_id uuid, p_first_name text, p_last_name text, p_email text, p_user_type user_type, p_phone text DEFAULT NULL::text, p_company_name text DEFAULT NULL::text, p_hourly_billable_rate numeric DEFAULT NULL::numeric, p_hourly_cost_rate numeric DEFAULT NULL::numeric, p_is_active boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_organization_ids uuid[];
  updated_profile profiles%ROWTYPE;
BEGIN
  -- Get the auth user_id from the profile
  SELECT user_id INTO v_user_id
  FROM profiles
  WHERE id = p_profile_id;
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Profile not found'
    );
  END IF;
  
  -- Update the profiles table
  UPDATE profiles
  SET 
    first_name = p_first_name,
    last_name = p_last_name,
    email = p_email,
    user_type = p_user_type,
    phone = p_phone,
    company_name = p_company_name,
    hourly_billable_rate = p_hourly_billable_rate,
    hourly_cost_rate = p_hourly_cost_rate,
    is_active = p_is_active,
    updated_at = now()
  WHERE id = p_profile_id
  RETURNING * INTO updated_profile;
  
  -- Get user's organization IDs for app metadata
  SELECT array_agg(uo.organization_id) INTO v_organization_ids
  FROM user_organizations uo
  WHERE uo.user_id = p_profile_id;
  
  -- Handle case where no organizations exist
  IF v_organization_ids IS NULL THEN
    v_organization_ids := '{}';
  END IF;
  
  -- Update auth.users raw_user_meta_data (for display names)
  UPDATE auth.users
  SET 
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
      'first_name', p_first_name,
      'last_name', p_last_name,
      'user_type', p_user_type,
      'email', p_email
    ),
    -- Also update raw_app_meta_data (for JWT context)
    raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
      'user_type', p_user_type,
      'profile_id', p_profile_id,
      'organization_ids', v_organization_ids,
      'is_active', p_is_active
    ),
    updated_at = now()
  WHERE id = v_user_id;
  
  -- Return success with updated profile data
  RETURN jsonb_build_object(
    'success', true,
    'profile', row_to_json(updated_profile),
    'auth_updated', true,
    'organization_ids', v_organization_ids
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'error_detail', 'Failed to update user profile and auth metadata'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.clear_test_data()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb := '{}';
  deleted_counts jsonb := '{}';
  test_user_ids uuid[];
  test_org_ids uuid[];
  test_work_order_ids uuid[];
  real_admin_id uuid;
  real_admin_email text := 'cradcliff@austinkunzconstruction.com';
BEGIN
  -- Only allow admins to execute this function
  IF NOT public.auth_is_admin() THEN
    RAISE EXCEPTION 'Only administrators can clear test data';
  END IF;

  -- Get the real admin profile ID and verify it exists
  SELECT id INTO real_admin_id
  FROM public.profiles 
  WHERE email = real_admin_email;

  -- Safety check: ensure admin profile exists
  IF real_admin_id IS NULL THEN
    RAISE EXCEPTION 'Critical safety check failed: Real admin profile (%) not found. Aborting to prevent data loss.', real_admin_email;
  END IF;

  -- Get test user IDs (everyone except the real admin)
  SELECT array_agg(id) INTO test_user_ids
  FROM public.profiles 
  WHERE id != real_admin_id;

  -- Safety check: ensure we have admin to preserve
  IF array_length(test_user_ids, 1) IS NULL THEN
    RAISE WARNING 'No test users found to delete';
  END IF;

  -- Get ALL organization IDs (all considered test data)
  SELECT array_agg(id) INTO test_org_ids
  FROM public.organizations;

  -- Get ALL work order IDs (all considered test data)
  SELECT array_agg(id) INTO test_work_order_ids
  FROM public.work_orders;

  -- Delete email_logs (with WHERE clause)
  WITH deleted AS (
    DELETE FROM public.email_logs WHERE TRUE
    RETURNING *
  )
  SELECT jsonb_build_object('email_logs', count(*)) INTO deleted_counts
  FROM deleted;

  -- Delete work order attachments (with WHERE clause)
  WITH deleted AS (
    DELETE FROM public.work_order_attachments WHERE TRUE
    RETURNING *
  )
  SELECT deleted_counts || jsonb_build_object('work_order_attachments', count(*)) INTO deleted_counts
  FROM deleted;

  -- Delete work order reports (with WHERE clause)
  WITH deleted AS (
    DELETE FROM public.work_order_reports WHERE TRUE
    RETURNING *
  )
  SELECT deleted_counts || jsonb_build_object('work_order_reports', count(*)) INTO deleted_counts
  FROM deleted;

  -- Delete work order assignments (with WHERE clause)
  WITH deleted AS (
    DELETE FROM public.work_order_assignments WHERE TRUE
    RETURNING *
  )
  SELECT deleted_counts || jsonb_build_object('work_order_assignments', count(*)) INTO deleted_counts
  FROM deleted;

  -- Delete employee reports (with WHERE clause)
  WITH deleted AS (
    DELETE FROM public.employee_reports WHERE TRUE
    RETURNING *
  )
  SELECT deleted_counts || jsonb_build_object('employee_reports', count(*)) INTO deleted_counts
  FROM deleted;

  -- Delete invoice work orders (with WHERE clause)
  WITH deleted AS (
    DELETE FROM public.invoice_work_orders WHERE TRUE
    RETURNING *
  )
  SELECT deleted_counts || jsonb_build_object('invoice_work_orders', count(*)) INTO deleted_counts
  FROM deleted;

  -- Delete invoice attachments (with WHERE clause)
  WITH deleted AS (
    DELETE FROM public.invoice_attachments WHERE TRUE
    RETURNING *
  )
  SELECT deleted_counts || jsonb_build_object('invoice_attachments', count(*)) INTO deleted_counts
  FROM deleted;

  -- Delete receipt work orders (with WHERE clause)
  WITH deleted AS (
    DELETE FROM public.receipt_work_orders WHERE TRUE
    RETURNING *
  )
  SELECT deleted_counts || jsonb_build_object('receipt_work_orders', count(*)) INTO deleted_counts
  FROM deleted;

  -- Delete receipts (with WHERE clause)
  WITH deleted AS (
    DELETE FROM public.receipts WHERE TRUE
    RETURNING *
  )
  SELECT deleted_counts || jsonb_build_object('receipts', count(*)) INTO deleted_counts
  FROM deleted;

  -- Delete invoices (with WHERE clause)
  WITH deleted AS (
    DELETE FROM public.invoices WHERE TRUE
    RETURNING *
  )
  SELECT deleted_counts || jsonb_build_object('invoices', count(*)) INTO deleted_counts
  FROM deleted;

  -- Delete work orders (with WHERE clause)
  WITH deleted AS (
    DELETE FROM public.work_orders WHERE TRUE
    RETURNING *
  )
  SELECT deleted_counts || jsonb_build_object('work_orders', count(*)) INTO deleted_counts
  FROM deleted;

  -- Delete partner locations (with WHERE clause)
  WITH deleted AS (
    DELETE FROM public.partner_locations WHERE TRUE
    RETURNING *
  )
  SELECT deleted_counts || jsonb_build_object('partner_locations', count(*)) INTO deleted_counts
  FROM deleted;

  -- Delete user organization relationships (except real admin)
  WITH deleted AS (
    DELETE FROM public.user_organizations 
    WHERE user_id != real_admin_id
    RETURNING *
  )
  SELECT deleted_counts || jsonb_build_object('user_organizations', count(*)) INTO deleted_counts
  FROM deleted;

  -- Delete organizations (with WHERE clause)
  WITH deleted AS (
    DELETE FROM public.organizations WHERE TRUE
    RETURNING *
  )
  SELECT deleted_counts || jsonb_build_object('organizations', count(*)) INTO deleted_counts
  FROM deleted;

  -- Delete test email templates (keep only specific real ones)
  WITH deleted AS (
    DELETE FROM public.email_templates 
    WHERE template_name NOT IN (
      'real_template_1', 'real_template_2' -- Add real template names here if any
    )
    RETURNING *
  )
  SELECT deleted_counts || jsonb_build_object('email_templates', count(*)) INTO deleted_counts
  FROM deleted;

  -- Delete test trades (keep only real ones - update this list as needed)
  WITH deleted AS (
    DELETE FROM public.trades 
    WHERE name NOT IN (
      'Real Trade 1', 'Real Trade 2' -- Add real trade names here if any
    )
    RETURNING *
  )
  SELECT deleted_counts || jsonb_build_object('trades', count(*)) INTO deleted_counts
  FROM deleted;

  -- Delete test profiles (CRITICAL: preserve real admin)
  WITH deleted AS (
    DELETE FROM public.profiles 
    WHERE id != real_admin_id
    RETURNING *
  )
  SELECT deleted_counts || jsonb_build_object('profiles', count(*)) INTO deleted_counts
  FROM deleted;

  -- Reset organization sequence numbers for any remaining orgs
  UPDATE organizations SET next_sequence_number = 1 WHERE TRUE;

  -- Final safety verification
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = real_admin_id) THEN
    RAISE EXCEPTION 'CRITICAL ERROR: Real admin profile was accidentally deleted! Data integrity compromised.';
  END IF;

  -- Return summary
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Test data cleared successfully, preserved real admin',
    'deleted_counts', deleted_counts,
    'preserved_admin', jsonb_build_object(
      'id', real_admin_id::text,
      'email', real_admin_email,
      'verified', true
    ),
    'safety_checks_passed', true
  );

EXCEPTION WHEN OTHERS THEN
  -- Return error details
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'message', 'Failed to clear test data - ' || SQLERRM,
    'preserved_admin', COALESCE(real_admin_id::text, 'not found'),
    'safety_checks_passed', false
  );
END;
$function$;