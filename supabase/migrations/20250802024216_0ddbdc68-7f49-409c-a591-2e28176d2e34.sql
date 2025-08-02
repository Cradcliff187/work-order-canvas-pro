-- Phase 6/7: Update test data and development functions to use organization_members

-- Update setup_bulletproof_test_data function to use organization_members with roles
CREATE OR REPLACE FUNCTION public.setup_bulletproof_test_data(admin_user_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_admin_id uuid;
  
  -- Organization IDs
  org_internal_id uuid;
  org_abc_id uuid;
  org_xyz_id uuid;
  org_premium_id uuid;
  org_pipes_id uuid;
  org_sparks_id uuid;
  
  -- Test user profile IDs  
  user_partner1_id uuid;
  user_subcontractor1_id uuid;
  user_employee1_id uuid;
  
  -- Trade IDs
  trade_plumbing_id uuid;
  trade_electrical_id uuid;
  trade_hvac_id uuid;
  trade_general_id uuid;
  
  -- Work order IDs
  wo_ids uuid[5];
  
  -- Counters
  orgs_created integer := 0;
  users_created integer := 0;
  locations_created integer := 0;
  work_orders_created integer := 0;
  assignments_created integer := 0;
  user_orgs_created integer := 0;
  
BEGIN
  -- Use provided admin_user_id or find any admin
  IF admin_user_id IS NOT NULL THEN
    v_admin_id := admin_user_id;
  ELSE
    SELECT id INTO v_admin_id 
    FROM profiles p
    WHERE EXISTS (
      SELECT 1 FROM organization_members om 
      JOIN organizations o ON o.id = om.organization_id 
      WHERE om.user_id = p.id 
      AND o.organization_type = 'internal' 
      AND om.role = 'admin'
    ) LIMIT 1;
  END IF;
  
  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No admin profile found - please ensure at least one admin exists'
    );
  END IF;

  -- Generate UUIDs
  org_internal_id := gen_random_uuid();
  org_abc_id := gen_random_uuid();
  org_xyz_id := gen_random_uuid();
  org_premium_id := gen_random_uuid();
  org_pipes_id := gen_random_uuid();
  org_sparks_id := gen_random_uuid();
  
  user_partner1_id := gen_random_uuid();
  user_subcontractor1_id := gen_random_uuid();
  user_employee1_id := gen_random_uuid();
  
  FOR i IN 1..5 LOOP
    wo_ids[i] := gen_random_uuid();
  END LOOP;

  -- Create trades first (check if they exist)
  IF NOT EXISTS (SELECT 1 FROM trades WHERE name = 'Plumbing') THEN
    INSERT INTO trades (name, description, is_active) VALUES
      ('Plumbing', 'Plumbing and pipe work', true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM trades WHERE name = 'Electrical') THEN
    INSERT INTO trades (name, description, is_active) VALUES
      ('Electrical', 'Electrical work and wiring', true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM trades WHERE name = 'HVAC') THEN
    INSERT INTO trades (name, description, is_active) VALUES
      ('HVAC', 'Heating, ventilation, and air conditioning', true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM trades WHERE name = 'General Maintenance') THEN
    INSERT INTO trades (name, description, is_active) VALUES
      ('General Maintenance', 'General facility maintenance', true);
  END IF;
  
  -- Get trade IDs
  SELECT id INTO trade_plumbing_id FROM trades WHERE name = 'Plumbing' LIMIT 1;
  SELECT id INTO trade_electrical_id FROM trades WHERE name = 'Electrical' LIMIT 1;
  SELECT id INTO trade_hvac_id FROM trades WHERE name = 'HVAC' LIMIT 1;
  SELECT id INTO trade_general_id FROM trades WHERE name = 'General Maintenance' LIMIT 1;

  -- Create organizations (check if they exist)
  IF NOT EXISTS (SELECT 1 FROM organizations WHERE name = 'WorkOrderPro Internal') THEN
    INSERT INTO organizations (id, name, contact_email, contact_phone, address, organization_type, initials, is_active) VALUES
      (org_internal_id, 'WorkOrderPro Internal', 'admin@workorderpro.test', '555-0100', '100 Main St, Austin, TX 78701', 'internal', 'WOP', true);
    orgs_created := orgs_created + 1;
  ELSE
    SELECT id INTO org_internal_id FROM organizations WHERE name = 'WorkOrderPro Internal';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM organizations WHERE name = 'ABC Property Management') THEN
    INSERT INTO organizations (id, name, contact_email, contact_phone, address, organization_type, initials, is_active) VALUES
      (org_abc_id, 'ABC Property Management', 'contact@abc-property.test', '555-0200', '200 Business Ave, Los Angeles, CA 90210', 'partner', 'ABC', true);
    orgs_created := orgs_created + 1;
  ELSE
    SELECT id INTO org_abc_id FROM organizations WHERE name = 'ABC Property Management';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM organizations WHERE name = 'XYZ Commercial Properties') THEN
    INSERT INTO organizations (id, name, contact_email, contact_phone, address, organization_type, initials, is_active) VALUES
      (org_xyz_id, 'XYZ Commercial Properties', 'info@xyz-commercial.test', '555-0300', '300 Corporate Blvd, New York, NY 10001', 'partner', 'XYZ', true);
    orgs_created := orgs_created + 1;
  ELSE
    SELECT id INTO org_xyz_id FROM organizations WHERE name = 'XYZ Commercial Properties';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM organizations WHERE name = 'Premium Facilities Group') THEN
    INSERT INTO organizations (id, name, contact_email, contact_phone, address, organization_type, initials, is_active) VALUES
      (org_premium_id, 'Premium Facilities Group', 'support@premiumfacilities.test', '555-0400', '400 Luxury Lane, Miami, FL 33101', 'partner', 'PFG', true);
    orgs_created := orgs_created + 1;
  ELSE
    SELECT id INTO org_premium_id FROM organizations WHERE name = 'Premium Facilities Group';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM organizations WHERE name = 'Pipes & More Plumbing') THEN
    INSERT INTO organizations (id, name, contact_email, contact_phone, address, organization_type, initials, is_active) VALUES
      (org_pipes_id, 'Pipes & More Plumbing', 'service@pipesmore.test', '555-0500', '500 Plumber St, Phoenix, AZ 85001', 'subcontractor', 'PMP', true);
    orgs_created := orgs_created + 1;
  ELSE
    SELECT id INTO org_pipes_id FROM organizations WHERE name = 'Pipes & More Plumbing';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM organizations WHERE name = 'Sparks Electric') THEN
    INSERT INTO organizations (id, name, contact_email, contact_phone, address, organization_type, initials, is_active) VALUES
      (org_sparks_id, 'Sparks Electric', 'contact@sparkselectric.test', '555-0600', '600 Electric Ave, Seattle, WA 98101', 'subcontractor', 'SPE', true);
    orgs_created := orgs_created + 1;
  ELSE
    SELECT id INTO org_sparks_id FROM organizations WHERE name = 'Sparks Electric';
  END IF;

  -- Create test user profiles (check if they exist)
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE email = 'partner1@workorderpro.test') THEN
    INSERT INTO profiles (id, user_id, email, first_name, last_name, company_name, is_active) VALUES
      (user_partner1_id, user_partner1_id, 'partner1@workorderpro.test', 'John', 'Partner', NULL, true);
    users_created := users_created + 1;
  ELSE
    SELECT id INTO user_partner1_id FROM profiles WHERE email = 'partner1@workorderpro.test';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE email = 'sub1@workorderpro.test') THEN
    INSERT INTO profiles (id, user_id, email, first_name, last_name, company_name, is_active) VALUES
      (user_subcontractor1_id, user_subcontractor1_id, 'sub1@workorderpro.test', 'Mike', 'Contractor', 'Pipes & More Plumbing', true);
    users_created := users_created + 1;
  ELSE
    SELECT id INTO user_subcontractor1_id FROM profiles WHERE email = 'sub1@workorderpro.test';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE email = 'employee1@workorderpro.test') THEN
    INSERT INTO profiles (id, user_id, email, first_name, last_name, company_name, is_active) VALUES
      (user_employee1_id, user_employee1_id, 'employee1@workorderpro.test', 'Sarah', 'Employee', NULL, true);
    users_created := users_created + 1;
  ELSE
    SELECT id INTO user_employee1_id FROM profiles WHERE email = 'employee1@workorderpro.test';
  END IF;

  -- Create organization memberships with roles (replaces user_organizations)
  IF NOT EXISTS (SELECT 1 FROM organization_members WHERE user_id = user_partner1_id AND organization_id = org_abc_id) THEN
    INSERT INTO organization_members (user_id, organization_id, role) VALUES (user_partner1_id, org_abc_id, 'member');
    user_orgs_created := user_orgs_created + 1;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM organization_members WHERE user_id = user_subcontractor1_id AND organization_id = org_pipes_id) THEN
    INSERT INTO organization_members (user_id, organization_id, role) VALUES (user_subcontractor1_id, org_pipes_id, 'member');
    user_orgs_created := user_orgs_created + 1;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM organization_members WHERE user_id = user_employee1_id AND organization_id = org_internal_id) THEN
    INSERT INTO organization_members (user_id, organization_id, role) VALUES (user_employee1_id, org_internal_id, 'employee');
    user_orgs_created := user_orgs_created + 1;
  END IF;

  -- Create partner locations (check if they exist)
  IF NOT EXISTS (SELECT 1 FROM partner_locations WHERE organization_id = org_abc_id AND location_number = '001') THEN
    INSERT INTO partner_locations (organization_id, location_name, location_number, street_address, city, state, zip_code, contact_name, contact_email, is_active) VALUES
      (org_abc_id, 'Downtown Office', '001', '123 Main Street', 'Downtown', 'CA', '90210', 'Jane Manager', 'downtown@abc-property.test', true);
    locations_created := locations_created + 1;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM partner_locations WHERE organization_id = org_abc_id AND location_number = '002') THEN
    INSERT INTO partner_locations (organization_id, location_name, location_number, street_address, city, state, zip_code, contact_name, contact_email, is_active) VALUES
      (org_abc_id, 'Westside Plaza', '002', '456 West Avenue', 'Westside', 'CA', '90211', 'Bob Supervisor', 'westside@abc-property.test', true);
    locations_created := locations_created + 1;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM partner_locations WHERE organization_id = org_xyz_id AND location_number = '101') THEN
    INSERT INTO partner_locations (organization_id, location_name, location_number, street_address, city, state, zip_code, contact_name, contact_email, is_active) VALUES
      (org_xyz_id, 'Corporate Tower', '101', '100 Business Boulevard', 'Manhattan', 'NY', '10001', 'Frank Executive', 'corporate@xyz-commercial.test', true);
    locations_created := locations_created + 1;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM partner_locations WHERE organization_id = org_premium_id AND location_number = '201') THEN
    INSERT INTO partner_locations (organization_id, location_name, location_number, street_address, city, state, zip_code, contact_name, contact_email, is_active) VALUES
      (org_premium_id, 'Luxury Mall', '201', '111 Luxury Lane', 'Miami', 'FL', '33101', 'Kelly Manager', 'luxury@premiumfacilities.test', true);
    locations_created := locations_created + 1;
  END IF;

  -- Create work orders (check if they exist)
  IF NOT EXISTS (SELECT 1 FROM work_orders WHERE work_order_number = 'ABC-001-001') THEN
    INSERT INTO work_orders (id, work_order_number, title, description, organization_id, trade_id, status, created_by, date_submitted, store_location, street_address, city, state, zip_code, estimated_hours) VALUES
      (wo_ids[1], 'ABC-001-001', 'Leaky Faucet Repair', 'Kitchen faucet dripping in main office break room', org_abc_id, trade_plumbing_id, 'received', v_admin_id, now(), 'Downtown Office', '123 Main Street', 'Downtown', 'CA', '90210', 2.0);
    work_orders_created := work_orders_created + 1;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM work_orders WHERE work_order_number = 'ABC-002-001') THEN
    INSERT INTO work_orders (id, work_order_number, title, description, organization_id, trade_id, status, created_by, date_submitted, store_location, street_address, city, state, zip_code, estimated_hours) VALUES
      (wo_ids[2], 'ABC-002-001', 'Electrical Outlet Repair', 'Multiple outlets not working in conference room', org_abc_id, trade_electrical_id, 'assigned', v_admin_id, now() - interval '1 day', 'Westside Plaza', '456 West Avenue', 'Westside', 'CA', '90211', 1.5);
    work_orders_created := work_orders_created + 1;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM work_orders WHERE work_order_number = 'XYZ-101-001') THEN
    INSERT INTO work_orders (id, work_order_number, title, description, organization_id, trade_id, status, created_by, date_submitted, store_location, street_address, city, state, zip_code, estimated_hours) VALUES
      (wo_ids[3], 'XYZ-101-001', 'HVAC System Maintenance', 'Monthly HVAC inspection and filter replacement', org_xyz_id, trade_hvac_id, 'in_progress', v_admin_id, now() - interval '2 days', 'Corporate Tower', '100 Business Boulevard', 'Manhattan', 'NY', '10001', 4.0);
    work_orders_created := work_orders_created + 1;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM work_orders WHERE work_order_number = 'XYZ-102-001') THEN
    INSERT INTO work_orders (id, work_order_number, title, description, organization_id, trade_id, status, created_by, date_submitted, store_location, street_address, city, state, zip_code, estimated_hours) VALUES
      (wo_ids[4], 'XYZ-102-001', 'General Maintenance Round', 'Weekly facility maintenance checklist', org_xyz_id, trade_general_id, 'completed', v_admin_id, now() - interval '7 days', 'Corporate Tower', '100 Business Boulevard', 'Manhattan', 'NY', '10001', 6.0);
    work_orders_created := work_orders_created + 1;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM work_orders WHERE work_order_number = 'PFG-201-001') THEN
    INSERT INTO work_orders (id, work_order_number, title, description, organization_id, trade_id, status, created_by, date_submitted, store_location, street_address, city, state, zip_code, estimated_hours) VALUES
      (wo_ids[5], 'PFG-201-001', 'Emergency Plumbing Repair', 'Burst pipe in basement utility room', org_premium_id, trade_plumbing_id, 'assigned', v_admin_id, now() - interval '3 hours', 'Luxury Mall', '111 Luxury Lane', 'Miami', 'FL', '33101', 3.0);
    work_orders_created := work_orders_created + 1;
  END IF;

  -- Create work order assignments
  IF NOT EXISTS (SELECT 1 FROM work_order_assignments WHERE work_order_id = wo_ids[2]) THEN
    INSERT INTO work_order_assignments (work_order_id, assigned_to, assigned_by, assigned_organization_id, assignment_type, notes) VALUES
      (wo_ids[2], user_subcontractor1_id, v_admin_id, org_pipes_id, 'lead', 'Electrical outlet repair - certified electrician required');
    assignments_created := assignments_created + 1;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM work_order_assignments WHERE work_order_id = wo_ids[3]) THEN
    INSERT INTO work_order_assignments (work_order_id, assigned_to, assigned_by, assigned_organization_id, assignment_type, notes) VALUES
      (wo_ids[3], user_employee1_id, v_admin_id, org_internal_id, 'lead', 'Monthly HVAC maintenance - internal team');
    assignments_created := assignments_created + 1;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM work_order_assignments WHERE work_order_id = wo_ids[5]) THEN
    INSERT INTO work_order_assignments (work_order_id, assigned_to, assigned_by, assigned_organization_id, assignment_type, notes) VALUES
      (wo_ids[5], user_subcontractor1_id, v_admin_id, org_pipes_id, 'lead', 'Emergency plumbing repair - immediate response');
    assignments_created := assignments_created + 1;
  END IF;

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Bulletproof test data setup completed successfully',
    'data', jsonb_build_object(
      'organizations_created', orgs_created,
      'users_created', users_created, 
      'locations_created', locations_created,
      'work_orders_created', work_orders_created,
      'assignments_created', assignments_created,
      'organization_memberships_created', user_orgs_created,
      'note', 'Auth users must be created separately through Supabase Auth'
    )
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'message', 'Failed to setup bulletproof test data: ' || SQLERRM
  );
