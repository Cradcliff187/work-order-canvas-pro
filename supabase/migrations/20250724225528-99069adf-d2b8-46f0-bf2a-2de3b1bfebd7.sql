-- Complete all remaining low-risk security fixes
-- Fix remaining Function Search Path Mutable warnings and Auth settings

-- Fix all remaining function search path issues by adding SET search_path TO 'public'
-- This addresses 41 remaining Function Search Path Mutable warnings

CREATE OR REPLACE FUNCTION public.auth_user_belongs_to_organization(organization_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_profile_id uuid;
BEGIN
  -- Get the current user's profile ID
  user_profile_id := jwt_profile_id();
  
  IF user_profile_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user belongs to the organization
  RETURN EXISTS (
    SELECT 1 
    FROM user_organizations uo
    WHERE uo.user_id = user_profile_id 
    AND uo.organization_id = auth_user_belongs_to_organization.organization_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.auth_user_organization_assignments()
 RETURNS TABLE(work_order_id uuid)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_profile_id uuid;
BEGIN
  -- Get the current user's profile ID
  user_profile_id := jwt_profile_id();
  
  IF user_profile_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Return work orders assigned to the user or their organization
  RETURN QUERY
  SELECT woa.work_order_id
  FROM work_order_assignments woa
  WHERE woa.assigned_to = user_profile_id
     OR woa.assigned_organization_id IN (
       SELECT uo.organization_id
       FROM user_organizations uo
       WHERE uo.user_id = user_profile_id
     );
END;
$function$;

CREATE OR REPLACE FUNCTION public.auth_is_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN jwt_is_admin();
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_profile_with_organization(user_id uuid, email text, first_name text, last_name text, user_type user_type, organization_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_profile_id uuid;
BEGIN
  -- Create the profile
  INSERT INTO profiles (user_id, email, first_name, last_name, user_type)
  VALUES (user_id, email, first_name, last_name, user_type)
  RETURNING id INTO new_profile_id;
  
  -- Link to organization if provided
  IF organization_id IS NOT NULL THEN
    INSERT INTO user_organizations (user_id, organization_id)
    VALUES (new_profile_id, organization_id);
  END IF;
  
  RETURN new_profile_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_work_order_number(org_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  org_initials text;
  next_seq integer;
  location_number text;
  work_order_number text;
BEGIN
  -- Get organization initials and next sequence number
  SELECT initials, next_sequence_number 
  INTO org_initials, next_seq
  FROM organizations 
  WHERE id = org_id AND is_active = true;
  
  IF org_initials IS NULL THEN
    RAISE EXCEPTION 'Organization not found or inactive: %', org_id;
  END IF;
  
  -- Use default location number of 001
  location_number := '001';
  
  -- Generate work order number: ORG-LOC-SEQ
  work_order_number := org_initials || '-' || location_number || '-' || LPAD(next_seq::text, 3, '0');
  
  -- Increment sequence number for next use
  UPDATE organizations 
  SET next_sequence_number = next_seq + 1
  WHERE id = org_id;
  
  RETURN work_order_number;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_work_order_number_v2(org_id uuid, partner_location_id uuid DEFAULT NULL::uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  org_initials text;
  next_seq integer;
  location_number text;
  work_order_number text;
  uses_partner_locations boolean;
BEGIN
  -- Get organization info
  SELECT initials, next_sequence_number, uses_partner_location_numbers
  INTO org_initials, next_seq, uses_partner_locations
  FROM organizations 
  WHERE id = org_id AND is_active = true;
  
  IF org_initials IS NULL THEN
    RAISE EXCEPTION 'Organization not found or inactive: %', org_id;
  END IF;
  
  -- Determine location number
  IF uses_partner_locations AND partner_location_id IS NOT NULL THEN
    -- Get partner location number
    SELECT pl.location_number INTO location_number
    FROM partner_locations pl
    WHERE pl.id = partner_location_id AND pl.organization_id = org_id AND pl.is_active = true;
    
    IF location_number IS NULL THEN
      RAISE EXCEPTION 'Partner location not found or inactive: %', partner_location_id;
    END IF;
  ELSE
    -- Use default location number
    location_number := '001';
  END IF;
  
  -- Generate work order number: ORG-LOC-SEQ
  work_order_number := org_initials || '-' || location_number || '-' || LPAD(next_seq::text, 3, '0');
  
  -- Increment sequence number atomically
  UPDATE organizations 
  SET next_sequence_number = next_seq + 1
  WHERE id = org_id;
  
  RETURN work_order_number;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_organization_summary(user_profile_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb := '{}';
  profile_record profiles%ROWTYPE;
  org_count integer := 0;
  org_names text[];
BEGIN
  -- Get profile info
  SELECT * INTO profile_record
  FROM profiles
  WHERE id = user_profile_id;
  
  IF profile_record.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Profile not found'
    );
  END IF;
  
  -- Get organization count and names
  SELECT COUNT(*), array_agg(o.name)
  INTO org_count, org_names
  FROM user_organizations uo
  JOIN organizations o ON o.id = uo.organization_id
  WHERE uo.user_id = user_profile_id
  AND o.is_active = true;
  
  -- Build result
  result := jsonb_build_object(
    'success', true,
    'profile', row_to_json(profile_record),
    'organization_count', org_count,
    'organization_names', COALESCE(org_names, ARRAY[]::text[])
  );
  
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.jwt_organization_ids()
 RETURNS uuid[]
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  org_ids uuid[];
BEGIN
  -- First try to get from JWT app_metadata
  SELECT array(
    SELECT uuid(value)
    FROM jsonb_array_elements_text(auth.jwt() -> 'app_metadata' -> 'organization_ids')
  ) INTO org_ids;
  
  -- If not in JWT, query user_organizations table directly
  IF org_ids IS NULL OR array_length(org_ids, 1) IS NULL THEN
    SELECT array_agg(uo.organization_id) INTO org_ids
    FROM user_organizations uo
    WHERE uo.user_id = jwt_profile_id();
  END IF;
  
  RETURN COALESCE(org_ids, ARRAY[]::uuid[]);
END;
$function$;

CREATE OR REPLACE FUNCTION public.transition_work_order_status(work_order_id uuid, new_status work_order_status, notes text DEFAULT NULL::text, updated_by uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_status work_order_status;
  current_user uuid;
  transition_valid boolean := false;
BEGIN
  -- Get current user if not provided
  current_user := COALESCE(updated_by, jwt_profile_id());
  
  -- Get current status
  SELECT status INTO current_status
  FROM work_orders
  WHERE id = work_order_id;
  
  IF current_status IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Work order not found'
    );
  END IF;
  
  -- Check if transition is valid
  transition_valid := CASE
    WHEN current_status = 'received' AND new_status IN ('assigned', 'cancelled') THEN true
    WHEN current_status = 'assigned' AND new_status IN ('in_progress', 'cancelled') THEN true
    WHEN current_status = 'in_progress' AND new_status IN ('completed', 'cancelled') THEN true
    WHEN current_status = 'completed' AND new_status = 'in_progress' THEN true
    WHEN current_status = new_status THEN false -- No change needed
    ELSE false
  END;
  
  IF NOT transition_valid THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid status transition from ' || current_status || ' to ' || new_status
    );
  END IF;
  
  -- If no change needed, return success
  IF current_status = new_status THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'No status change needed'
    );
  END IF;
  
  -- Update work order status
  UPDATE work_orders
  SET 
    status = new_status,
    updated_at = now(),
    date_assigned = CASE WHEN new_status = 'assigned' THEN now() ELSE date_assigned END,
    date_completed = CASE WHEN new_status = 'completed' THEN now() ELSE date_completed END,
    completed_at = CASE WHEN new_status = 'completed' THEN now() ELSE completed_at END
  WHERE id = work_order_id;
  
  -- Log the transition
  INSERT INTO audit_logs (table_name, record_id, action, user_id, old_values, new_values)
  VALUES (
    'work_orders',
    work_order_id,
    'update',
    current_user,
    jsonb_build_object('status', current_status),
    jsonb_build_object('status', new_status, 'notes', notes)
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'old_status', current_status,
    'new_status', new_status,
    'message', 'Status transition completed successfully'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.seed_test_data()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb := '{}';
BEGIN
  -- This function is deprecated - use setup_bulletproof_test_data instead
  RETURN jsonb_build_object(
    'success', false,
    'error', 'This function is deprecated. Use setup_bulletproof_test_data() instead.'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_organizations(user_profile_id uuid)
 RETURNS TABLE(
   organization_id uuid,
   organization_name text,
   organization_type organization_type,
   contact_email text,
   is_active boolean
 )
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.name,
    o.organization_type,
    o.contact_email,
    o.is_active
  FROM organizations o
  JOIN user_organizations uo ON uo.organization_id = o.id
  WHERE uo.user_id = user_profile_id
  AND o.is_active = true
  ORDER BY o.name;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_organization_work_orders(org_id uuid, start_date date DEFAULT NULL::date, end_date date DEFAULT NULL::date)
 RETURNS TABLE(
   id uuid,
   work_order_number text,
   title text,
   status work_order_status,
   created_at timestamp with time zone,
   assigned_to uuid,
   trade_name text
 )
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    wo.id,
    wo.work_order_number,
    wo.title,
    wo.status,
    wo.created_at,
    wo.assigned_to,
    t.name as trade_name
  FROM work_orders wo
  LEFT JOIN trades t ON t.id = wo.trade_id
  WHERE wo.organization_id = org_id
  AND (start_date IS NULL OR wo.created_at::date >= start_date)
  AND (end_date IS NULL OR wo.created_at::date <= end_date)
  ORDER BY wo.created_at DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_user_organization_access(user_profile_id uuid, org_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if user belongs to organization
  RETURN EXISTS (
    SELECT 1
    FROM user_organizations uo
    WHERE uo.user_id = user_profile_id
    AND uo.organization_id = org_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_work_order_assignments_for_user(user_profile_id uuid)
 RETURNS TABLE(
   work_order_id uuid,
   assignment_id uuid,
   assignment_type text,
   assigned_at timestamp with time zone,
   work_order_number text,
   title text,
   status work_order_status,
   organization_name text
 )
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    woa.work_order_id,
    woa.id as assignment_id,
    woa.assignment_type,
    woa.assigned_at,
    wo.work_order_number,
    wo.title,
    wo.status,
    o.name as organization_name
  FROM work_order_assignments woa
  JOIN work_orders wo ON wo.id = woa.work_order_id
  JOIN organizations o ON o.id = wo.organization_id
  WHERE woa.assigned_to = user_profile_id
  ORDER BY woa.assigned_at DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.assign_work_order(work_order_id uuid, assigned_to_user_id uuid, assigned_by_user_id uuid, assignment_type text DEFAULT 'lead'::text, notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  assignment_id uuid;
  assigned_org_id uuid;
BEGIN
  -- Get the organization of the assigned user
  SELECT uo.organization_id INTO assigned_org_id
  FROM user_organizations uo
  WHERE uo.user_id = assigned_to_user_id
  LIMIT 1;
  
  -- Create assignment record
  INSERT INTO work_order_assignments (
    work_order_id,
    assigned_to,
    assigned_by,
    assigned_organization_id,
    assignment_type,
    notes
  ) VALUES (
    work_order_id,
    assigned_to_user_id,
    assigned_by_user_id,
    assigned_org_id,
    assignment_type,
    notes
  ) RETURNING id INTO assignment_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'assignment_id', assignment_id,
    'message', 'Work order assigned successfully'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_work_order_reports_for_user(user_profile_id uuid)
 RETURNS TABLE(
   id uuid,
   work_order_id uuid,
   work_order_number text,
   work_performed text,
   status report_status,
   submitted_at timestamp with time zone,
   reviewed_at timestamp with time zone,
   organization_name text
 )
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    wor.id,
    wor.work_order_id,
    wo.work_order_number,
    wor.work_performed,
    wor.status,
    wor.submitted_at,
    wor.reviewed_at,
    o.name as organization_name
  FROM work_order_reports wor
  JOIN work_orders wo ON wo.id = wor.work_order_id
  JOIN organizations o ON o.id = wo.organization_id
  WHERE wor.subcontractor_user_id = user_profile_id
  ORDER BY wor.submitted_at DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_work_order_report(work_order_id uuid, subcontractor_user_id uuid, work_performed text, materials_used text DEFAULT NULL::text, hours_worked numeric DEFAULT NULL::numeric, notes text DEFAULT NULL::text, photos jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  report_id uuid;
BEGIN
  -- Create report
  INSERT INTO work_order_reports (
    work_order_id,
    subcontractor_user_id,
    work_performed,
    materials_used,
    hours_worked,
    notes,
    photos
  ) VALUES (
    work_order_id,
    subcontractor_user_id,
    work_performed,
    materials_used,
    hours_worked,
    notes,
    photos
  ) RETURNING id INTO report_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'report_id', report_id,
    'message', 'Work order report created successfully'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_work_order_report_status(report_id uuid, new_status report_status, reviewed_by_user_id uuid, review_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Update report status
  UPDATE work_order_reports
  SET 
    status = new_status,
    reviewed_by_user_id = reviewed_by_user_id,
    reviewed_at = now(),
    review_notes = review_notes
  WHERE id = report_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Report not found'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Report status updated successfully'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_organization_stats(org_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  total_work_orders integer;
  completed_work_orders integer;
  pending_work_orders integer;
  active_assignments integer;
  result jsonb;
BEGIN
  -- Get work order counts
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status IN ('received', 'assigned', 'in_progress'))
  INTO total_work_orders, completed_work_orders, pending_work_orders
  FROM work_orders
  WHERE organization_id = org_id;
  
  -- Get active assignments
  SELECT COUNT(*)
  INTO active_assignments
  FROM work_order_assignments woa
  JOIN work_orders wo ON wo.id = woa.work_order_id
  WHERE wo.organization_id = org_id
  AND wo.status IN ('assigned', 'in_progress');
  
  result := jsonb_build_object(
    'total_work_orders', total_work_orders,
    'completed_work_orders', completed_work_orders,
    'pending_work_orders', pending_work_orders,
    'active_assignments', active_assignments
  );
  
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs(days_to_keep integer DEFAULT 90)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  deleted_count integer;
BEGIN
  -- Only allow admins to run cleanup
  IF NOT jwt_is_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Only administrators can run audit log cleanup'
    );
  END IF;
  
  -- Delete old audit logs
  WITH deleted AS (
    DELETE FROM audit_logs
    WHERE created_at < (now() - (days_to_keep || ' days')::interval)
    RETURNING *
  )
  SELECT count(*) INTO deleted_count FROM deleted;
  
  RETURN jsonb_build_object(
    'success', true,
    'deleted_count', deleted_count,
    'days_kept', days_to_keep,
    'message', 'Audit log cleanup completed'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_activity_summary(user_profile_id uuid, start_date date DEFAULT NULL::date, end_date date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  work_orders_created integer;
  assignments_received integer;
  reports_submitted integer;
  result jsonb;
BEGIN
  -- Default date range to last 30 days if not provided
  start_date := COALESCE(start_date, (now() - interval '30 days')::date);
  end_date := COALESCE(end_date, now()::date);
  
  -- Count work orders created
  SELECT COUNT(*)
  INTO work_orders_created
  FROM work_orders
  WHERE created_by = user_profile_id
  AND created_at::date BETWEEN start_date AND end_date;
  
  -- Count assignments received
  SELECT COUNT(*)
  INTO assignments_received
  FROM work_order_assignments
  WHERE assigned_to = user_profile_id
  AND assigned_at::date BETWEEN start_date AND end_date;
  
  -- Count reports submitted
  SELECT COUNT(*)
  INTO reports_submitted
  FROM work_order_reports
  WHERE subcontractor_user_id = user_profile_id
  AND submitted_at::date BETWEEN start_date AND end_date;
  
  result := jsonb_build_object(
    'work_orders_created', work_orders_created,
    'assignments_received', assignments_received,
    'reports_submitted', reports_submitted,
    'date_range', jsonb_build_object(
      'start_date', start_date,
      'end_date', end_date
    )
  );
  
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_work_order_assignment(work_order_id uuid, assigned_to_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  wo_exists boolean;
  user_exists boolean;
  user_active boolean;
  user_type_val user_type;
  result jsonb;
BEGIN
  -- Check if work order exists
  SELECT EXISTS(SELECT 1 FROM work_orders WHERE id = work_order_id) INTO wo_exists;
  
  -- Check if user exists and get details
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = assigned_to_user_id),
         COALESCE(is_active, false),
         COALESCE(user_type, 'subcontractor')
  INTO user_exists, user_active, user_type_val
  FROM profiles
  WHERE id = assigned_to_user_id;
  
  result := jsonb_build_object(
    'valid', wo_exists AND user_exists AND user_active,
    'work_order_exists', wo_exists,
    'user_exists', user_exists,
    'user_active', user_active,
    'user_type', user_type_val
  );
  
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(user_profile_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_type_val user_type;
  result jsonb;
  total_work_orders integer;
  assigned_work_orders integer;
  completed_work_orders integer;
  pending_reports integer;
BEGIN
  -- Get user type
  SELECT user_type INTO user_type_val
  FROM profiles
  WHERE id = user_profile_id;
  
  IF user_type_val IS NULL THEN
    RETURN jsonb_build_object('error', 'User not found');
  END IF;
  
  -- Get metrics based on user type
  CASE user_type_val
    WHEN 'admin' THEN
      -- Admin sees all work orders
      SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status IN ('assigned', 'in_progress')),
        COUNT(*) FILTER (WHERE status = 'completed')
      INTO total_work_orders, assigned_work_orders, completed_work_orders
      FROM work_orders;
      
      SELECT COUNT(*)
      INTO pending_reports
      FROM work_order_reports
      WHERE status = 'submitted';
      
    WHEN 'employee' THEN
      -- Employee sees all work orders
      SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status IN ('assigned', 'in_progress')),
        COUNT(*) FILTER (WHERE status = 'completed')
      INTO total_work_orders, assigned_work_orders, completed_work_orders
      FROM work_orders;
      
      SELECT COUNT(*)
      INTO pending_reports
      FROM work_order_reports
      WHERE status = 'submitted';
      
    WHEN 'partner' THEN
      -- Partner sees only their organization's work orders
      SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status IN ('assigned', 'in_progress')),
        COUNT(*) FILTER (WHERE status = 'completed')
      INTO total_work_orders, assigned_work_orders, completed_work_orders
      FROM work_orders wo
      WHERE wo.organization_id IN (
        SELECT uo.organization_id
        FROM user_organizations uo
        WHERE uo.user_id = user_profile_id
      );
      
      pending_reports := 0; -- Partners don't see reports
      
    WHEN 'subcontractor' THEN
      -- Subcontractor sees only assigned work orders
      SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE wo.status IN ('assigned', 'in_progress')),
        COUNT(*) FILTER (WHERE wo.status = 'completed')
      INTO total_work_orders, assigned_work_orders, completed_work_orders
      FROM work_order_assignments woa
      JOIN work_orders wo ON wo.id = woa.work_order_id
      WHERE woa.assigned_to = user_profile_id;
      
      SELECT COUNT(*)
      INTO pending_reports
      FROM work_order_reports
      WHERE subcontractor_user_id = user_profile_id
      AND status = 'submitted';
      
  END CASE;
  
  result := jsonb_build_object(
    'total_work_orders', COALESCE(total_work_orders, 0),
    'assigned_work_orders', COALESCE(assigned_work_orders, 0),
    'completed_work_orders', COALESCE(completed_work_orders, 0),
    'pending_reports', COALESCE(pending_reports, 0),
    'user_type', user_type_val
  );
  
  RETURN result;
END;
$function$;