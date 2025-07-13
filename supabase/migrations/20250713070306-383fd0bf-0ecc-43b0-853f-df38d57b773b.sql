-- Redesigned seed_test_data function to fix duplicate user_id conflicts
-- Focuses on business data only, uses existing admin profile for all relationships

CREATE OR REPLACE FUNCTION public.seed_test_data()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  existing_admin_profile_id uuid;
  
  -- Organization IDs
  org_internal_id uuid;
  org_abc_id uuid;
  org_xyz_id uuid;
  org_premium_id uuid;
  org_pipes_id uuid;
  org_sparks_id uuid;
  org_cool_id uuid;
  org_wood_id uuid;
  
  -- Existing trade IDs (query from database)
  trade_plumbing_id uuid;
  trade_electrical_id uuid;
  trade_hvac_id uuid;
  trade_general_id uuid;
  trade_carpentry_id uuid;
  
  -- Work order IDs
  wo1_id uuid;
  wo2_id uuid;
  wo3_id uuid;
  wo4_id uuid;
  
  -- Assignment IDs
  assign1_id uuid;
  assign2_id uuid;
  
  -- Report IDs
  report1_id uuid;
  report2_id uuid;
  
  -- Receipt IDs
  receipt1_id uuid;
  receipt2_id uuid;
  
  -- Counters for validation
  orgs_created integer := 0;
  locations_created integer := 0;
  work_orders_created integer := 0;
  assignments_created integer := 0;
  reports_created integer := 0;
  receipts_created integer := 0;
