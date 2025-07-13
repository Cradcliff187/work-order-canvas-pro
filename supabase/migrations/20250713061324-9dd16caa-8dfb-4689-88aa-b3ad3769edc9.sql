-- Create missing admin profile and fix data management functions
-- Date: 2025-07-13 - Fix missing admin profile issue

-- First, ensure the real admin profile exists
INSERT INTO public.profiles (
  id,
  user_id,
  email,
  first_name,
  last_name,
  user_type,
  is_active,
  is_employee,
  hourly_cost_rate,
  hourly_billable_rate,
  created_at,
  updated_at
) VALUES (
  '35f38c56-5485-4ab3-92f9-6d089e12c729'::uuid,
  '2e2832d0-72aa-44df-b7a7-5e7b61a4bd5a'::uuid,
  'cradcliff@austinkunzconstruction.com',
  'Chad',
  'Radcliff',
  'admin'::user_type,
  true,
  true,
  75.00,
  125.00,
  now(),
  now()
)
ON CONFLICT (user_id) 
DO UPDATE SET 
  email = EXCLUDED.email,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  user_type = EXCLUDED.user_type,
  is_active = EXCLUDED.is_active,
  is_employee = EXCLUDED.is_employee,
  hourly_cost_rate = EXCLUDED.hourly_cost_rate,
  hourly_billable_rate = EXCLUDED.hourly_billable_rate,
  updated_at = now();

