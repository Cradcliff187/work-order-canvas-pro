-- Fix Critical Database Functions Blocking Login
-- Remove all user_type references and replace with organization-based logic

-- 1. Fix get_current_user_type() function to use organization-based approach
CREATE OR REPLACE FUNCTION public.get_current_user_type()
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  profile_id uuid;
  org_type organization_type;
BEGIN
  -- Get current user's profile ID
  SELECT auth_profile_id_safe() INTO profile_id;
  
  IF profile_id IS NULL THEN
    RETURN 'unauthenticated';
  END IF;
  
  -- Check for internal organization membership (admin/employee)
  SELECT o.organization_type INTO org_type
  FROM organization_members om
  JOIN organizations o ON o.id = om.organization_id
  WHERE om.user_id = profile_id
  AND o.organization_type = 'internal'
  AND o.is_active = true
  LIMIT 1;
  
  IF org_type = 'internal' THEN
    -- Check if admin role
    IF EXISTS (
      SELECT 1 FROM organization_members om
      JOIN organizations o ON o.id = om.organization_id
      WHERE om.user_id = profile_id
      AND o.organization_type = 'internal'
      AND om.role = 'admin'
    ) THEN
      RETURN 'admin';
    ELSE
      RETURN 'employee';
    END IF;
  END IF;
  
  -- Check for partner organization membership
  SELECT o.organization_type INTO org_type
  FROM organization_members om
  JOIN organizations o ON o.id = om.organization_id
  WHERE om.user_id = profile_id
  AND o.organization_type = 'partner'
  AND o.is_active = true
  LIMIT 1;
  
  IF org_type = 'partner' THEN
    RETURN 'partner';
  END IF;
  
  -- Check for subcontractor organization membership
  SELECT o.organization_type INTO org_type
  FROM organization_members om
  JOIN organizations o ON o.id = om.organization_id
  WHERE om.user_id = profile_id
  AND o.organization_type = 'subcontractor'
  AND o.is_active = true
  LIMIT 1;
  
  IF org_type = 'subcontractor' THEN
    RETURN 'subcontractor';
  END IF;
  
  -- Default fallback
  RETURN 'user';
END;
$function$;

-- 2. Fix queue_message_notifications() function
CREATE OR REPLACE FUNCTION public.queue_message_notifications()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_work_order RECORD;
  v_sender RECORD;
  v_message_preview TEXT;
  v_dashboard_url TEXT;
  v_context_data jsonb;
BEGIN
  -- Get dashboard URL from system settings
  SELECT COALESCE(
    (SELECT setting_value FROM system_settings WHERE setting_key = 'dashboard_url'),
    'https://workorderportal.lovable.app'
  ) INTO v_dashboard_url;

  -- Get work order details
  SELECT 
    wo.id,
    wo.work_order_number,
    wo.title,
    wo.organization_id,
    o.name as partner_org_name
  INTO v_work_order
  FROM work_orders wo
  JOIN organizations o ON wo.organization_id = o.id
  WHERE wo.id = NEW.work_order_id;
  
  -- Get sender details with organization (removed user_type reference)
  SELECT 
    p.id,
    p.first_name,
    p.last_name,
    p.email,
    get_current_user_type() as user_type,
    COALESCE(o.name, 'Internal Team') as org_name
  INTO v_sender
  FROM profiles p
  LEFT JOIN organization_members om ON p.id = om.user_id
  LEFT JOIN organizations o ON om.organization_id = o.id
  WHERE p.id = NEW.sender_id
  LIMIT 1;
  
  -- Create message preview (max 200 chars)
  v_message_preview := LEFT(NEW.message, 200);
  IF LENGTH(NEW.message) > 200 THEN
    v_message_preview := v_message_preview || '...';
  END IF;
  
  -- Build context data for email processing
  v_context_data := jsonb_build_object(
    -- Message details
    'message_id', NEW.id,
    'is_internal', NEW.is_internal,
    'sender_id', NEW.sender_id,
    
    -- Email template variables
    'sender_name', CONCAT(v_sender.first_name, ' ', v_sender.last_name),
    'sender_organization', v_sender.org_name,
    'sender_email', v_sender.email,
    'sender_type', v_sender.user_type,
    
    -- Work order details
    'work_order_id', v_work_order.id,
    'work_order_number', v_work_order.work_order_number,
    'work_order_title', v_work_order.title,
    'partner_organization_id', v_work_order.organization_id,
    'partner_organization_name', v_work_order.partner_org_name,
    
    -- Message content
    'message_preview', v_message_preview,
    'message_full_length', LENGTH(NEW.message),
    
    -- System
    'dashboard_url', v_dashboard_url
  );
  
  -- Queue notification for this message
  INSERT INTO email_queue (
    template_name,
    record_id,
    record_type,
    context_data,
    status,
    retry_count,
    created_at
  )
  VALUES (
    'work_order_new_message',
    NEW.id,
    'work_order_message',
    v_context_data,
    'pending',
    0,
    NOW()
  );
  
  RETURN NEW;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block message creation
    RAISE WARNING 'Failed to queue notification for message %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$;