BEGIN
  -- Get current user ID and verify admin access
  v_user_id := auth.uid();
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = v_user_id AND user_type = 'admin'
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Unauthorized: Admin access required'
    );
  END IF;

  -- Get existing admin profile
  SELECT id INTO existing_admin_profile_id
  FROM profiles WHERE user_id = v_user_id;

  IF existing_admin_profile_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Admin profile not found'
    );
  END IF;

  -- Discover existing trades by name (with fallbacks)
  SELECT id INTO trade_plumbing_id FROM trades WHERE name ILIKE '%plumb%' LIMIT 1;
  SELECT id INTO trade_electrical_id FROM trades WHERE name ILIKE '%electric%' LIMIT 1;
  SELECT id INTO trade_hvac_id FROM trades WHERE name ILIKE '%hvac%' OR name ILIKE '%air%' LIMIT 1;
  SELECT id INTO trade_general_id FROM trades WHERE name ILIKE '%general%' OR name ILIKE '%maintenance%' LIMIT 1;
  SELECT id INTO trade_carpentry_id FROM trades WHERE name ILIKE '%carpen%' OR name ILIKE '%wood%' LIMIT 1;

  -- Create fallback trades if none found
  IF trade_plumbing_id IS NULL THEN
    INSERT INTO trades (name, description, is_active) 
    VALUES ('Plumbing', 'Plumbing and pipe work', true)
    RETURNING id INTO trade_plumbing_id;
  END IF;

  IF trade_electrical_id IS NULL THEN
    INSERT INTO trades (name, description, is_active) 
    VALUES ('Electrical', 'Electrical work and wiring', true)
    RETURNING id INTO trade_electrical_id;
  END IF;

  IF trade_hvac_id IS NULL THEN
    INSERT INTO trades (name, description, is_active) 
    VALUES ('HVAC', 'Heating, ventilation, and air conditioning', true)
    RETURNING id INTO trade_hvac_id;
  END IF;

  IF trade_general_id IS NULL THEN
    INSERT INTO trades (name, description, is_active) 
    VALUES ('General Maintenance', 'General facility maintenance', true)
    RETURNING id INTO trade_general_id;
  END IF;

  -- Generate UUIDs for new data
  org_internal_id := gen_random_uuid();
  org_abc_id := gen_random_uuid();
  org_xyz_id := gen_random_uuid();
  org_premium_id := gen_random_uuid();
  org_pipes_id := gen_random_uuid();
  org_sparks_id := gen_random_uuid();
  org_cool_id := gen_random_uuid();
  org_wood_id := gen_random_uuid();
  
  wo1_id := gen_random_uuid();
  wo2_id := gen_random_uuid();
  wo3_id := gen_random_uuid();
  wo4_id := gen_random_uuid();
  
  assign1_id := gen_random_uuid();
  assign2_id := gen_random_uuid();
  
  report1_id := gen_random_uuid();
  report2_id := gen_random_uuid();
  
  receipt1_id := gen_random_uuid();
  receipt2_id := gen_random_uuid();

  -- 1. Insert Organizations
  INSERT INTO organizations (id, name, contact_email, organization_type, initials, is_active) VALUES
    (org_internal_id, 'WorkOrderPro Internal', 'admin@workorderpro.com', 'internal', 'WOP', true),
    (org_abc_id, 'ABC Property Management', 'contact@abc-property.com', 'partner', 'ABC', true),
    (org_xyz_id, 'XYZ Commercial Properties', 'info@xyz-commercial.com', 'partner', 'XYZ', true),
    (org_premium_id, 'Premium Facilities Group', 'support@premiumfacilities.com', 'partner', 'PFG', true),
    (org_pipes_id, 'Pipes & More Plumbing', 'service@pipesmore.com', 'subcontractor', 'PMP', true),
    (org_sparks_id, 'Sparks Electric', 'contact@sparkselectric.com', 'subcontractor', 'SPE', true),
    (org_cool_id, 'Cool Air HVAC', 'info@coolair.com', 'subcontractor', 'CAH', true),
    (org_wood_id, 'Wood Works Carpentry', 'hello@woodworks.com', 'subcontractor', 'WWC', true);

  GET DIAGNOSTICS orgs_created = ROW_COUNT;

  -- 2. Link admin to internal organization only
  INSERT INTO user_organizations (user_id, organization_id) VALUES
    (existing_admin_profile_id, org_internal_id)
  ON CONFLICT (user_id, organization_id) DO NOTHING;

  -- 3. Insert Partner Locations
  INSERT INTO partner_locations (organization_id, location_name, location_number, street_address, city, state, zip_code, contact_name, contact_email, is_active) VALUES
    (org_abc_id, 'ABC Downtown Office', '001', '123 Main Street', 'Downtown', 'CA', '90210', 'Jane Manager', 'downtown@abc-property.com', true),
    (org_abc_id, 'ABC Westside Plaza', '002', '456 West Avenue', 'Westside', 'CA', '90211', 'Bob Supervisor', 'westside@abc-property.com', true),
    (org_xyz_id, 'XYZ Corporate Tower', '101', '321 Business Blvd', 'Corporate', 'NY', '10001', 'Mark Executive', 'corporate@xyz-commercial.com', true),
    (org_xyz_id, 'XYZ Tech Campus', '102', '654 Innovation Drive', 'Tech City', 'NY', '10002', 'Emma Director', 'tech@xyz-commercial.com', true),
    (org_premium_id, 'Premium Luxury Mall', '201', '111 Luxury Lane', 'Uptown', 'FL', '33101', 'Grace Manager', 'luxury@premiumfacilities.com', true);

  GET DIAGNOSTICS locations_created = ROW_COUNT;

  -- 4. Insert Work Orders (all created by admin)
  INSERT INTO work_orders (id, work_order_number, title, description, organization_id, trade_id, status, created_by, date_submitted, store_location, street_address, city, state, zip_code) VALUES
    (wo1_id, 'ABC-001-001', 'Leaky Faucet Repair', 'Kitchen faucet dripping constantly', org_abc_id, trade_plumbing_id, 'received', existing_admin_profile_id, now() - interval '5 days', 'ABC Downtown Office', '123 Main Street', 'Downtown', 'CA', '90210'),
    (wo2_id, 'ABC-002-001', 'Electrical Outlet Installation', 'Install 3 new outlets in conference room', org_abc_id, trade_electrical_id, 'received', existing_admin_profile_id, now() - interval '3 days', 'ABC Westside Plaza', '456 West Avenue', 'Westside', 'CA', '90211'),
    (wo3_id, 'XYZ-101-001', 'HVAC System Maintenance', 'Quarterly maintenance check on main HVAC system', org_xyz_id, trade_hvac_id, 'received', existing_admin_profile_id, now() - interval '2 days', 'XYZ Corporate Tower', '321 Business Blvd', 'Corporate', 'NY', '10001'),
    (wo4_id, 'PFG-201-001', 'General Maintenance', 'Monthly facility maintenance tasks', org_premium_id, trade_general_id, 'received', existing_admin_profile_id, now() - interval '10 days', 'Premium Luxury Mall', '111 Luxury Lane', 'Uptown', 'FL', '33101');

  GET DIAGNOSTICS work_orders_created = ROW_COUNT;

  -- 5. Insert Employee Reports (admin as employee)
  INSERT INTO employee_reports (employee_user_id, work_order_id, report_date, hours_worked, hourly_rate_snapshot, work_performed, notes) VALUES
    (existing_admin_profile_id, wo4_id, (now() - interval '10 days')::date, 6.0, 75.00, 'Monthly facility maintenance', 'Completed all scheduled tasks'),
    (existing_admin_profile_id, wo1_id, (now() - interval '2 days')::date, 2.0, 75.00, 'Initial assessment of plumbing issue', 'Confirmed leak, ready for contractor assignment');

  GET DIAGNOSTICS reports_created = ROW_COUNT;

  -- 6. Insert Receipts (admin as employee)
  INSERT INTO receipts (id, employee_user_id, vendor_name, amount, receipt_date, description, notes) VALUES
    (receipt1_id, existing_admin_profile_id, 'Home Depot', 45.67, (now() - interval '3 days')::date, 'Cleaning supplies and light bulbs', 'For monthly maintenance'),
    (receipt2_id, existing_admin_profile_id, 'Ace Hardware', 23.45, (now() - interval '1 day')::date, 'Emergency plumbing supplies', 'Temporary fix materials');

  GET DIAGNOSTICS receipts_created = ROW_COUNT;

  -- 7. Insert Receipt Work Orders (allocating receipts to work orders)
  INSERT INTO receipt_work_orders (receipt_id, work_order_id, allocated_amount, allocation_notes) VALUES
    (receipt1_id, wo4_id, 45.67, 'Monthly maintenance supplies'),
    (receipt2_id, wo1_id, 23.45, 'Emergency plumbing repair supplies');

  -- Validation: Verify data integrity
  IF orgs_created = 0 OR work_orders_created = 0 THEN
    RAISE EXCEPTION 'Data integrity check failed: No organizations or work orders created';
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', 'Business test data seeded successfully (admin-only approach)',
    'details', json_build_object(
      'organizations', orgs_created,
      'partner_locations', locations_created,
      'work_orders', work_orders_created,
      'employee_reports', reports_created,
      'receipts', receipts_created,
      'admin_profile_used', existing_admin_profile_id,
      'approach', 'single_admin_user'
    ),
    'testing_note', 'All test data uses your admin account. Test different user perspectives through impersonation or by creating real users.'
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