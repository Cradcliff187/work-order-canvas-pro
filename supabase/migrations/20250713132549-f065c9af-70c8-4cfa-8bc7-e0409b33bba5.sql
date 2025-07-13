-- Update seed_test_data function to assign work orders to real test users
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
  
  -- Test user profile IDs (look up by email)
  user_partner1_id uuid;
  user_partner2_id uuid;
  user_sub1_id uuid;
  user_sub2_id uuid;
  user_employee1_id uuid;
  
  -- Existing trade IDs (query from database)
  trade_plumbing_id uuid;
  trade_electrical_id uuid;
  trade_hvac_id uuid;
  trade_general_id uuid;
  trade_carpentry_id uuid;
  
  -- Work order IDs (30 total)
  wo_ids uuid[30];
  
  -- Counters for validation
  orgs_created integer := 0;
  locations_created integer := 0;
  work_orders_created integer := 0;
  assignments_created integer := 0;
  reports_created integer := 0;
  employee_reports_created integer := 0;
  receipts_created integer := 0;
  invoices_created integer := 0;
  attachments_created integer := 0;
  email_logs_created integer := 0;
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

  -- Look up test user profiles by email (if they exist)
  SELECT id INTO user_partner1_id FROM profiles WHERE email = 'partner1@workorderpro.test';
  SELECT id INTO user_partner2_id FROM profiles WHERE email = 'partner2@workorderpro.test';
  SELECT id INTO user_sub1_id FROM profiles WHERE email = 'sub1@workorderpro.test';
  SELECT id INTO user_sub2_id FROM profiles WHERE email = 'sub2@workorderpro.test';
  SELECT id INTO user_employee1_id FROM profiles WHERE email = 'employee1@workorderpro.test';

  -- Discover existing trades
  SELECT id INTO trade_plumbing_id FROM trades WHERE name ILIKE '%plumb%' LIMIT 1;
  SELECT id INTO trade_electrical_id FROM trades WHERE name ILIKE '%electric%' LIMIT 1;
  SELECT id INTO trade_hvac_id FROM trades WHERE name ILIKE '%hvac%' OR name ILIKE '%air%' LIMIT 1;
  SELECT id INTO trade_general_id FROM trades WHERE name ILIKE '%general%' OR name ILIKE '%maintenance%' LIMIT 1;
  SELECT id INTO trade_carpentry_id FROM trades WHERE name ILIKE '%carpen%' OR name ILIKE '%wood%' LIMIT 1;

  -- Create fallback trades if needed
  IF trade_plumbing_id IS NULL THEN
    INSERT INTO trades (name, description, is_active) 
    VALUES ('Plumbing', 'Plumbing and pipe work', true)
    ON CONFLICT (name) DO NOTHING
    RETURNING id INTO trade_plumbing_id;
    IF trade_plumbing_id IS NULL THEN
      SELECT id INTO trade_plumbing_id FROM trades WHERE name = 'Plumbing';
    END IF;
  END IF;

  IF trade_electrical_id IS NULL THEN
    INSERT INTO trades (name, description, is_active) 
    VALUES ('Electrical', 'Electrical work and wiring', true)
    ON CONFLICT (name) DO NOTHING
    RETURNING id INTO trade_electrical_id;
    IF trade_electrical_id IS NULL THEN
      SELECT id INTO trade_electrical_id FROM trades WHERE name = 'Electrical';
    END IF;
  END IF;

  IF trade_hvac_id IS NULL THEN
    INSERT INTO trades (name, description, is_active) 
    VALUES ('HVAC', 'Heating, ventilation, and air conditioning', true)
    ON CONFLICT (name) DO NOTHING
    RETURNING id INTO trade_hvac_id;
    IF trade_hvac_id IS NULL THEN
      SELECT id INTO trade_hvac_id FROM trades WHERE name = 'HVAC';
    END IF;
  END IF;

  IF trade_general_id IS NULL THEN
    INSERT INTO trades (name, description, is_active) 
    VALUES ('General Maintenance', 'General facility maintenance', true)
    ON CONFLICT (name) DO NOTHING
    RETURNING id INTO trade_general_id;
    IF trade_general_id IS NULL THEN
      SELECT id INTO trade_general_id FROM trades WHERE name = 'General Maintenance';
    END IF;
  END IF;

  IF trade_carpentry_id IS NULL THEN
    INSERT INTO trades (name, description, is_active) 
    VALUES ('Carpentry', 'Carpentry and woodwork', true)
    ON CONFLICT (name) DO NOTHING
    RETURNING id INTO trade_carpentry_id;
    IF trade_carpentry_id IS NULL THEN
      SELECT id INTO trade_carpentry_id FROM trades WHERE name = 'Carpentry';
    END IF;
  END IF;

  -- Generate UUIDs for organizations
  org_internal_id := gen_random_uuid();
  org_abc_id := gen_random_uuid();
  org_xyz_id := gen_random_uuid();
  org_premium_id := gen_random_uuid();
  org_pipes_id := gen_random_uuid();
  org_sparks_id := gen_random_uuid();
  org_cool_id := gen_random_uuid();
  org_wood_id := gen_random_uuid();

  -- Generate UUIDs for work orders
  FOR i IN 1..30 LOOP
    wo_ids[i] := gen_random_uuid();
  END LOOP;

  BEGIN
    -- 1. Insert Organizations (8 total)
    INSERT INTO organizations (id, name, contact_email, contact_phone, address, organization_type, initials, is_active) VALUES
      (org_internal_id, 'WorkOrderPro Internal', 'admin@workorderpro.com', '555-0100', '100 Main St, Suite 100, Austin, TX 78701', 'internal', 'WOP', true),
      (org_abc_id, 'ABC Property Management', 'contact@abc-property.com', '555-0200', '200 Business Ave, Los Angeles, CA 90210', 'partner', 'ABC', true),
      (org_xyz_id, 'XYZ Commercial Properties', 'info@xyz-commercial.com', '555-0300', '300 Corporate Blvd, New York, NY 10001', 'partner', 'XYZ', true),
      (org_premium_id, 'Premium Facilities Group', 'support@premiumfacilities.com', '555-0400', '400 Luxury Lane, Miami, FL 33101', 'partner', 'PFG', true),
      (org_pipes_id, 'Pipes & More Plumbing', 'service@pipesmore.com', '555-0500', '500 Plumber St, Phoenix, AZ 85001', 'subcontractor', 'PMP', true),
      (org_sparks_id, 'Sparks Electric', 'contact@sparkselectric.com', '555-0600', '600 Electric Ave, Seattle, WA 98101', 'subcontractor', 'SPE', true),
      (org_cool_id, 'Cool Air HVAC', 'info@coolair.com', '555-0700', '700 Air Way, Denver, CO 80201', 'subcontractor', 'CAH', true),
      (org_wood_id, 'Wood Works Carpentry', 'hello@woodworks.com', '555-0800', '800 Carpenter Rd, Portland, OR 97201', 'subcontractor', 'WWC', true)
    ON CONFLICT (name) DO NOTHING;

    GET DIAGNOSTICS orgs_created = ROW_COUNT;

    -- Get actual org IDs (in case of conflicts)
    SELECT id INTO org_internal_id FROM organizations WHERE name = 'WorkOrderPro Internal';
    SELECT id INTO org_abc_id FROM organizations WHERE name = 'ABC Property Management';
    SELECT id INTO org_xyz_id FROM organizations WHERE name = 'XYZ Commercial Properties';
    SELECT id INTO org_premium_id FROM organizations WHERE name = 'Premium Facilities Group';
    SELECT id INTO org_pipes_id FROM organizations WHERE name = 'Pipes & More Plumbing';
    SELECT id INTO org_sparks_id FROM organizations WHERE name = 'Sparks Electric';
    SELECT id INTO org_cool_id FROM organizations WHERE name = 'Cool Air HVAC';
    SELECT id INTO org_wood_id FROM organizations WHERE name = 'Wood Works Carpentry';

    -- 2. Insert Partner Locations (15 total)
    INSERT INTO partner_locations (organization_id, location_name, location_number, street_address, city, state, zip_code, contact_name, contact_email, contact_phone, is_active) VALUES
      -- ABC Properties (5 locations)
      (org_abc_id, 'Downtown Office', '001', '123 Main Street', 'Downtown', 'CA', '90210', 'Jane Manager', 'downtown@abc-property.com', '555-2001', true),
      (org_abc_id, 'Westside Plaza', '002', '456 West Avenue', 'Westside', 'CA', '90211', 'Bob Supervisor', 'westside@abc-property.com', '555-2002', true),
      (org_abc_id, 'Marina Complex', '003', '789 Harbor Drive', 'Marina', 'CA', '90212', 'Carol Director', 'marina@abc-property.com', '555-2003', true),
      (org_abc_id, 'Valley Center', '004', '321 Valley Road', 'Valley', 'CA', '90213', 'Dave Manager', 'valley@abc-property.com', '555-2004', true),
      (org_abc_id, 'Airport Business Park', '005', '654 Airport Way', 'Airport', 'CA', '90214', 'Eve Coordinator', 'airport@abc-property.com', '555-2005', true),
      
      -- XYZ Commercial (5 locations)
      (org_xyz_id, 'Corporate Tower', '101', '100 Business Boulevard', 'Manhattan', 'NY', '10001', 'Frank Executive', 'corporate@xyz-commercial.com', '555-3001', true),
      (org_xyz_id, 'Tech Campus', '102', '200 Innovation Drive', 'Brooklyn', 'NY', '10002', 'Grace Director', 'tech@xyz-commercial.com', '555-3002', true),
      (org_xyz_id, 'Financial Center', '103', '300 Wall Street', 'Manhattan', 'NY', '10003', 'Henry Manager', 'financial@xyz-commercial.com', '555-3003', true),
      (org_xyz_id, 'Medical Plaza', '104', '400 Health Avenue', 'Queens', 'NY', '10004', 'Ivy Supervisor', 'medical@xyz-commercial.com', '555-3004', true),
      (org_xyz_id, 'Education Hub', '105', '500 College Way', 'Bronx', 'NY', '10005', 'Jack Coordinator', 'education@xyz-commercial.com', '555-3005', true),
      
      -- Premium Facilities (5 locations)
      (org_premium_id, 'Luxury Mall', '201', '111 Luxury Lane', 'Miami', 'FL', '33101', 'Kelly Manager', 'luxury@premiumfacilities.com', '555-4001', true),
      (org_premium_id, 'Beach Resort', '202', '222 Ocean Drive', 'Miami Beach', 'FL', '33102', 'Liam Director', 'beach@premiumfacilities.com', '555-4002', true),
      (org_premium_id, 'City Center', '203', '333 Downtown Street', 'Orlando', 'FL', '33103', 'Mia Supervisor', 'city@premiumfacilities.com', '555-4003', true),
      (org_premium_id, 'Golf Club', '204', '444 Fairway Drive', 'Naples', 'FL', '33104', 'Noah Manager', 'golf@premiumfacilities.com', '555-4004', true),
      (org_premium_id, 'Marina Resort', '205', '555 Yacht Boulevard', 'Fort Lauderdale', 'FL', '33105', 'Olivia Coordinator', 'marina@premiumfacilities.com', '555-4005', true)
    ON CONFLICT (organization_id, location_number) DO NOTHING;

    GET DIAGNOSTICS locations_created = ROW_COUNT;

    -- 3. Insert Work Orders (30 total with diverse scenarios)
    INSERT INTO work_orders (id, work_order_number, title, description, organization_id, trade_id, status, created_by, date_submitted, store_location, street_address, city, state, zip_code, partner_po_number, estimated_hours) VALUES
      -- EMERGENCY ORDERS (3)
      (wo_ids[1], 'ABC-001-001', 'EMERGENCY: Burst pipe flooding lobby', 'Main water line burst in lobby causing flooding. Immediate response required.', org_abc_id, trade_plumbing_id, 'received', existing_admin_profile_id, now(), 'Downtown Office', '123 Main Street', 'Downtown', 'CA', '90210', 'PO-2024-001', 4.0),
      (wo_ids[2], 'XYZ-101-001', 'URGENT: No AC in server room', 'Server room HVAC system failure. Critical temperature control needed.', org_xyz_id, trade_hvac_id, 'in_progress', existing_admin_profile_id, now() - interval '1 day', 'Corporate Tower', '100 Business Boulevard', 'Manhattan', 'NY', '10001', 'XYZ-URGENT-001', 6.0),
      (wo_ids[3], 'PFG-201-001', 'EMERGENCY: Power outage floor 3', 'Complete electrical failure on third floor affecting 20 offices.', org_premium_id, trade_electrical_id, 'completed', existing_admin_profile_id, now() - interval '2 days', 'Luxury Mall', '111 Luxury Lane', 'Miami', 'FL', '33101', NULL, 8.0),
      
      -- ROUTINE MAINTENANCE (8)
      (wo_ids[4], 'ABC-002-001', 'Monthly HVAC System Inspection', 'Routine monthly inspection and filter replacement for main HVAC system.', org_abc_id, trade_hvac_id, 'completed', existing_admin_profile_id, now() - interval '30 days', 'Westside Plaza', '456 West Avenue', 'Westside', 'CA', '90211', 'PO-2024-002', 3.0),
      (wo_ids[5], 'XYZ-102-001', 'Quarterly Elevator Maintenance', 'Scheduled quarterly maintenance for passenger elevators 1-4.', org_xyz_id, trade_general_id, 'assigned', existing_admin_profile_id, now() - interval '5 days', 'Tech Campus', '200 Innovation Drive', 'Brooklyn', 'NY', '10002', 'XYZ-MAINT-002', 5.0),
      (wo_ids[6], 'PFG-202-001', 'Annual Fire System Test', 'Annual testing of fire suppression and alarm systems.', org_premium_id, trade_general_id, 'received', existing_admin_profile_id, now() - interval '3 days', 'Beach Resort', '222 Ocean Drive', 'Miami Beach', 'FL', '33102', NULL, 4.0),
      (wo_ids[7], 'ABC-003-001', 'Preventive Plumbing Inspection', 'Routine inspection of all plumbing fixtures and water pressure.', org_abc_id, trade_plumbing_id, 'in_progress', existing_admin_profile_id, now() - interval '7 days', 'Marina Complex', '789 Harbor Drive', 'Marina', 'CA', '90212', 'PO-2024-003', 6.0),
      (wo_ids[8], 'XYZ-103-001', 'Monthly Electrical Panel Check', 'Monthly inspection of main electrical panels and circuits.', org_xyz_id, trade_electrical_id, 'completed', existing_admin_profile_id, now() - interval '25 days', 'Financial Center', '300 Wall Street', 'Manhattan', 'NY', '10003', 'XYZ-ELEC-001', 2.5),
      (wo_ids[9], 'PFG-203-001', 'HVAC Filter Replacement Program', 'Replace all HVAC filters throughout facility - quarterly program.', org_premium_id, trade_hvac_id, 'completed', existing_admin_profile_id, now() - interval '15 days', 'City Center', '333 Downtown Street', 'Orlando', 'FL', '33103', NULL, 4.5),
      (wo_ids[10], 'ABC-004-001', 'General Facility Maintenance', 'Weekly facility maintenance checklist completion.', org_abc_id, trade_general_id, 'in_progress', existing_admin_profile_id, now() - interval '2 days', 'Valley Center', '321 Valley Road', 'Valley', 'CA', '90213', 'PO-2024-004', 8.0),
      (wo_ids[11], 'XYZ-104-001', 'Carpentry Maintenance Round', 'Monthly carpentry maintenance for common areas.', org_xyz_id, trade_carpentry_id, 'completed', existing_admin_profile_id, now() - interval '20 days', 'Medical Plaza', '400 Health Avenue', 'Queens', 'NY', '10004', 'XYZ-CARP-001', 5.5),
      
      -- More work orders with assignments to test users if they exist...
      (wo_ids[12], 'ABC-005-001', 'Leaky Faucet Repair Suite 101', 'Kitchen faucet dripping constantly in suite 101.', org_abc_id, trade_plumbing_id, 'assigned', existing_admin_profile_id, now() - interval '1 day', 'Airport Business Park', '654 Airport Way', 'Airport', 'CA', '90214', 'PO-2024-005', 2.0),
      (wo_ids[13], 'XYZ-105-001', 'Broken Window Replacement', 'Replace broken window in conference room B on 5th floor.', org_xyz_id, trade_general_id, 'assigned', existing_admin_profile_id, now() - interval '4 days', 'Education Hub', '500 College Way', 'Bronx', 'NY', '10005', 'XYZ-WIND-001', 3.0),
      (wo_ids[14], 'PFG-204-001', 'Faulty Electrical Outlet Repair', 'Multiple outlets not working in conference room A.', org_premium_id, trade_electrical_id, 'in_progress', existing_admin_profile_id, now() - interval '6 days', 'Golf Club', '444 Fairway Drive', 'Naples', 'FL', '33104', NULL, 2.5),
      (wo_ids[15], 'ABC-001-002', 'Damaged Floor Tile Replacement', 'Replace cracked and loose tiles in main lobby area.', org_abc_id, trade_general_id, 'completed', existing_admin_profile_id, now() - interval '12 days', 'Downtown Office', '123 Main Street', 'Downtown', 'CA', '90210', 'PO-2024-006', 4.0),
      
      -- Additional work orders...
      (wo_ids[16], 'XYZ-101-002', 'HVAC Thermostat Malfunction', 'Thermostat not responding, temperature control issues.', org_xyz_id, trade_hvac_id, 'received', existing_admin_profile_id, now() - interval '3 days', 'Corporate Tower', '100 Business Boulevard', 'Manhattan', 'NY', '10001', 'XYZ-HVAC-002', 1.5),
      (wo_ids[17], 'PFG-205-001', 'Door Lock Repair', 'Main entrance electronic lock system malfunction.', org_premium_id, trade_general_id, 'in_progress', existing_admin_profile_id, now() - interval '8 days', 'Marina Resort', '555 Yacht Boulevard', 'Fort Lauderdale', 'FL', '33105', NULL, 3.5),
      (wo_ids[18], 'ABC-002-002', 'Lighting Fixture Replacement', 'Replace flickering fluorescent lights in hallway.', org_abc_id, trade_electrical_id, 'assigned', existing_admin_profile_id, now() - interval '5 days', 'Westside Plaza', '456 West Avenue', 'Westside', 'CA', '90211', 'PO-2024-007', 2.0),
      (wo_ids[19], 'XYZ-102-002', 'Plumbing Leak Under Sink', 'Water leak detected under kitchen sink in break room.', org_xyz_id, trade_plumbing_id, 'completed', existing_admin_profile_id, now() - interval '18 days', 'Tech Campus', '200 Innovation Drive', 'Brooklyn', 'NY', '10002', 'XYZ-PLUMB-001', 2.5),
      (wo_ids[20], 'PFG-201-002', 'Carpet Repair and Cleaning', 'Deep clean and repair damaged carpet in reception area.', org_premium_id, trade_general_id, 'completed', existing_admin_profile_id, now() - interval '22 days', 'Luxury Mall', '111 Luxury Lane', 'Miami', 'FL', '33101', NULL, 6.0),
      
      -- Continue with remaining work orders...
      (wo_ids[21], 'ABC-003-002', 'Wooden Fixture Restoration', 'Sand and refinish wooden trim and fixtures in lobby.', org_abc_id, trade_carpentry_id, 'in_progress', existing_admin_profile_id, now() - interval '10 days', 'Marina Complex', '789 Harbor Drive', 'Marina', 'CA', '90212', 'PO-2024-008', 7.0),
      (wo_ids[22], 'XYZ-103-002', 'New Security Camera Installation', 'Install 6 new security cameras in parking garage.', org_xyz_id, trade_electrical_id, 'estimate_needed', existing_admin_profile_id, now() - interval '14 days', 'Financial Center', '300 Wall Street', 'Manhattan', 'NY', '10003', 'XYZ-SEC-001', 12.0),
      (wo_ids[23], 'PFG-202-002', 'Water Heater Replacement', 'Replace aging water heater with new energy-efficient unit.', org_premium_id, trade_plumbing_id, 'received', existing_admin_profile_id, now() - interval '9 days', 'Beach Resort', '222 Ocean Drive', 'Miami Beach', 'FL', '33102', NULL, 8.0),
      (wo_ids[24], 'ABC-004-002', 'New Workstation Setup', 'Install electrical and network for 5 new workstations.', org_abc_id, trade_electrical_id, 'assigned', existing_admin_profile_id, now() - interval '11 days', 'Valley Center', '321 Valley Road', 'Valley', 'CA', '90213', 'PO-2024-009', 10.0),
      (wo_ids[25], 'XYZ-104-002', 'Custom Shelving Installation', 'Build and install custom storage shelving in supply room.', org_xyz_id, trade_carpentry_id, 'in_progress', existing_admin_profile_id, now() - interval '16 days', 'Medical Plaza', '400 Health Avenue', 'Queens', 'NY', '10004', 'XYZ-SHELF-001', 14.0),
      (wo_ids[26], 'PFG-203-002', 'New AC Unit Installation', 'Install additional AC unit for expanded office space.', org_premium_id, trade_hvac_id, 'estimate_needed', existing_admin_profile_id, now() - interval '21 days', 'City Center', '333 Downtown Street', 'Orlando', 'FL', '33103', NULL, 16.0),
      (wo_ids[27], 'ABC-005-002', 'Safety Compliance Inspection', 'Annual OSHA safety compliance inspection and report.', org_abc_id, trade_general_id, 'completed', existing_admin_profile_id, now() - interval '45 days', 'Airport Business Park', '654 Airport Way', 'Airport', 'CA', '90214', 'PO-2024-010', 6.0),
      (wo_ids[28], 'XYZ-105-002', 'Electrical System Inspection', 'Comprehensive electrical system safety inspection.', org_xyz_id, trade_electrical_id, 'received', existing_admin_profile_id, now() - interval '13 days', 'Education Hub', '500 College Way', 'Bronx', 'NY', '10005', 'XYZ-INSP-001', 4.0),
      (wo_ids[29], 'PFG-204-002', 'Plumbing System Assessment', 'Full plumbing system pressure test and assessment.', org_premium_id, trade_plumbing_id, 'assigned', existing_admin_profile_id, now() - interval '7 days', 'Golf Club', '444 Fairway Drive', 'Naples', 'FL', '33104', NULL, 5.0),
      (wo_ids[30], 'ABC-001-003', 'Fire Safety Equipment Check', 'Inspect all fire extinguishers and emergency equipment.', org_abc_id, trade_general_id, 'completed', existing_admin_profile_id, now() - interval '35 days', 'Downtown Office', '123 Main Street', 'Downtown', 'CA', '90210', 'PO-2024-011', 3.0)
    ON CONFLICT (work_order_number) DO NOTHING;

    GET DIAGNOSTICS work_orders_created = ROW_COUNT;

    -- 4. Create Work Order Assignments (only if test users exist)
    IF user_sub1_id IS NOT NULL AND user_sub2_id IS NOT NULL AND user_employee1_id IS NOT NULL THEN
      INSERT INTO work_order_assignments (work_order_id, assigned_to, assigned_by, assigned_organization_id, assignment_type, assigned_at, notes) VALUES
        (wo_ids[3], user_sub2_id, existing_admin_profile_id, org_sparks_id, 'lead', now() - interval '2 days', 'Emergency electrical repair - certified electrician required'),
        (wo_ids[7], user_sub1_id, existing_admin_profile_id, org_pipes_id, 'lead', now() - interval '7 days', 'Preventive plumbing inspection - experienced technician'),
        (wo_ids[12], user_sub1_id, existing_admin_profile_id, org_pipes_id, 'lead', now() - interval '1 day', 'Leaky faucet repair - quick fix needed'),
        (wo_ids[13], user_employee1_id, existing_admin_profile_id, org_internal_id, 'lead', now() - interval '4 days', 'Window replacement - internal team'),
        (wo_ids[14], user_sub2_id, existing_admin_profile_id, org_sparks_id, 'lead', now() - interval '6 days', 'Outlet repair - electrical specialist'),
        (wo_ids[18], user_sub2_id, existing_admin_profile_id, org_sparks_id, 'lead', now() - interval '5 days', 'Lighting fixture replacement'),
        (wo_ids[21], user_employee1_id, existing_admin_profile_id, org_internal_id, 'lead', now() - interval '10 days', 'Wooden fixture restoration'),
        (wo_ids[24], user_sub2_id, existing_admin_profile_id, org_sparks_id, 'lead', now() - interval '11 days', 'Workstation electrical installation'),
        (wo_ids[29], user_sub1_id, existing_admin_profile_id, org_pipes_id, 'lead', now() - interval '7 days', 'Plumbing system assessment')
      ON CONFLICT (id) DO NOTHING;

      GET DIAGNOSTICS assignments_created = ROW_COUNT;
    END IF;

    -- 5. Create Work Order Reports (only if test users exist and have assignments)
    IF user_sub1_id IS NOT NULL AND user_sub2_id IS NOT NULL AND user_employee1_id IS NOT NULL THEN
      INSERT INTO work_order_reports (work_order_id, subcontractor_user_id, work_performed, materials_used, hours_worked, invoice_amount, status, submitted_at, reviewed_by_user_id, reviewed_at, review_notes) VALUES
        (wo_ids[3], user_sub2_id, 'Emergency power restoration on floor 3. Identified faulty main breaker and replaced. Tested all circuits and restored power.', 'Circuit breaker (200A), electrical testing equipment, wire nuts', 8.0, 1200.00, 'approved', now() - interval '1 day', existing_admin_profile_id, now() - interval '12 hours', 'Excellent emergency response time. Professional work.'),
        (wo_ids[19], user_sub1_id, 'Plumbing leak repair under kitchen sink. Replaced worn P-trap and supply lines. Tested for leaks.', 'P-trap assembly, supply lines, pipe sealant, plumbers putty', 2.5, 325.00, 'approved', now() - interval '17 days', existing_admin_profile_id, now() - interval '16 days', 'Quick and effective leak repair.'),
        (wo_ids[7], user_sub1_id, 'Preventive plumbing inspection 75% complete. Checked main lines, tested pressure, identified minor issues for follow-up.', 'Pressure testing equipment, pipe inspection camera', 4.5, 600.00, 'submitted', now() - interval '2 days', NULL, NULL, NULL),
        (wo_ids[14], user_sub2_id, 'Outlet repair in progress. Identified wiring issues, ordered replacement parts, 50% complete.', 'Electrical outlets, wire, electrical tester', 2.0, 280.00, 'submitted', now() - interval '1 day', NULL, NULL, NULL)
      ON CONFLICT (id) DO NOTHING;

      GET DIAGNOSTICS reports_created = ROW_COUNT;
    END IF;

    -- Return summary
    RETURN json_build_object(
      'success', true,
      'message', 'Test data seeded successfully',
      'created', json_build_object(
        'organizations', orgs_created,
        'locations', locations_created,
        'work_orders', work_orders_created,
        'assignments', assignments_created,
        'reports', reports_created
      ),
      'test_users_found', json_build_object(
        'partner1', user_partner1_id IS NOT NULL,
        'partner2', user_partner2_id IS NOT NULL,
        'sub1', user_sub1_id IS NOT NULL,
        'sub2', user_sub2_id IS NOT NULL,
        'employee1', user_employee1_id IS NOT NULL
      ),
      'note', CASE 
        WHEN user_sub1_id IS NULL THEN 'Run "Create Test Users" first to enable work order assignments'
        ELSE 'Work orders assigned to test users successfully'
      END
    );

  EXCEPTION WHEN OTHERS THEN
    -- Return error details
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Failed to seed test data - ' || SQLERRM
    );
  END;
END;
$function$