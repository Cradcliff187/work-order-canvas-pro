-- Enhanced seed_test_data function with comprehensive test scenarios
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
  
  -- Work order IDs (existing + new)
  wo1_id uuid; wo2_id uuid; wo3_id uuid; wo4_id uuid;
  wo5_id uuid; wo6_id uuid; wo7_id uuid; wo8_id uuid;
  wo9_id uuid; wo10_id uuid; wo11_id uuid; wo12_id uuid;
  
  -- Assignment IDs
  assign1_id uuid; assign2_id uuid; assign3_id uuid; assign4_id uuid;
  assign5_id uuid; assign6_id uuid; assign7_id uuid; assign8_id uuid;
  
  -- Report IDs (existing + new)
  report1_id uuid; report2_id uuid; report3_id uuid; 
  report4_id uuid; report5_id uuid; report6_id uuid;
  
  -- Invoice IDs
  invoice1_id uuid; invoice2_id uuid; invoice3_id uuid;
  
  -- Receipt IDs (existing)
  receipt1_id uuid; receipt2_id uuid;
  
  -- Attachment IDs
  attach1_id uuid; attach2_id uuid; attach3_id uuid; attach4_id uuid;
  attach5_id uuid; attach6_id uuid; attach7_id uuid; attach8_id uuid;
  attach9_id uuid; attach10_id uuid;
  
  -- Counters for validation
  orgs_created integer := 0;
  locations_created integer := 0;
  work_orders_created integer := 0;
  assignments_created integer := 0;
  reports_created integer := 0;
  receipts_created integer := 0;
  invoices_created integer := 0;
  invoice_work_orders_created integer := 0;
  attachments_created integer := 0;
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

  IF trade_carpentry_id IS NULL THEN
    INSERT INTO trades (name, description, is_active) 
    VALUES ('Carpentry', 'Carpentry and woodwork', true)
    RETURNING id INTO trade_carpentry_id;
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
  
  -- Work order UUIDs
  wo1_id := gen_random_uuid(); wo2_id := gen_random_uuid();
  wo3_id := gen_random_uuid(); wo4_id := gen_random_uuid();
  wo5_id := gen_random_uuid(); wo6_id := gen_random_uuid();
  wo7_id := gen_random_uuid(); wo8_id := gen_random_uuid();
  wo9_id := gen_random_uuid(); wo10_id := gen_random_uuid();
  wo11_id := gen_random_uuid(); wo12_id := gen_random_uuid();
  
  -- Assignment UUIDs
  assign1_id := gen_random_uuid(); assign2_id := gen_random_uuid();
  assign3_id := gen_random_uuid(); assign4_id := gen_random_uuid();
  assign5_id := gen_random_uuid(); assign6_id := gen_random_uuid();
  assign7_id := gen_random_uuid(); assign8_id := gen_random_uuid();
  
  -- Report UUIDs
  report1_id := gen_random_uuid(); report2_id := gen_random_uuid();
  report3_id := gen_random_uuid(); report4_id := gen_random_uuid();
  report5_id := gen_random_uuid(); report6_id := gen_random_uuid();
  
  -- Invoice UUIDs
  invoice1_id := gen_random_uuid(); invoice2_id := gen_random_uuid();
  invoice3_id := gen_random_uuid();
  
  -- Receipt UUIDs
  receipt1_id := gen_random_uuid(); receipt2_id := gen_random_uuid();

  -- Attachment UUIDs
  attach1_id := gen_random_uuid(); attach2_id := gen_random_uuid();
  attach3_id := gen_random_uuid(); attach4_id := gen_random_uuid();
  attach5_id := gen_random_uuid(); attach6_id := gen_random_uuid();
  attach7_id := gen_random_uuid(); attach8_id := gen_random_uuid();
  attach9_id := gen_random_uuid(); attach10_id := gen_random_uuid();

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

  -- 4. Insert Work Orders (12 total with varied statuses and historical dates)
  INSERT INTO work_orders (id, work_order_number, title, description, organization_id, trade_id, status, created_by, date_submitted, store_location, street_address, city, state, zip_code, assigned_to, completed_at, date_completed) VALUES
    -- Original work orders (received status)
    (wo1_id, 'ABC-001-001', 'Leaky Faucet Repair', 'Kitchen faucet dripping constantly', org_abc_id, trade_plumbing_id, 'received', existing_admin_profile_id, now() - interval '5 days', 'ABC Downtown Office', '123 Main Street', 'Downtown', 'CA', '90210', NULL, NULL, NULL),
    (wo2_id, 'ABC-002-001', 'Electrical Outlet Installation', 'Install 3 new outlets in conference room', org_abc_id, trade_electrical_id, 'received', existing_admin_profile_id, now() - interval '3 days', 'ABC Westside Plaza', '456 West Avenue', 'Westside', 'CA', '90211', NULL, NULL, NULL),
    (wo3_id, 'XYZ-101-001', 'HVAC System Maintenance', 'Quarterly maintenance check on main HVAC system', org_xyz_id, trade_hvac_id, 'received', existing_admin_profile_id, now() - interval '2 days', 'XYZ Corporate Tower', '321 Business Blvd', 'Corporate', 'NY', '10001', NULL, NULL, NULL),
    (wo4_id, 'PFG-201-001', 'General Maintenance', 'Monthly facility maintenance tasks', org_premium_id, trade_general_id, 'received', existing_admin_profile_id, now() - interval '10 days', 'Premium Luxury Mall', '111 Luxury Lane', 'Uptown', 'FL', '33101', NULL, NULL, NULL),
    
    -- Completed work orders
    (wo5_id, 'ABC-001-002', 'Emergency Plumbing Repair', 'Burst pipe in basement requiring immediate attention', org_abc_id, trade_plumbing_id, 'completed', existing_admin_profile_id, now() - interval '25 days', 'ABC Downtown Office', '123 Main Street', 'Downtown', 'CA', '90210', existing_admin_profile_id, now() - interval '23 days', now() - interval '23 days'),
    (wo6_id, 'XYZ-102-001', 'HVAC Filter Replacement', 'Replace all HVAC filters in tech campus', org_xyz_id, trade_hvac_id, 'completed', existing_admin_profile_id, now() - interval '15 days', 'XYZ Tech Campus', '654 Innovation Drive', 'Tech City', 'NY', '10002', existing_admin_profile_id, now() - interval '13 days', now() - interval '13 days'),
    (wo7_id, 'PFG-201-002', 'Electrical Panel Upgrade', 'Upgrade main electrical panel for increased capacity', org_premium_id, trade_electrical_id, 'completed', existing_admin_profile_id, now() - interval '8 days', 'Premium Luxury Mall', '111 Luxury Lane', 'Uptown', 'FL', '33101', existing_admin_profile_id, now() - interval '6 days', now() - interval '6 days'),
    
    -- In-progress work orders
    (wo8_id, 'ABC-002-002', 'General Maintenance Tasks', 'Weekly maintenance checklist completion', org_abc_id, trade_general_id, 'in_progress', existing_admin_profile_id, now() - interval '10 days', 'ABC Westside Plaza', '456 West Avenue', 'Westside', 'CA', '90211', existing_admin_profile_id, NULL, NULL),
    (wo9_id, 'XYZ-101-002', 'Carpentry Repairs', 'Fix damaged wooden fixtures in lobby', org_xyz_id, trade_carpentry_id, 'in_progress', existing_admin_profile_id, now() - interval '5 days', 'XYZ Corporate Tower', '321 Business Blvd', 'Corporate', 'NY', '10001', existing_admin_profile_id, NULL, NULL),
    (wo10_id, 'PFG-201-003', 'Flooring Repair', 'Replace damaged tiles in main corridor', org_premium_id, trade_general_id, 'in_progress', existing_admin_profile_id, now() - interval '2 days', 'Premium Luxury Mall', '111 Luxury Lane', 'Uptown', 'FL', '33101', existing_admin_profile_id, NULL, NULL),
    
    -- Cancelled work orders
    (wo11_id, 'ABC-001-003', 'Roofing Work', 'Repair roof leaks - cancelled due to weather conditions', org_abc_id, trade_general_id, 'cancelled', existing_admin_profile_id, now() - interval '20 days', 'ABC Downtown Office', '123 Main Street', 'Downtown', 'CA', '90210', NULL, NULL, NULL),
    (wo12_id, 'XYZ-102-002', 'Painting Project', 'Interior painting - cancelled due to budget constraints', org_xyz_id, trade_general_id, 'cancelled', existing_admin_profile_id, now() - interval '12 days', 'XYZ Tech Campus', '654 Innovation Drive', 'Tech City', 'NY', '10002', NULL, NULL, NULL);

  GET DIAGNOSTICS work_orders_created = ROW_COUNT;

  -- 5. Insert Work Order Assignments
  INSERT INTO work_order_assignments (id, work_order_id, assigned_to, assigned_by, assigned_organization_id, assignment_type, assigned_at, notes) VALUES
    (assign1_id, wo5_id, existing_admin_profile_id, existing_admin_profile_id, org_pipes_id, 'lead', now() - interval '24 days', 'Emergency plumbing repair - high priority'),
    (assign2_id, wo6_id, existing_admin_profile_id, existing_admin_profile_id, org_cool_id, 'lead', now() - interval '14 days', 'Routine HVAC maintenance'),
    (assign3_id, wo7_id, existing_admin_profile_id, existing_admin_profile_id, org_sparks_id, 'lead', now() - interval '7 days', 'Electrical panel upgrade - certified electrician required'),
    (assign4_id, wo8_id, existing_admin_profile_id, existing_admin_profile_id, org_internal_id, 'lead', now() - interval '9 days', 'Internal maintenance team assignment'),
    (assign5_id, wo9_id, existing_admin_profile_id, existing_admin_profile_id, org_wood_id, 'lead', now() - interval '4 days', 'Carpentry work - skilled craftsman needed'),
    (assign6_id, wo10_id, existing_admin_profile_id, existing_admin_profile_id, org_internal_id, 'lead', now() - interval '1 day', 'Internal team for flooring repair'),
    (assign7_id, wo1_id, existing_admin_profile_id, existing_admin_profile_id, org_pipes_id, 'lead', now() - interval '4 days', 'Plumbing specialist for faucet repair'),
    (assign8_id, wo2_id, existing_admin_profile_id, existing_admin_profile_id, org_sparks_id, 'lead', now() - interval '2 days', 'Electrical outlet installation');

  GET DIAGNOSTICS assignments_created = ROW_COUNT;

  -- 6. Insert Work Order Reports
  INSERT INTO work_order_reports (id, work_order_id, subcontractor_user_id, work_performed, materials_used, hours_worked, invoice_amount, status, submitted_at, reviewed_by_user_id, reviewed_at, review_notes) VALUES
    (report1_id, wo5_id, existing_admin_profile_id, 'Emergency burst pipe repair in basement', 'PVC pipes, fittings, sealant', 4.5, 450.00, 'approved', now() - interval '23 days', existing_admin_profile_id, now() - interval '22 days', 'Excellent work, completed quickly'),
    (report2_id, wo6_id, existing_admin_profile_id, 'Replaced all HVAC filters throughout facility', 'High-efficiency air filters (12 units)', 2.0, 240.00, 'approved', now() - interval '13 days', existing_admin_profile_id, now() - interval '12 days', 'All filters replaced according to schedule'),
    (report3_id, wo7_id, existing_admin_profile_id, 'Upgraded electrical panel with new breakers', 'Electrical panel, circuit breakers, wiring', 6.0, 1200.00, 'approved', now() - interval '6 days', existing_admin_profile_id, now() - interval '5 days', 'Professional installation, passed inspection'),
    (report4_id, wo8_id, existing_admin_profile_id, 'Weekly maintenance tasks in progress', 'Cleaning supplies, lubricants', 3.0, 225.00, 'submitted', now() - interval '1 day', NULL, NULL, NULL),
    (report5_id, wo9_id, existing_admin_profile_id, 'Carpentry repairs ongoing', 'Wood stain, sandpaper, wood filler', 4.0, 320.00, 'submitted', now() - interval '2 days', NULL, NULL, NULL),
    (report6_id, wo10_id, existing_admin_profile_id, 'Flooring assessment completed', 'Tile adhesive, grout', 2.5, 180.00, 'submitted', now() - interval '1 day', NULL, NULL, NULL);

  GET DIAGNOSTICS reports_created = ROW_COUNT;

  -- 7. Insert Employee Reports (admin as employee)
  INSERT INTO employee_reports (employee_user_id, work_order_id, report_date, hours_worked, hourly_rate_snapshot, work_performed, notes) VALUES
    (existing_admin_profile_id, wo4_id, (now() - interval '10 days')::date, 6.0, 75.00, 'Monthly facility maintenance', 'Completed all scheduled tasks'),
    (existing_admin_profile_id, wo1_id, (now() - interval '2 days')::date, 2.0, 75.00, 'Initial assessment of plumbing issue', 'Confirmed leak, ready for contractor assignment');

  GET DIAGNOSTICS reports_created = ROW_COUNT;

  -- 8. Insert Invoices with different statuses
  INSERT INTO invoices (id, subcontractor_organization_id, external_invoice_number, internal_invoice_number, status, total_amount, submitted_by, submitted_at, approved_by, approved_at) VALUES
    (invoice1_id, org_pipes_id, NULL, '', 'draft', 450.00, NULL, NULL, NULL, NULL),
    (invoice2_id, org_cool_id, 'CAH-2024-001', 'INV-2024-00001', 'submitted', 240.00, existing_admin_profile_id, now() - interval '3 days', NULL, NULL),
    (invoice3_id, org_sparks_id, 'SPE-2024-002', 'INV-2024-00002', 'approved', 1200.00, existing_admin_profile_id, now() - interval '7 days', existing_admin_profile_id, now() - interval '5 days');

  GET DIAGNOSTICS invoices_created = ROW_COUNT;

  -- 9. Insert Invoice Work Orders (linking invoices to work orders)
  INSERT INTO invoice_work_orders (invoice_id, work_order_id, work_order_report_id, amount, description) VALUES
    (invoice1_id, wo5_id, report1_id, 450.00, 'Emergency plumbing repair'),
    (invoice2_id, wo6_id, report2_id, 240.00, 'HVAC filter replacement'),
    (invoice3_id, wo7_id, report3_id, 1200.00, 'Electrical panel upgrade');

  GET DIAGNOSTICS invoice_work_orders_created = ROW_COUNT;

  -- 10. Insert Receipts (admin as employee)
  INSERT INTO receipts (id, employee_user_id, vendor_name, amount, receipt_date, description, notes) VALUES
    (receipt1_id, existing_admin_profile_id, 'Home Depot', 45.67, (now() - interval '3 days')::date, 'Cleaning supplies and light bulbs', 'For monthly maintenance'),
    (receipt2_id, existing_admin_profile_id, 'Ace Hardware', 23.45, (now() - interval '1 day')::date, 'Emergency plumbing supplies', 'Temporary fix materials');

  GET DIAGNOSTICS receipts_created = ROW_COUNT;

  -- 11. Insert Receipt Work Orders (allocating receipts to work orders)
  INSERT INTO receipt_work_orders (receipt_id, work_order_id, allocated_amount, allocation_notes) VALUES
    (receipt1_id, wo4_id, 45.67, 'Monthly maintenance supplies'),
    (receipt2_id, wo1_id, 23.45, 'Emergency plumbing repair supplies');

  -- 12. Insert Work Order Attachments
  INSERT INTO work_order_attachments (id, work_order_id, work_order_report_id, file_name, file_url, file_type, file_size, uploaded_by_user_id, uploaded_at) VALUES
    (attach1_id, wo5_id, report1_id, 'before_pipe_repair.jpg', '/storage/attachments/before_pipe_repair.jpg', 'photo', 1024000, existing_admin_profile_id, now() - interval '23 days'),
    (attach2_id, wo5_id, report1_id, 'after_pipe_repair.jpg', '/storage/attachments/after_pipe_repair.jpg', 'photo', 987000, existing_admin_profile_id, now() - interval '23 days'),
    (attach3_id, wo6_id, report2_id, 'hvac_filters_replaced.jpg', '/storage/attachments/hvac_filters_replaced.jpg', 'photo', 856000, existing_admin_profile_id, now() - interval '13 days'),
    (attach4_id, wo7_id, report3_id, 'electrical_panel_before.jpg', '/storage/attachments/electrical_panel_before.jpg', 'photo', 1245000, existing_admin_profile_id, now() - interval '7 days'),
    (attach5_id, wo7_id, report3_id, 'electrical_panel_after.jpg', '/storage/attachments/electrical_panel_after.jpg', 'photo', 1189000, existing_admin_profile_id, now() - interval '6 days'),
    (attach6_id, wo7_id, report3_id, 'electrical_inspection_cert.pdf', '/storage/attachments/electrical_inspection_cert.pdf', 'document', 234000, existing_admin_profile_id, now() - interval '5 days'),
    (attach7_id, wo8_id, report4_id, 'maintenance_checklist.pdf', '/storage/attachments/maintenance_checklist.pdf', 'document', 145000, existing_admin_profile_id, now() - interval '1 day'),
    (attach8_id, wo9_id, report5_id, 'carpentry_progress.jpg', '/storage/attachments/carpentry_progress.jpg', 'photo', 967000, existing_admin_profile_id, now() - interval '2 days'),
    (attach9_id, wo10_id, report6_id, 'flooring_damage_assessment.jpg', '/storage/attachments/flooring_damage_assessment.jpg', 'photo', 1123000, existing_admin_profile_id, now() - interval '1 day'),
    (attach10_id, NULL, NULL, 'sample_invoice.pdf', '/storage/attachments/sample_invoice.pdf', 'invoice', 78000, existing_admin_profile_id, now() - interval '3 days');

  GET DIAGNOSTICS attachments_created = ROW_COUNT;

  -- Validation: Verify data integrity
  IF orgs_created = 0 OR work_orders_created = 0 THEN
    RAISE EXCEPTION 'Data integrity check failed: No organizations or work orders created';
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', 'Enhanced business test data seeded successfully (comprehensive testing)',
    'details', json_build_object(
      'organizations', orgs_created,
      'partner_locations', locations_created,
      'work_orders', work_orders_created,
      'work_order_assignments', assignments_created,
      'work_order_reports', reports_created,
      'employee_reports', 2,
      'receipts', receipts_created,
      'invoices', invoices_created,
      'invoice_work_orders', invoice_work_orders_created,
      'work_order_attachments', attachments_created,
      'admin_profile_used', existing_admin_profile_id,
      'approach', 'comprehensive_testing'
    ),
    'testing_scenarios', json_build_object(
      'work_order_statuses', json_build_object(
        'received', 4,
        'assigned', 0,
        'in_progress', 3,
        'completed', 3,
        'cancelled', 2
      ),
      'invoice_statuses', json_build_object(
        'draft', 1,
        'submitted', 1,
        'approved', 1
      ),
      'date_distribution', 'Past 30 days with realistic intervals',
      'assignment_coverage', 'Both organization and individual assignments',
      'attachment_variety', 'Photos, documents, and invoices across multiple work orders'
    ),
    'testing_note', 'Comprehensive test data includes varied statuses, historical dates, assignments, invoices, and attachments for thorough system testing.'
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