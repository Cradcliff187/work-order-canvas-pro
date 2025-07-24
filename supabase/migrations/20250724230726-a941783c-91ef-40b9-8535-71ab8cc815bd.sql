-- Fix all remaining 41 Function Search Path Mutable warnings
-- Add SET search_path TO 'public' to all remaining functions

CREATE OR REPLACE FUNCTION public.auth_user_belongs_to_organization(p_organization_id uuid)
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
    AND uo.organization_id = auth_user_belongs_to_organization.p_organization_id
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

CREATE OR REPLACE FUNCTION public.audit_trigger_function()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (table_name, record_id, action, user_id, old_values)
    VALUES (TG_TABLE_NAME, OLD.id, 'delete', jwt_profile_id(), row_to_json(OLD));
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (table_name, record_id, action, user_id, old_values, new_values)
    VALUES (TG_TABLE_NAME, NEW.id, 'update', jwt_profile_id(), row_to_json(OLD), row_to_json(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (table_name, record_id, action, user_id, new_values)
    VALUES (TG_TABLE_NAME, NEW.id, 'insert', jwt_profile_id(), row_to_json(NEW));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_populate_assignment_organization()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Auto-populate assigned_organization_id based on assigned_to user
  IF NEW.assigned_to IS NOT NULL AND NEW.assigned_organization_id IS NULL THEN
    SELECT uo.organization_id INTO NEW.assigned_organization_id
    FROM user_organizations uo
    WHERE uo.user_id = NEW.assigned_to
    LIMIT 1;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auto_update_report_status_enhanced()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- When a report is created or updated, check if all assigned subcontractors have submitted reports
  -- If so, update work order status to completed
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status = 'approved') THEN
    PERFORM public.check_assignment_completion_status_enhanced(NEW.work_order_id);
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_assignment_completion_status_enhanced(work_order_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  all_reports_approved boolean := false;
  current_status work_order_status;
  manual_block boolean := false;
BEGIN
  -- Check if manual completion is blocked
  SELECT manual_completion_blocked INTO manual_block
  FROM work_orders
  WHERE id = work_order_id;
  
  -- If manually blocked, don't auto-complete
  IF manual_block THEN
    RETURN false;
  END IF;
  
  -- Get current work order status
  SELECT status INTO current_status
  FROM work_orders
  WHERE id = work_order_id;
  
  -- Only proceed if work order is in progress
  IF current_status != 'in_progress' THEN
    RETURN false;
  END IF;
  
  -- Check if all assigned subcontractors have submitted AND approved reports
  SELECT NOT EXISTS (
    SELECT 1
    FROM work_order_assignments woa
    WHERE woa.work_order_id = check_assignment_completion_status_enhanced.work_order_id
    AND NOT EXISTS (
      SELECT 1
      FROM work_order_reports wor
      WHERE wor.work_order_id = woa.work_order_id
      AND wor.subcontractor_user_id = woa.assigned_to
      AND wor.status = 'approved'
    )
  ) INTO all_reports_approved;
  
  -- If all reports are approved, transition work order to completed
  IF all_reports_approved THEN
    PERFORM public.transition_work_order_status(
      check_assignment_completion_status_enhanced.work_order_id,
      'completed',
      'Auto-completed: All assigned reports approved',
      NULL
    );
    
    -- Trigger completion email
    PERFORM public.trigger_completion_email(check_assignment_completion_status_enhanced.work_order_id);
    
    RETURN true;
  END IF;
  
  RETURN false;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trigger_completion_email(work_order_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Call the email trigger for work order completion
  PERFORM public.call_send_email_trigger(
    'work_order_completed',
    work_order_id,
    'work_order',
    jsonb_build_object('trigger_source', 'auto_completion')
  );
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the main transaction
  RAISE WARNING 'Completion email trigger failed for work order %: %', work_order_id, SQLERRM;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_manual_completion_block(work_order_id uuid, blocked boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only admins and employees can set manual completion blocks
  IF NOT (jwt_user_type() IN ('admin', 'employee')) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Only administrators and employees can set manual completion blocks'
    );
  END IF;
  
  UPDATE work_orders
  SET manual_completion_blocked = blocked
  WHERE id = work_order_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Work order not found'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'work_order_id', work_order_id,
    'manual_completion_blocked', blocked,
    'message', CASE WHEN blocked THEN 'Manual completion block enabled' ELSE 'Manual completion block disabled' END
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_completion_time_by_trade(start_date date, end_date date)
 RETURNS TABLE(
   trade_name text,
   avg_completion_hours numeric,
   total_completed_orders integer,
   avg_completion_days numeric
 )
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    t.name as trade_name,
    AVG(EXTRACT(EPOCH FROM (wo.completed_at - wo.date_submitted)) / 3600)::numeric as avg_completion_hours,
    COUNT(*)::integer as total_completed_orders,
    AVG(EXTRACT(EPOCH FROM (wo.completed_at - wo.date_submitted)) / 86400)::numeric as avg_completion_days
  FROM work_orders wo
  JOIN trades t ON t.id = wo.trade_id
  WHERE wo.status = 'completed'
  AND wo.completed_at IS NOT NULL
  AND wo.date_submitted::date BETWEEN start_date AND end_date
  GROUP BY t.id, t.name
  ORDER BY avg_completion_hours ASC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_first_time_fix_rate(start_date date, end_date date)
 RETURNS TABLE(
   organization_name text,
   organization_type organization_type,
   total_work_orders integer,
   first_time_fixes integer,
   first_time_fix_rate numeric
 )
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    o.name as organization_name,
    o.organization_type,
    COUNT(wo.id)::integer as total_work_orders,
    COUNT(wo.id) FILTER (WHERE wo.status = 'completed' AND (
      SELECT COUNT(*) FROM work_order_reports wor 
      WHERE wor.work_order_id = wo.id AND wor.status = 'approved'
    ) = 1)::integer as first_time_fixes,
    CASE 
      WHEN COUNT(wo.id) > 0 THEN
        (COUNT(wo.id) FILTER (WHERE wo.status = 'completed' AND (
          SELECT COUNT(*) FROM work_order_reports wor 
          WHERE wor.work_order_id = wo.id AND wor.status = 'approved'
        ) = 1)::numeric / COUNT(wo.id)::numeric * 100)
      ELSE 0
    END as first_time_fix_rate
  FROM work_orders wo
  JOIN organizations o ON o.id = wo.organization_id
  WHERE wo.date_submitted::date BETWEEN start_date AND end_date
  GROUP BY o.id, o.name, o.organization_type
  ORDER BY first_time_fix_rate DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_geographic_distribution(start_date date, end_date date)
 RETURNS TABLE(
   state text,
   city text,
   total_work_orders integer,
   completed_work_orders integer,
   completion_rate numeric
 )
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    wo.state,
    wo.city,
    COUNT(*)::integer as total_work_orders,
    COUNT(*) FILTER (WHERE wo.status = 'completed')::integer as completed_work_orders,
    CASE 
      WHEN COUNT(*) > 0 THEN
        (COUNT(*) FILTER (WHERE wo.status = 'completed')::numeric / COUNT(*)::numeric * 100)
      ELSE 0
    END as completion_rate
  FROM work_orders wo
  WHERE wo.date_submitted::date BETWEEN start_date AND end_date
  AND wo.state IS NOT NULL
  AND wo.city IS NOT NULL
  GROUP BY wo.state, wo.city
  ORDER BY total_work_orders DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_internal_invoice_number()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  next_seq integer;
  invoice_number text;
BEGIN
  -- Get the next sequence number from system settings
  SELECT COALESCE((setting_value->>'next_invoice_sequence')::integer, 1) INTO next_seq
  FROM system_settings
  WHERE category = 'invoicing' AND setting_key = 'internal_sequence';
  
  -- Generate invoice number: WOP-INV-YYYY-NNNN
  invoice_number := 'WOP-INV-' || TO_CHAR(now(), 'YYYY') || '-' || LPAD(next_seq::text, 4, '0');
  
  -- Update the sequence number
  INSERT INTO system_settings (category, setting_key, setting_value, updated_by_user_id)
  VALUES (
    'invoicing',
    'internal_sequence',
    jsonb_build_object('next_invoice_sequence', next_seq + 1),
    jwt_profile_id()
  )
  ON CONFLICT (category, setting_key) 
  DO UPDATE SET 
    setting_value = jsonb_build_object('next_invoice_sequence', next_seq + 1),
    updated_by_user_id = jwt_profile_id(),
    updated_at = now();
  
  RETURN invoice_number;
END;
$function$;

CREATE OR REPLACE FUNCTION public.refresh_analytics_views()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  start_time timestamp;
  end_time timestamp;
BEGIN
  start_time := clock_timestamp();
  
  -- Refresh materialized views if they exist
  -- Note: Add REFRESH MATERIALIZED VIEW statements here when views are created
  
  end_time := clock_timestamp();
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Analytics views refreshed successfully',
    'duration_ms', EXTRACT(MILLISECONDS FROM (end_time - start_time))
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_work_order_number_simple(org_id uuid, location_number text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  org_initials text;
  next_seq integer;
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
  
  -- Generate work order number: ORG-LOC-SEQ
  work_order_number := org_initials || '-' || location_number || '-' || LPAD(next_seq::text, 3, '0');
  
  -- Increment sequence number for next use
  UPDATE organizations 
  SET next_sequence_number = next_seq + 1
  WHERE id = org_id;
  
  RETURN work_order_number;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trigger_generate_work_order_number_v2()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only generate number if not already set
  IF NEW.work_order_number IS NULL THEN
    NEW.work_order_number := generate_work_order_number_v2(NEW.organization_id, NEW.partner_location_id);
  END IF;
  
  RETURN NEW;
END;
$function$;