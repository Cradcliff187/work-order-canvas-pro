-- PHASE 1: Fix the existing function to work without auth context
CREATE OR REPLACE FUNCTION setup_bulletproof_test_data(admin_user_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_id uuid;
  v_result jsonb := '{}';
  
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
  wo_ids uuid[10];
  
  -- Counters
  orgs_created integer := 0;
  users_created integer := 0;
  locations_created integer := 0;
  work_orders_created integer := 0;
  assignments_created integer := 0;
  user_orgs_created integer := 0;
  
BEGIN
  -- Use provided admin_user_id or try to get current admin user
  IF admin_user_id IS NOT NULL THEN
    v_admin_id := admin_user_id;
  ELSE
    -- Try to get current admin user
    SELECT id INTO v_admin_id FROM profiles WHERE user_id = auth.uid() AND user_type = 'admin';
    
    -- If still null, try to get any admin
    IF v_admin_id IS NULL THEN
      SELECT id INTO v_admin_id FROM profiles WHERE user_type = 'admin' LIMIT 1;
    END IF;
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
  
  FOR i IN 1..10 LOOP
    wo_ids[i] := gen_random_uuid();
  END LOOP;

  -- Create trades first
  INSERT INTO trades (id, name, description, is_active) VALUES
    (gen_random_uuid(), 'Plumbing', 'Plumbing and pipe work', true),
    (gen_random_uuid(), 'Electrical', 'Electrical work and wiring', true),
    (gen_random_uuid(), 'HVAC', 'Heating, ventilation, and air conditioning', true),
    (gen_random_uuid(), 'General Maintenance', 'General facility maintenance', true)
  ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;
  
  -- Get trade IDs
  SELECT id INTO trade_plumbing_id FROM trades WHERE name = 'Plumbing' LIMIT 1;
  SELECT id INTO trade_electrical_id FROM trades WHERE name = 'Electrical' LIMIT 1;
  SELECT id INTO trade_hvac_id FROM trades WHERE name = 'HVAC' LIMIT 1;
  SELECT id INTO trade_general_id FROM trades WHERE name = 'General Maintenance' LIMIT 1;

  -- Create organizations
  INSERT INTO organizations (id, name, contact_email, contact_phone, address, organization_type, initials, is_active) VALUES
    (org_internal_id, 'WorkOrderPro Internal', 'admin@workorderpro.test', '555-0100', '100 Main St, Austin, TX 78701', 'internal', 'WOP', true),
    (org_abc_id, 'ABC Property Management', 'contact@abc-property.test', '555-0200', '200 Business Ave, Los Angeles, CA 90210', 'partner', 'ABC', true),
    (org_xyz_id, 'XYZ Commercial Properties', 'info@xyz-commercial.test', '555-0300', '300 Corporate Blvd, New York, NY 10001', 'partner', 'XYZ', true),
    (org_premium_id, 'Premium Facilities Group', 'support@premiumfacilities.test', '555-0400', '400 Luxury Lane, Miami, FL 33101', 'partner', 'PFG', true),
    (org_pipes_id, 'Pipes & More Plumbing', 'service@pipesmore.test', '555-0500', '500 Plumber St, Phoenix, AZ 85001', 'subcontractor', 'PMP', true),
    (org_sparks_id, 'Sparks Electric', 'contact@sparkselectric.test', '555-0600', '600 Electric Ave, Seattle, WA 98101', 'subcontractor', 'SPE', true)
  ON CONFLICT (name) DO UPDATE SET 
    contact_email = EXCLUDED.contact_email,
    organization_type = EXCLUDED.organization_type,
    initials = EXCLUDED.initials;

  GET DIAGNOSTICS orgs_created = ROW_COUNT;

  -- Create test user profiles (without auth - those need to be created separately)
  INSERT INTO profiles (id, user_id, email, first_name, last_name, user_type, company_name, is_active) VALUES
    (user_partner1_id, user_partner1_id, 'partner1@workorderpro.test', 'John', 'Partner', 'partner', NULL, true),
    (user_subcontractor1_id, user_subcontractor1_id, 'sub1@workorderpro.test', 'Mike', 'Contractor', 'subcontractor', 'Pipes & More Plumbing', true),
    (user_employee1_id, user_employee1_id, 'employee1@workorderpro.test', 'Sarah', 'Employee', 'employee', NULL, true)
  ON CONFLICT (email) DO UPDATE SET 
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    user_type = EXCLUDED.user_type;

  GET DIAGNOSTICS users_created = ROW_COUNT;

  -- Create user-organization relationships (THIS WAS MISSING!)
  INSERT INTO user_organizations (user_id, organization_id) VALUES
    (user_partner1_id, org_abc_id),
    (user_subcontractor1_id, org_pipes_id),
    (user_employee1_id, org_internal_id)
  ON CONFLICT (user_id, organization_id) DO NOTHING;

  GET DIAGNOSTICS user_orgs_created = ROW_COUNT;

  -- Create partner locations
  INSERT INTO partner_locations (organization_id, location_name, location_number, street_address, city, state, zip_code, contact_name, contact_email, is_active) VALUES
    (org_abc_id, 'Downtown Office', '001', '123 Main Street', 'Downtown', 'CA', '90210', 'Jane Manager', 'downtown@abc-property.test', true),
    (org_abc_id, 'Westside Plaza', '002', '456 West Avenue', 'Westside', 'CA', '90211', 'Bob Supervisor', 'westside@abc-property.test', true),
    (org_xyz_id, 'Corporate Tower', '101', '100 Business Boulevard', 'Manhattan', 'NY', '10001', 'Frank Executive', 'corporate@xyz-commercial.test', true),
    (org_premium_id, 'Luxury Mall', '201', '111 Luxury Lane', 'Miami', 'FL', '33101', 'Kelly Manager', 'luxury@premiumfacilities.test', true)
  ON CONFLICT (organization_id, location_number) DO NOTHING;

  GET DIAGNOSTICS locations_created = ROW_COUNT;

  -- Create work orders
  INSERT INTO work_orders (id, work_order_number, title, description, organization_id, trade_id, status, created_by, date_submitted, store_location, street_address, city, state, zip_code, estimated_hours) VALUES
    (wo_ids[1], 'ABC-001-001', 'Leaky Faucet Repair', 'Kitchen faucet dripping in main office break room', org_abc_id, trade_plumbing_id, 'received', v_admin_id, now(), 'Downtown Office', '123 Main Street', 'Downtown', 'CA', '90210', 2.0),
    (wo_ids[2], 'ABC-002-001', 'Electrical Outlet Repair', 'Multiple outlets not working in conference room', org_abc_id, trade_electrical_id, 'assigned', v_admin_id, now() - interval '1 day', 'Westside Plaza', '456 West Avenue', 'Westside', 'CA', '90211', 1.5),
    (wo_ids[3], 'XYZ-101-001', 'HVAC System Maintenance', 'Monthly HVAC inspection and filter replacement', org_xyz_id, trade_hvac_id, 'in_progress', v_admin_id, now() - interval '2 days', 'Corporate Tower', '100 Business Boulevard', 'Manhattan', 'NY', '10001', 4.0),
    (wo_ids[4], 'XYZ-102-001', 'General Maintenance Round', 'Weekly facility maintenance checklist', org_xyz_id, trade_general_id, 'completed', v_admin_id, now() - interval '7 days', 'Corporate Tower', '100 Business Boulevard', 'Manhattan', 'NY', '10001', 6.0),
    (wo_ids[5], 'PFG-201-001', 'Emergency Plumbing Repair', 'Burst pipe in basement utility room', org_premium_id, trade_plumbing_id, 'assigned', v_admin_id, now() - interval '3 hours', 'Luxury Mall', '111 Luxury Lane', 'Miami', 'FL', '33101', 3.0)
  ON CONFLICT (work_order_number) DO NOTHING;

  GET DIAGNOSTICS work_orders_created = ROW_COUNT;

  -- Create work order assignments
  INSERT INTO work_order_assignments (work_order_id, assigned_to, assigned_by, assigned_organization_id, assignment_type, notes) VALUES
    (wo_ids[2], user_subcontractor1_id, v_admin_id, org_pipes_id, 'lead', 'Electrical outlet repair - certified electrician required'),
    (wo_ids[3], user_employee1_id, v_admin_id, org_internal_id, 'lead', 'Monthly HVAC maintenance - internal team'),
    (wo_ids[5], user_subcontractor1_id, v_admin_id, org_pipes_id, 'lead', 'Emergency plumbing repair - immediate response')
  ON CONFLICT (id) DO NOTHING;

  GET DIAGNOSTICS assignments_created = ROW_COUNT;

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

-- PHASE 2: Create a complete setup procedure that can be run directly in SQL Editor
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
  -- Get the real admin profile ID and verify it exists
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

-- PHASE 4: Create immediate fix for current partial state (fixed syntax)
CREATE OR REPLACE FUNCTION fix_existing_test_user_organizations()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;