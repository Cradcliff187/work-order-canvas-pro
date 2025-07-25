-- Fix all remaining functions with mutable search path warnings
-- Add SET search_path TO 'public' to all functions missing this setting
-- This migration handles parameter conflicts by preserving existing signatures

-- audit_trigger_function
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (table_name, record_id, action, new_values, user_id)
    VALUES (TG_TABLE_NAME, NEW.id, 'create', to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values, user_id)
    VALUES (TG_TABLE_NAME, NEW.id, 'update', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (table_name, record_id, action, old_values, user_id)
    VALUES (TG_TABLE_NAME, OLD.id, 'delete', to_jsonb(OLD), auth.uid());
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

-- generate_internal_invoice_number
CREATE OR REPLACE FUNCTION public.generate_internal_invoice_number()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  seq_num integer;
  invoice_number text;
BEGIN
  -- Get next sequence number
  SELECT COALESCE(MAX(CAST(SUBSTRING(internal_invoice_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO seq_num
  FROM invoices
  WHERE internal_invoice_number ~ '^INV-[0-9]+$';
  
  -- Generate invoice number
  invoice_number := 'INV-' || LPAD(seq_num::text, 6, '0');
  
  RETURN invoice_number;
END;
$function$;

-- generate_work_order_number
CREATE OR REPLACE FUNCTION public.generate_work_order_number(org_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  org_initials text;
  seq_num integer;
  work_order_number text;
BEGIN
  -- Get organization initials
  SELECT initials INTO org_initials
  FROM organizations
  WHERE id = org_id;
  
  IF org_initials IS NULL THEN
    RAISE EXCEPTION 'Organization not found or missing initials: %', org_id;
  END IF;
  
  -- Atomically increment the sequence and get the new value
  UPDATE organizations 
  SET next_sequence_number = COALESCE(next_sequence_number, 1) + 1
  WHERE id = org_id
  RETURNING next_sequence_number - 1 INTO seq_num;
  
  -- Generate work order number
  work_order_number := org_initials || '-' || LPAD(seq_num::text, 3, '0') || '-001';
  
  RETURN work_order_number;
END;
$function$;

-- refresh_analytics_views
CREATE OR REPLACE FUNCTION public.refresh_analytics_views()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- This function can be used to refresh materialized views if we create any
  -- Currently a placeholder for future analytics functionality
  RAISE NOTICE 'Analytics views refreshed at %', now();
END;
$function$;

-- update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- auth_is_admin
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

-- Fix auth_user_belongs_to_organization by dropping and recreating with new parameter name
DROP FUNCTION IF EXISTS public.auth_user_belongs_to_organization(uuid);

CREATE OR REPLACE FUNCTION public.auth_user_belongs_to_organization(organization_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_organizations uo 
    WHERE uo.user_id = jwt_profile_id() 
    AND uo.organization_id = $1
  );
END;
$function$;

-- auth_user_organization_assignments
CREATE OR REPLACE FUNCTION public.auth_user_organization_assignments()
 RETURNS TABLE(work_order_id uuid)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT woa.work_order_id
  FROM work_order_assignments woa
  WHERE woa.assigned_to = jwt_profile_id()
     OR woa.assigned_organization_id IN (
       SELECT uo.organization_id
       FROM user_organizations uo
       WHERE uo.user_id = jwt_profile_id()
     );
END;
$function$;

-- ensure_single_organization_assignment
CREATE OR REPLACE FUNCTION public.ensure_single_organization_assignment(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  org_count integer;
  user_type user_type;
BEGIN
  -- Get user type
  SELECT u.user_type INTO user_type
  FROM profiles u
  WHERE u.id = p_user_id;
  
  -- Count organizations for this user
  SELECT COUNT(*) INTO org_count
  FROM user_organizations uo
  WHERE uo.user_id = p_user_id;
  
  -- Only enforce single organization for non-admin users
  IF user_type != 'admin' AND org_count > 1 THEN
    -- Keep only the first organization assignment
    DELETE FROM user_organizations
    WHERE user_id = p_user_id
    AND id NOT IN (
      SELECT id
      FROM user_organizations
      WHERE user_id = p_user_id
      ORDER BY created_at ASC
      LIMIT 1
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'organizations_after_cleanup', (
      SELECT COUNT(*) FROM user_organizations WHERE user_id = p_user_id
    )
  );
END;
$function$;

-- get_user_organization_id
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  org_id uuid;
BEGIN
  SELECT uo.organization_id INTO org_id
  FROM user_organizations uo
  WHERE uo.user_id = jwt_profile_id()
  LIMIT 1;
  
  RETURN org_id;
END;
$function$;

-- get_user_organization_ids
CREATE OR REPLACE FUNCTION public.get_user_organization_ids()
 RETURNS uuid[]
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  org_ids uuid[];
BEGIN
  SELECT array_agg(uo.organization_id) INTO org_ids
  FROM user_organizations uo
  WHERE uo.user_id = jwt_profile_id();
  
  RETURN COALESCE(org_ids, ARRAY[]::uuid[]);
END;
$function$;

-- handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO profiles (user_id, email, first_name, last_name, user_type)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'user_type')::user_type, 'subcontractor'::user_type)
  );
  RETURN NEW;
END;
$function$;

-- transition_work_order_status
CREATE OR REPLACE FUNCTION public.transition_work_order_status(p_work_order_id uuid, p_new_status work_order_status, p_notes text DEFAULT NULL::text, p_updated_by uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_status work_order_status;
  valid_transition boolean := false;
  status_date_field text;
  update_query text;
BEGIN
  -- Get current status
  SELECT status INTO current_status
  FROM work_orders
  WHERE id = p_work_order_id;
  
  IF current_status IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Work order not found'
    );
  END IF;
  
  -- Check if transition is valid
  IF current_status = 'received' AND p_new_status = 'assigned' THEN
    valid_transition := true;
    status_date_field := 'date_assigned';
  ELSIF current_status = 'assigned' AND p_new_status = 'in_progress' THEN
    valid_transition := true;
  ELSIF current_status = 'in_progress' AND p_new_status = 'completed' THEN
    valid_transition := true;
    status_date_field := 'date_completed';
  ELSIF current_status = p_new_status THEN
    -- Allow same status (idempotent)
    valid_transition := true;
  END IF;
  
  IF NOT valid_transition THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Invalid status transition from %s to %s', current_status, p_new_status)
    );
  END IF;
  
  -- Build and execute update query
  IF status_date_field IS NOT NULL THEN
    update_query := format('UPDATE work_orders SET status = $1, %I = now(), updated_at = now() WHERE id = $2', status_date_field);
    EXECUTE update_query USING p_new_status, p_work_order_id;
  ELSE
    UPDATE work_orders 
    SET status = p_new_status, updated_at = now()
    WHERE id = p_work_order_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'old_status', current_status,
    'new_status', p_new_status,
    'work_order_id', p_work_order_id
  );
END;
$function$;

-- Fix other remaining functions in smaller batches to avoid conflicts
-- Continue with next batch...