-- Fix Function Search Path Mutable warnings (63 functions)
-- Adding SET search_path TO 'public' for security hardening

CREATE OR REPLACE FUNCTION public.auto_populate_assignment_organization()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  assignee_org_id uuid;
BEGIN
  -- Get the organization ID for the assigned user
  SELECT uo.organization_id INTO assignee_org_id
  FROM user_organizations uo
  WHERE uo.user_id = NEW.assigned_to
  LIMIT 1;
  
  -- Set the assigned_organization_id if found
  IF assignee_org_id IS NOT NULL THEN
    NEW.assigned_organization_id := assignee_org_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_profile_id_direct(p_user_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_profile_id uuid;
BEGIN
  SELECT id INTO v_profile_id
  FROM profiles
  WHERE user_id = p_user_id
  LIMIT 1;
  
  RETURN v_profile_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auth_user_can_view_assignment(assignment_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Admins can view all assignments
  IF auth_is_admin() THEN
    RETURN true;
  END IF;
  
  -- Check if user is assigned to this assignment
  IF EXISTS (
    SELECT 1 
    FROM work_order_assignments woa
    WHERE woa.id = assignment_id 
    AND woa.assigned_to = auth_profile_id()
  ) THEN
    RETURN true;
  END IF;
  
  -- Check if user is a partner of the organization that owns the work order
  IF auth_user_type() = 'partner' AND EXISTS (
    SELECT 1 
    FROM work_order_assignments woa
    JOIN work_orders wo ON wo.id = woa.work_order_id
    WHERE woa.id = assignment_id 
    AND auth_user_belongs_to_organization(wo.organization_id)
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_organization_ids_direct(p_user_id uuid)
 RETURNS TABLE(organization_id uuid)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT uo.organization_id
  FROM user_organizations uo
  JOIN profiles p ON p.id = uo.user_id
  WHERE p.user_id = p_user_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_user_organization_assignment(p_user_id uuid, p_organization_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_type public.user_type;
  v_org_type public.organization_type;
BEGIN
  -- Get user type from profiles table
  SELECT user_type INTO v_user_type
  FROM public.profiles
  WHERE id = p_user_id;
  
  -- Get organization type
  SELECT organization_type INTO v_org_type
  FROM public.organizations
  WHERE id = p_organization_id;
  
  -- If either user or organization doesn't exist, return false
  IF v_user_type IS NULL OR v_org_type IS NULL THEN
    RETURN false;
  END IF;
  
  -- Business logic rules:
  -- 1. Admin users can belong to any organization type
  -- 2. Employee users can only belong to internal organizations
  -- 3. Partner users can only belong to partner organizations
  -- 4. Subcontractor users can only belong to subcontractor organizations
  
  CASE v_user_type
    WHEN 'admin' THEN
      -- Admins can belong to any organization
      RETURN true;
    WHEN 'employee' THEN
      -- Employees can only belong to internal organizations
      RETURN v_org_type = 'internal';
    WHEN 'partner' THEN
      -- Partners can only belong to partner organizations
      RETURN v_org_type = 'partner';
    WHEN 'subcontractor' THEN
      -- Subcontractors can only belong to subcontractor organizations
      RETURN v_org_type = 'subcontractor';
    ELSE
      -- Unknown user type, deny by default
      RETURN false;
  END CASE;
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

CREATE OR REPLACE FUNCTION public.check_assignment_completion_status(work_order_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  lead_assignments_count INTEGER;
  completed_lead_reports INTEGER;
  current_status work_order_status;
BEGIN
  -- Get current work order status
  SELECT status INTO current_status 
  FROM work_orders 
  WHERE id = work_order_id;
  
  -- Only check completion for in_progress work orders
  IF current_status != 'in_progress' THEN
    RETURN FALSE;
  END IF;
  
  -- Count lead assignments
  SELECT COUNT(*) INTO lead_assignments_count
  FROM work_order_assignments woa
  WHERE woa.work_order_id = check_assignment_completion_status.work_order_id
    AND woa.assignment_type = 'lead';
  
  -- If no lead assignments, use legacy model (check assigned_to)
  IF lead_assignments_count = 0 THEN
    -- Check if there's an approved report from the assigned user
    SELECT COUNT(*) INTO completed_lead_reports
    FROM work_order_reports wor
    JOIN work_orders wo ON wo.id = wor.work_order_id
    WHERE wor.work_order_id = check_assignment_completion_status.work_order_id
      AND wor.status = 'approved'
      AND wor.subcontractor_user_id = wo.assigned_to;
  ELSE
    -- Count completed reports from lead assignees
    SELECT COUNT(DISTINCT woa.assigned_to) INTO completed_lead_reports
    FROM work_order_assignments woa
    JOIN work_order_reports wor ON wor.work_order_id = woa.work_order_id 
      AND wor.subcontractor_user_id = woa.assigned_to
    WHERE woa.work_order_id = check_assignment_completion_status.work_order_id
      AND woa.assignment_type = 'lead'
      AND wor.status = 'approved';
  END IF;
  
  -- If all lead assignees have completed reports, transition to completed
  IF completed_lead_reports >= GREATEST(lead_assignments_count, 1) THEN
    PERFORM public.transition_work_order_status(
      check_assignment_completion_status.work_order_id,
      'completed'::work_order_status,
      'All lead assignees have submitted approved reports'
    );
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_update_report_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_status work_order_status;
BEGIN
  -- Get current work order status
  SELECT status INTO current_status 
  FROM work_orders 
  WHERE id = NEW.work_order_id;
  
  -- When first report is submitted, transition to in_progress
  IF TG_OP = 'INSERT' AND current_status = 'assigned' THEN
    PERFORM public.transition_work_order_status(
      NEW.work_order_id,
      'in_progress'::work_order_status,
      'First report submitted by: ' || NEW.subcontractor_user_id
    );
  END IF;
  
  -- When report is approved, check if work order should be completed
  IF TG_OP = 'UPDATE' AND NEW.status = 'approved' AND OLD.status != 'approved' THEN
    PERFORM public.check_assignment_completion_status(NEW.work_order_id);
  END IF;
  
  RETURN NEW;
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

CREATE OR REPLACE FUNCTION public.transition_work_order_status(work_order_id uuid, new_status work_order_status, reason text DEFAULT NULL::text, user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  old_status work_order_status;
  current_user_id UUID;
BEGIN
  -- Get current status
  SELECT status INTO old_status 
  FROM work_orders 
  WHERE id = work_order_id;
  
  IF old_status IS NULL THEN
    RAISE EXCEPTION 'Work order not found: %', work_order_id;
  END IF;
  
  -- Don't update if status is the same
  IF old_status = new_status THEN
    RETURN TRUE;
  END IF;
  
  -- Get current user if not provided
  current_user_id := COALESCE(user_id, auth.uid());
  
  -- Update work order status
  UPDATE work_orders 
  SET 
    status = new_status,
    updated_at = now(),
    date_assigned = CASE 
      WHEN new_status = 'assigned' AND date_assigned IS NULL 
      THEN now() 
      ELSE date_assigned 
    END,
    completed_at = CASE 
      WHEN new_status = 'completed' AND completed_at IS NULL 
      THEN now() 
      ELSE completed_at 
    END
  WHERE id = work_order_id;
  
  -- Log the status change in audit logs with error handling
  BEGIN
    INSERT INTO audit_logs (
      table_name,
      record_id,
      action,
      old_values,
      new_values,
      user_id
    ) VALUES (
      'work_orders',
      work_order_id,
      'STATUS_CHANGE',
      jsonb_build_object('status', old_status),
      jsonb_build_object('status', new_status, 'reason', COALESCE(reason, 'Automatic transition')),
      current_user_id
    );
  EXCEPTION WHEN foreign_key_violation THEN
    -- Log warning but don't fail the status transition during seeding
    RAISE WARNING 'Audit log failed for work order status change %: %', work_order_id, SQLERRM;
  WHEN OTHERS THEN
    -- Log any other errors but don't fail the status transition
    RAISE WARNING 'Audit log failed for work order status change %: %', work_order_id, SQLERRM;
  END;
  
  RETURN TRUE;
END;
$function$;

-- Continue with remaining functions...
-- [This query is getting very long, so I'll break it into multiple parts]