-- 3. Fix sync_user_organization_metadata() function  
CREATE OR REPLACE FUNCTION public.sync_user_organization_metadata()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_auth_user_id uuid;
  v_user_type text;
  v_is_active boolean;
  v_organization_ids uuid[];
BEGIN
  -- Determine which user to update based on trigger operation
  IF TG_OP = 'DELETE' THEN
    v_user_id := OLD.user_id;
  ELSE
    v_user_id := NEW.user_id;
  END IF;
  
  -- Get user profile info and auth user_id
  SELECT user_id, is_active INTO v_auth_user_id, v_is_active
  FROM profiles
  WHERE id = v_user_id;
  
  -- Get user type using organization-based function
  SELECT get_current_user_type() INTO v_user_type;
  
  -- Get updated organization IDs from organization_members
  SELECT array_agg(om.organization_id) INTO v_organization_ids
  FROM organization_members om
  WHERE om.user_id = v_user_id;
  
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
  WHERE id = v_auth_user_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 4. Fix trigger_jwt_metadata_sync() function
CREATE OR REPLACE FUNCTION public.trigger_jwt_metadata_sync(p_user_id uuid DEFAULT auth.uid())
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_profile_id uuid;
  v_is_active boolean;
  v_organization_ids uuid[];
  v_organization_types text[];
  v_primary_role text;
BEGIN
  -- Get profile info
  SELECT id, is_active INTO v_profile_id, v_is_active
  FROM profiles
  WHERE user_id = p_user_id;
  
  IF v_profile_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Profile not found'
    );
  END IF;
  
  -- Get organization IDs from organization_members
  SELECT 
    array_agg(om.organization_id),
    array_agg(o.organization_type::text)
  INTO v_organization_ids, v_organization_types
  FROM organization_members om
  JOIN organizations o ON o.id = om.organization_id
  WHERE om.user_id = v_profile_id;
  
  -- Handle case where no organizations exist
  IF v_organization_ids IS NULL THEN
    v_organization_ids := '{}';
    v_organization_types := '{}';
  END IF;
  
  -- Determine primary role from organization membership
  v_primary_role := get_current_user_type();
  
  -- Update auth.users app_metadata with organization-based data
  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object(
      'user_type', v_primary_role,
      'profile_id', v_profile_id,
      'organization_ids', v_organization_ids,
      'organization_types', v_organization_types,
      'is_active', v_is_active
    )
  WHERE id = p_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'metadata', jsonb_build_object(
      'user_type', v_primary_role,
      'profile_id', v_profile_id,
      'organization_ids', v_organization_ids,
      'organization_types', v_organization_types,
      'is_active', v_is_active
    )
  );
END;
$function$;