-- Update clear_test_data function with better safety checks
CREATE OR REPLACE FUNCTION public.clear_test_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
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

  -- Delete email_logs
  WITH deleted AS (
    DELETE FROM public.email_logs 
    RETURNING *
  )
  SELECT jsonb_build_object('email_logs', count(*)) INTO deleted_counts
  FROM deleted;

  -- Delete work order attachments
  WITH deleted AS (
    DELETE FROM public.work_order_attachments 
    RETURNING *
  )
  SELECT deleted_counts || jsonb_build_object('work_order_attachments', count(*)) INTO deleted_counts
  FROM deleted;

  -- Delete work order reports
  WITH deleted AS (
    DELETE FROM public.work_order_reports 
    RETURNING *
  )
  SELECT deleted_counts || jsonb_build_object('work_order_reports', count(*)) INTO deleted_counts
  FROM deleted;

  -- Delete work order assignments
  WITH deleted AS (
    DELETE FROM public.work_order_assignments 
    RETURNING *
  )
  SELECT deleted_counts || jsonb_build_object('work_order_assignments', count(*)) INTO deleted_counts
  FROM deleted;

  -- Delete employee reports
  WITH deleted AS (
    DELETE FROM public.employee_reports 
    RETURNING *
  )
  SELECT deleted_counts || jsonb_build_object('employee_reports', count(*)) INTO deleted_counts
  FROM deleted;

  -- Delete invoice work orders
  WITH deleted AS (
    DELETE FROM public.invoice_work_orders 
    RETURNING *
  )
  SELECT deleted_counts || jsonb_build_object('invoice_work_orders', count(*)) INTO deleted_counts
  FROM deleted;

  -- Delete invoice attachments
  WITH deleted AS (
    DELETE FROM public.invoice_attachments 
    RETURNING *
  )
  SELECT deleted_counts || jsonb_build_object('invoice_attachments', count(*)) INTO deleted_counts
  FROM deleted;

  -- Delete receipt work orders
  WITH deleted AS (
    DELETE FROM public.receipt_work_orders 
    RETURNING *
  )
  SELECT deleted_counts || jsonb_build_object('receipt_work_orders', count(*)) INTO deleted_counts
  FROM deleted;

  -- Delete receipts
  WITH deleted AS (
    DELETE FROM public.receipts 
    RETURNING *
  )
  SELECT deleted_counts || jsonb_build_object('receipts', count(*)) INTO deleted_counts
  FROM deleted;

  -- Delete invoices
  WITH deleted AS (
    DELETE FROM public.invoices 
    RETURNING *
  )
  SELECT deleted_counts || jsonb_build_object('invoices', count(*)) INTO deleted_counts
  FROM deleted;

  -- Delete work orders
  WITH deleted AS (
    DELETE FROM public.work_orders 
    RETURNING *
  )
  SELECT deleted_counts || jsonb_build_object('work_orders', count(*)) INTO deleted_counts
  FROM deleted;

  -- Delete partner locations
  WITH deleted AS (
    DELETE FROM public.partner_locations 
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

  -- Delete organizations
  WITH deleted AS (
    DELETE FROM public.organizations 
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
  UPDATE organizations SET next_sequence_number = 1;

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

-- Update seed_test_data function to ensure admin profile exists
CREATE OR REPLACE FUNCTION public.seed_test_data()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result json;
  v_user_id uuid;
  real_admin_profile_id uuid := '35f38c56-5485-4ab3-92f9-6d089e12c729'::uuid;
  real_admin_user_id uuid := '2e2832d0-72aa-44df-b7a7-5e7b61a4bd5a'::uuid;
  org_internal_id uuid;
  org_abc_id uuid;
  org_xyz_id uuid;
  org_premium_id uuid;
  trade_plumbing_id uuid;
  trade_electrical_id uuid;
  trade_hvac_id uuid;
  trade_carpentry_id uuid;
  trade_painting_id uuid;
  trade_general_id uuid;
  trade_landscaping_id uuid;
  wo1_id uuid;
  wo2_id uuid;
  wo3_id uuid;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  -- Verify user is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = v_user_id 
    AND user_type = 'admin'
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Unauthorized: Admin access required'
    );
  END IF;

  -- Ensure the real admin profile exists (safety measure)
  INSERT INTO profiles (
    id, 
    user_id, 
    email, 
    first_name, 
    last_name, 
    user_type, 
    is_active, 
    is_employee, 
    hourly_cost_rate, 
    hourly_billable_rate
  ) VALUES (
    real_admin_profile_id,
    real_admin_user_id,
    'cradcliff@austinkunzconstruction.com',
    'Chad',
    'Radcliff',
    'admin',
    true,
    true,
    75.00,
    125.00
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    user_type = EXCLUDED.user_type,
    is_active = EXCLUDED.is_active,
    is_employee = EXCLUDED.is_employee,
    hourly_cost_rate = EXCLUDED.hourly_cost_rate,
    hourly_billable_rate = EXCLUDED.hourly_billable_rate,
    updated_at = now();

  -- Generate UUIDs for test data
  org_internal_id := gen_random_uuid();
  org_abc_id := gen_random_uuid();
  org_xyz_id := gen_random_uuid();
  org_premium_id := gen_random_uuid();
  trade_plumbing_id := gen_random_uuid();
  trade_electrical_id := gen_random_uuid();
  trade_hvac_id := gen_random_uuid();
  trade_carpentry_id := gen_random_uuid();
  trade_painting_id := gen_random_uuid();
  trade_general_id := gen_random_uuid();
  trade_landscaping_id := gen_random_uuid();
  wo1_id := gen_random_uuid();
  wo2_id := gen_random_uuid();
  wo3_id := gen_random_uuid();

  -- Insert test organizations
  INSERT INTO organizations (id, name, contact_email, organization_type, initials, is_active) VALUES
    (org_internal_id, 'WorkOrderPro Internal', 'admin@workorderpro.com', 'internal', 'WOP', true),
    (org_abc_id, 'ABC Property Management', 'contact@abc-property.com', 'partner', 'ABC', true),
    (org_xyz_id, 'XYZ Commercial Properties', 'info@xyz-commercial.com', 'partner', 'XYZ', true),
    (org_premium_id, 'Premium Facilities Group', 'support@premiumfacilities.com', 'partner', 'PFG', true);

  -- Insert test trades
  INSERT INTO trades (id, name, description, is_active) VALUES
    (trade_plumbing_id, 'Plumbing', 'Water systems, pipes, fixtures, and drainage', true),
    (trade_electrical_id, 'Electrical', 'Electrical systems, wiring, and fixtures', true),
    (trade_hvac_id, 'HVAC', 'Heating, ventilation, and air conditioning systems', true),
    (trade_carpentry_id, 'Carpentry', 'Wood construction, repair, and finishing', true),
    (trade_painting_id, 'Painting', 'Interior and exterior painting services', true),
    (trade_general_id, 'General Maintenance', 'General facility maintenance and repairs', true),
    (trade_landscaping_id, 'Landscaping', 'Grounds maintenance and landscaping services', true);

  -- Insert email templates
  INSERT INTO email_templates (template_name, subject, html_content, text_content, is_active) VALUES
    ('work_order_created', 'New Work Order: {{work_order_number}}', '<h2>New Work Order Created</h2><p>Work Order: <strong>{{work_order_number}}</strong></p>', 'New Work Order Created', true),
    ('work_order_assigned', 'Work Order Assigned: {{work_order_number}}', '<h2>Work Order Assigned</h2><p>You have been assigned work order: <strong>{{work_order_number}}</strong></p>', 'Work Order Assigned', true),
    ('work_order_completed', 'Work Order Completed: {{work_order_number}}', '<h2>Work Order Completed</h2><p>Work order <strong>{{work_order_number}}</strong> has been completed.</p>', 'Work Order Completed', true);

  -- Link real admin to internal organization
  INSERT INTO user_organizations (user_id, organization_id) VALUES
    (real_admin_profile_id, org_internal_id)
  ON CONFLICT (user_id, organization_id) DO NOTHING;

  -- Insert sample work orders
  INSERT INTO work_orders (id, work_order_number, title, description, organization_id, trade_id, status, created_by, date_submitted, store_location, street_address, city, state, zip_code) VALUES
    (wo1_id, 'ABC-001-001', 'Leaky Faucet Repair', 'Kitchen faucet dripping constantly', org_abc_id, trade_plumbing_id, 'received', real_admin_profile_id, now() - interval '5 days', 'ABC Downtown Office', '123 Main Street', 'Downtown', 'CA', '90210'),
    (wo2_id, 'ABC-001-002', 'Electrical Outlet Installation', 'Install 3 new outlets in conference room', org_abc_id, trade_electrical_id, 'received', real_admin_profile_id, now() - interval '3 days', 'ABC Downtown Office', '123 Main Street', 'Downtown', 'CA', '90210'),
    (wo3_id, 'XYZ-101-001', 'HVAC System Maintenance', 'Quarterly maintenance check on main HVAC system', org_xyz_id, trade_hvac_id, 'received', real_admin_profile_id, now() - interval '10 days', 'XYZ Corporate Tower', '321 Business Blvd', 'Corporate', 'NY', '10001');

  RETURN json_build_object(
    'success', true,
    'message', 'Test data seeded successfully with preserved real admin',
    'details', json_build_object(
      'organizations', 4,
      'trades', 7,
      'email_templates', 3,
      'work_orders', 3,
      'real_admin_preserved', true,
      'real_admin_id', real_admin_profile_id::text
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'detail', SQLSTATE
    );
END;
$function$;