END;
$function$;

-- Update clear_test_data function to use organization_members
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
  IF NOT public.jwt_is_admin() THEN
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

  -- Delete organization memberships (except real admin) - UPDATED from user_organizations
  WITH deleted AS (
    DELETE FROM public.organization_members 
    WHERE user_id != real_admin_id
    RETURNING *
  )
  SELECT deleted_counts || jsonb_build_object('organization_members', count(*)) INTO deleted_counts
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

-- Update seed_test_data function to use organization_members with roles
CREATE OR REPLACE FUNCTION public.seed_test_data()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb := '{}';
  real_admin_profile_id uuid;
  real_admin_email text := 'cradcliff@austinkunzconstruction.com';
  
  -- Organization IDs
  org_internal_id uuid := gen_random_uuid();
  org_abc_id uuid := gen_random_uuid();
  org_xyz_id uuid := gen_random_uuid();
  org_premium_id uuid := gen_random_uuid();
  org_sparks_id uuid := gen_random_uuid();
  org_reliable_id uuid := gen_random_uuid();
  org_quickfix_id uuid := gen_random_uuid();
  org_fasttrack_id uuid := gen_random_uuid();
  
  -- Profile IDs for test users
  profile_jane_id uuid := gen_random_uuid();
  profile_mike_id uuid := gen_random_uuid();
  profile_sarah_id uuid := gen_random_uuid();
  profile_david_id uuid := gen_random_uuid();
  profile_lisa_id uuid := gen_random_uuid();
  profile_carlos_id uuid := gen_random_uuid();
  profile_emma_id uuid := gen_random_uuid();
  profile_james_id uuid := gen_random_uuid();
  profile_amy_id uuid := gen_random_uuid();
  profile_robert_id uuid := gen_random_uuid();
  profile_jennifer_id uuid := gen_random_uuid();
  profile_kevin_id uuid := gen_random_uuid();
  profile_rachel_id uuid := gen_random_uuid();
  profile_brandon_id uuid := gen_random_uuid();
  
  -- Trade IDs
  trade_plumbing_id uuid;
  trade_electrical_id uuid;
  trade_hvac_id uuid;
  trade_general_id uuid;
  
