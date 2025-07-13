-- BULLETPROOF TEST DATA SETUP MIGRATION
-- This creates a complete test environment using direct SQL for maximum reliability

-- Create stored procedure for bulletproof test data setup
CREATE OR REPLACE FUNCTION setup_bulletproof_test_data()
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
  
BEGIN
  -- Get current admin user
  SELECT id INTO v_admin_id FROM profiles WHERE user_id = auth.uid() AND user_type = 'admin';
  
  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Admin profile not found'
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
  ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
  RETURNING id INTO trade_plumbing_id;
  
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

  -- Create user-organization relationships
  INSERT INTO user_organizations (user_id, organization_id) VALUES
    (user_partner1_id, org_abc_id),
    (user_subcontractor1_id, org_pipes_id),
    (user_employee1_id, org_internal_id)
  ON CONFLICT (user_id, organization_id) DO NOTHING;

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
      'locations_created', locations_created,
      'work_orders_created', work_orders_created,
      'assignments_created', assignments_created,
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