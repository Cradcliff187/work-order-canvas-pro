-- FINAL BULLETPROOF SOLUTION: Fix all SQL constraint issues and streamline setup

-- 1. Fix the main setup function with proper constraint handling
CREATE OR REPLACE FUNCTION setup_bulletproof_test_data(admin_user_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
    SELECT id INTO v_admin_id FROM profiles WHERE user_type = 'admin' LIMIT 1;
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
    INSERT INTO profiles (id, user_id, email, first_name, last_name, user_type, company_name, is_active) VALUES
      (user_partner1_id, user_partner1_id, 'partner1@workorderpro.test', 'John', 'Partner', 'partner', NULL, true);
    users_created := users_created + 1;
  ELSE
    SELECT id INTO user_partner1_id FROM profiles WHERE email = 'partner1@workorderpro.test';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE email = 'sub1@workorderpro.test') THEN
    INSERT INTO profiles (id, user_id, email, first_name, last_name, user_type, company_name, is_active) VALUES
      (user_subcontractor1_id, user_subcontractor1_id, 'sub1@workorderpro.test', 'Mike', 'Contractor', 'subcontractor', 'Pipes & More Plumbing', true);
    users_created := users_created + 1;
  ELSE
    SELECT id INTO user_subcontractor1_id FROM profiles WHERE email = 'sub1@workorderpro.test';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE email = 'employee1@workorderpro.test') THEN
    INSERT INTO profiles (id, user_id, email, first_name, last_name, user_type, company_name, is_active) VALUES
      (user_employee1_id, user_employee1_id, 'employee1@workorderpro.test', 'Sarah', 'Employee', 'employee', NULL, true);
    users_created := users_created + 1;
  ELSE
    SELECT id INTO user_employee1_id FROM profiles WHERE email = 'employee1@workorderpro.test';
  END IF;

  -- Create user-organization relationships
  IF NOT EXISTS (SELECT 1 FROM user_organizations WHERE user_id = user_partner1_id AND organization_id = org_abc_id) THEN
    INSERT INTO user_organizations (user_id, organization_id) VALUES (user_partner1_id, org_abc_id);
    user_orgs_created := user_orgs_created + 1;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM user_organizations WHERE user_id = user_subcontractor1_id AND organization_id = org_pipes_id) THEN
    INSERT INTO user_organizations (user_id, organization_id) VALUES (user_subcontractor1_id, org_pipes_id);
    user_orgs_created := user_orgs_created + 1;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM user_organizations WHERE user_id = user_employee1_id AND organization_id = org_internal_id) THEN
    INSERT INTO user_organizations (user_id, organization_id) VALUES (user_employee1_id, org_internal_id);
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

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Bulletproof test data setup completed successfully',
    'data', jsonb_build_object(
      'organizations_created', orgs_created,
      'users_created', users_created, 
      'user_organizations_created', user_orgs_created,
      'locations_created', locations_created,
      'work_orders_created', work_orders_created,
      'assignments_created', assignments_created,
      'admin_used', v_admin_id::text,
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
$$;

-- 2. Update the complete setup function to use real admin email
CREATE OR REPLACE FUNCTION complete_test_environment_setup()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_id uuid;
  v_result jsonb;
  real_admin_email text := 'cradcliff@austinkunzconstruction.com';
BEGIN
  -- Get the real admin profile ID
  SELECT id INTO v_admin_id
  FROM public.profiles 
  WHERE email = real_admin_email;

  -- Safety check: ensure admin profile exists
  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Real admin profile not found',
      'message', 'Cannot find admin profile with email: ' || real_admin_email
    );
  END IF;

  -- Call the fixed setup function with the admin ID
  SELECT setup_bulletproof_test_data(v_admin_id) INTO v_result;

  RETURN v_result;
END;
$$;

-- 3. Create a streamlined verification function
CREATE OR REPLACE FUNCTION verify_test_environment_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  test_users_count integer := 0;
  test_orgs_count integer := 0;
  test_work_orders_count integer := 0;
  user_orgs_count integer := 0;
  missing_relationships text[] := '{}';
BEGIN
  -- Count test users
  SELECT COUNT(*) INTO test_users_count
  FROM profiles 
  WHERE email LIKE '%@workorderpro.test';
  
  -- Count test organizations
  SELECT COUNT(*) INTO test_orgs_count
  FROM organizations 
  WHERE contact_email LIKE '%@%workorderpro.test' OR contact_email LIKE '%@abc-property.test' OR contact_email LIKE '%@xyz-commercial.test';
  
  -- Count work orders
  SELECT COUNT(*) INTO test_work_orders_count
  FROM work_orders;
  
  -- Count user-organization relationships for test users
  SELECT COUNT(*) INTO user_orgs_count
  FROM user_organizations uo
  JOIN profiles p ON p.id = uo.user_id
  WHERE p.email LIKE '%@workorderpro.test';
  
  -- Check for missing relationships
  IF NOT EXISTS (SELECT 1 FROM user_organizations uo JOIN profiles p ON p.id = uo.user_id WHERE p.email = 'partner1@workorderpro.test') THEN
    missing_relationships := array_append(missing_relationships, 'partner1@workorderpro.test missing organization');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM user_organizations uo JOIN profiles p ON p.id = uo.user_id WHERE p.email = 'sub1@workorderpro.test') THEN
    missing_relationships := array_append(missing_relationships, 'sub1@workorderpro.test missing organization');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM user_organizations uo JOIN profiles p ON p.id = uo.user_id WHERE p.email = 'employee1@workorderpro.test') THEN
    missing_relationships := array_append(missing_relationships, 'employee1@workorderpro.test missing organization');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'environment_status', jsonb_build_object(
      'test_users_count', test_users_count,
      'test_organizations_count', test_orgs_count,
      'work_orders_count', test_work_orders_count,
      'user_organization_relationships', user_orgs_count,
      'missing_relationships', missing_relationships,
      'ready_for_testing', (test_users_count >= 3 AND test_orgs_count >= 3 AND user_orgs_count >= 3)
    )
  );
END;
$$;