BEGIN
  -- Only allow admins to execute this function
  IF NOT public.jwt_is_admin() THEN
    RAISE EXCEPTION 'Only administrators can seed test data';
  END IF;

  -- Get real admin profile to preserve
  SELECT id INTO real_admin_profile_id
  FROM profiles 
  WHERE email = real_admin_email;

  -- Create or get trades
  INSERT INTO trades (name, description, is_active) VALUES
    ('Plumbing', 'Plumbing and pipe work', true),
    ('Electrical', 'Electrical work and wiring', true),
    ('HVAC', 'Heating, ventilation, and air conditioning', true),
    ('General Maintenance', 'General facility maintenance', true)
  ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
  RETURNING id INTO trade_plumbing_id;
  
  SELECT id INTO trade_plumbing_id FROM trades WHERE name = 'Plumbing';
  SELECT id INTO trade_electrical_id FROM trades WHERE name = 'Electrical';  
  SELECT id INTO trade_hvac_id FROM trades WHERE name = 'HVAC';
  SELECT id INTO trade_general_id FROM trades WHERE name = 'General Maintenance';

  -- Create organizations
  INSERT INTO organizations (id, name, contact_email, contact_phone, address, organization_type, initials, is_active, next_sequence_number) VALUES
    (org_internal_id, 'Austin Kunz Construction - Internal', 'admin@austinkunzconstruction.com', '512-555-0100', '100 Construction Way, Austin, TX 78701', 'internal', 'AKC', true, 1),
    (org_abc_id, 'ABC Property Management', 'contact@abc-property.com', '512-555-0200', '200 Business Ave, Austin, TX 78702', 'partner', 'ABC', true, 1),
    (org_xyz_id, 'XYZ Commercial Properties', 'info@xyz-commercial.com', '512-555-0300', '300 Corporate Blvd, Austin, TX 78703', 'partner', 'XYZ', true, 1),
    (org_premium_id, 'Premium Facilities Group', 'support@premiumfacilities.com', '512-555-0400', '400 Luxury Lane, Austin, TX 78704', 'partner', 'PFG', true, 1),
    (org_sparks_id, 'Sparks Electric Solutions', 'service@sparkselectric.com', '512-555-0500', '500 Electric Ave, Austin, TX 78705', 'subcontractor', 'SES', true, 1),
    (org_reliable_id, 'Reliable Plumbing Services', 'contact@reliableplumbing.com', '512-555-0600', '600 Plumber St, Austin, TX 78706', 'subcontractor', 'RPS', true, 1),
    (org_quickfix_id, 'QuickFix HVAC', 'info@quickfixhvac.com', '512-555-0700', '700 HVAC Blvd, Austin, TX 78707', 'subcontractor', 'QFH', true, 1),
    (org_fasttrack_id, 'FastTrack Maintenance Co', 'hello@fasttrackmc.com', '512-555-0800', '800 Maintenance Dr, Austin, TX 78708', 'subcontractor', 'FTM', true, 1)
  ON CONFLICT (name) DO UPDATE SET 
    contact_email = EXCLUDED.contact_email,
    organization_type = EXCLUDED.organization_type;

  -- Create test user profiles (without auth - handled by edge function)
  INSERT INTO profiles (id, user_id, email, first_name, last_name, company_name, is_active, is_employee, hourly_billable_rate, hourly_cost_rate) VALUES
    (profile_jane_id, profile_jane_id, 'jane.manager@abc-property.com', 'Jane', 'Manager', NULL, true, false, NULL, NULL),
    (profile_mike_id, profile_mike_id, 'mike.supervisor@xyz-commercial.com', 'Mike', 'Supervisor', NULL, true, false, NULL, NULL),
    (profile_sarah_id, profile_sarah_id, 'sarah.employee@austinkunzconstruction.com', 'Sarah', 'Johnson', NULL, true, true, 45.00, 35.00),
    (profile_david_id, profile_david_id, 'david.foreman@austinkunzconstruction.com', 'David', 'Martinez', NULL, true, true, 55.00, 42.00),
    (profile_lisa_id, profile_lisa_id, 'lisa.coordinator@premiumfacilities.com', 'Lisa', 'Wilson', NULL, true, false, NULL, NULL),
    (profile_carlos_id, profile_carlos_id, 'carlos@sparkselectric.com', 'Carlos', 'Rodriguez', 'Sparks Electric Solutions', true, false, NULL, NULL),
    (profile_emma_id, profile_emma_id, 'emma@reliableplumbing.com', 'Emma', 'Thompson', 'Reliable Plumbing Services', true, false, NULL, NULL),
    (profile_james_id, profile_james_id, 'james@quickfixhvac.com', 'James', 'Anderson', 'QuickFix HVAC', true, false, NULL, NULL),
    (profile_amy_id, profile_amy_id, 'amy.tech@austinkunzconstruction.com', 'Amy', 'Chen', NULL, true, true, 40.00, 32.00),
    (profile_robert_id, profile_robert_id, 'robert@fasttrackmc.com', 'Robert', 'Davis', 'FastTrack Maintenance Co', true, false, NULL, NULL),
    (profile_jennifer_id, profile_jennifer_id, 'jennifer.ops@abc-property.com', 'Jennifer', 'Brown', NULL, true, false, NULL, NULL),
    (profile_kevin_id, profile_kevin_id, 'kevin.maintenance@austinkunzconstruction.com', 'Kevin', 'Taylor', NULL, true, true, 38.00, 30.00),
    (profile_rachel_id, profile_rachel_id, 'rachel.admin@xyz-commercial.com', 'Rachel', 'White', NULL, true, false, NULL, NULL),
    (profile_brandon_id, profile_brandon_id, 'brandon.lead@austinkunzconstruction.com', 'Brandon', 'Garcia', NULL, true, true, 50.00, 38.00)
  ON CONFLICT (email) DO UPDATE SET 
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    company_name = EXCLUDED.company_name;

  -- Create organization memberships with appropriate roles (replaces user_organizations)
  INSERT INTO organization_members (user_id, organization_id, role) VALUES
    -- Internal organization members
    (profile_sarah_id, org_internal_id, 'employee'),
    (profile_david_id, org_internal_id, 'manager'),
    (profile_amy_id, org_internal_id, 'employee'),
    (profile_kevin_id, org_internal_id, 'employee'),
    (profile_brandon_id, org_internal_id, 'manager'),
    
    -- Partner organization members
    (profile_jane_id, org_abc_id, 'member'),
    (profile_jennifer_id, org_abc_id, 'member'),
    (profile_mike_id, org_xyz_id, 'member'),
    (profile_rachel_id, org_xyz_id, 'member'),
    (profile_lisa_id, org_premium_id, 'member'),
    
    -- Subcontractor organization members
    (profile_carlos_id, org_sparks_id, 'member'),
    (profile_emma_id, org_reliable_id, 'member'),
    (profile_james_id, org_quickfix_id, 'member'),
    (profile_robert_id, org_fasttrack_id, 'member')
  ON CONFLICT (user_id, organization_id) DO UPDATE SET role = EXCLUDED.role;

  -- Create partner locations
  INSERT INTO partner_locations (organization_id, location_name, location_number, street_address, city, state, zip_code, contact_name, contact_email, is_active) VALUES
    (org_abc_id, 'Downtown Office Complex', '001', '123 Main Street', 'Austin', 'TX', '78701', 'Jane Manager', 'downtown@abc-property.com', true),
    (org_abc_id, 'Westside Business Park', '002', '456 West Avenue', 'Austin', 'TX', '78703', 'Bob Supervisor', 'westside@abc-property.com', true),
    (org_abc_id, 'South Austin Plaza', '003', '789 South Lamar', 'Austin', 'TX', '78704', 'Carol Director', 'south@abc-property.com', true),
    (org_xyz_id, 'Corporate Tower North', '101', '100 Business Boulevard', 'Austin', 'TX', '78701', 'Mike Supervisor', 'north@xyz-commercial.com', true),
    (org_xyz_id, 'Tech District Campus', '102', '200 Innovation Drive', 'Austin', 'TX', '78702', 'Alice Manager', 'tech@xyz-commercial.com', true),
    (org_premium_id, 'Luxury Shopping Center', '201', '300 Luxury Lane', 'Austin', 'TX', '78746', 'Lisa Wilson', 'luxury@premiumfacilities.com', true),
    (org_premium_id, 'Premium Office Suites', '202', '400 Executive Way', 'Austin', 'TX', '78759', 'Tom Executive', 'office@premiumfacilities.com', true),
    (org_premium_id, 'High-End Retail Plaza', '203', '500 Upscale Street', 'Austin', 'TX', '78731', 'Diana Manager', 'retail@premiumfacilities.com', true)
  ON CONFLICT (organization_id, location_number) DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Comprehensive test data seeded successfully',
    'details', jsonb_build_object(
      'organizations', 8,
      'profiles', 14,
      'organization_members', 14,
      'partner_locations', 8,
      'trades', 4,
      'preserved_admin', real_admin_profile_id
    )
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'message', 'Failed to seed test data: ' || SQLERRM
  );
END;
$function$;