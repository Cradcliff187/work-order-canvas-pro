-- Fix seed_test_data function to handle existing admin profiles gracefully
CREATE OR REPLACE FUNCTION seed_test_data()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
  v_user_id uuid;
  existing_admin_profile_id uuid;
  org_internal_id uuid;
  org_abc_id uuid;
  org_xyz_id uuid;
  org_premium_id uuid;
  org_pipes_id uuid;
  org_sparks_id uuid;
  org_cool_id uuid;
  org_wood_id uuid;
  trade_plumbing_id uuid;
  trade_electrical_id uuid;
  trade_hvac_id uuid;
  trade_carpentry_id uuid;
  trade_painting_id uuid;
  trade_general_id uuid;
  trade_landscaping_id uuid;
  admin_user_id uuid;
  employee1_id uuid;
  employee2_id uuid;
  partner1_id uuid;
  partner2_id uuid;
  partner3_id uuid;
  sub1_id uuid;
  sub2_id uuid;
  sub3_id uuid;
  sub4_id uuid;
  sub5_id uuid;
  sub6_id uuid;
  sub7_id uuid;
  sub8_id uuid;
  wo1_id uuid;
  wo2_id uuid;
  wo3_id uuid;
  invoice1_id uuid;
  invoice2_id uuid;
  invoice3_id uuid;
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

  -- Check if admin profile already exists and get its ID
  SELECT id INTO existing_admin_profile_id
  FROM profiles 
  WHERE user_id = v_user_id;

  -- Generate UUIDs for relationships
  org_internal_id := gen_random_uuid();
  org_abc_id := gen_random_uuid();
  org_xyz_id := gen_random_uuid();
  org_premium_id := gen_random_uuid();
  org_pipes_id := gen_random_uuid();
  org_sparks_id := gen_random_uuid();
  org_cool_id := gen_random_uuid();
  org_wood_id := gen_random_uuid();
  trade_plumbing_id := gen_random_uuid();
  trade_electrical_id := gen_random_uuid();
  trade_hvac_id := gen_random_uuid();
  trade_carpentry_id := gen_random_uuid();
  trade_painting_id := gen_random_uuid();
  trade_general_id := gen_random_uuid();
  trade_landscaping_id := gen_random_uuid();
  
  -- Use existing admin profile ID if found, otherwise generate new UUID
  admin_user_id := COALESCE(existing_admin_profile_id, gen_random_uuid());
  
  employee1_id := gen_random_uuid();
  employee2_id := gen_random_uuid();
  partner1_id := gen_random_uuid();
  partner2_id := gen_random_uuid();
  partner3_id := gen_random_uuid();
  sub1_id := gen_random_uuid();
  sub2_id := gen_random_uuid();
  sub3_id := gen_random_uuid();
  sub4_id := gen_random_uuid();
  sub5_id := gen_random_uuid();
  sub6_id := gen_random_uuid();
  sub7_id := gen_random_uuid();
  sub8_id := gen_random_uuid();
  wo1_id := gen_random_uuid();
  wo2_id := gen_random_uuid();
  wo3_id := gen_random_uuid();
  invoice1_id := gen_random_uuid();
  invoice2_id := gen_random_uuid();
  invoice3_id := gen_random_uuid();

  -- Insert Organizations
  INSERT INTO organizations (id, name, contact_email, organization_type, initials, is_active) VALUES
    (org_internal_id, 'WorkOrderPro Internal', 'admin@workorderpro.com', 'internal', 'WOP', true),
    (org_abc_id, 'ABC Property Management', 'contact@abc-property.com', 'partner', 'ABC', true),
    (org_xyz_id, 'XYZ Commercial Properties', 'info@xyz-commercial.com', 'partner', 'XYZ', true),
    (org_premium_id, 'Premium Facilities Group', 'support@premiumfacilities.com', 'partner', 'PFG', true),
    (org_pipes_id, 'Pipes & More Plumbing', 'service@pipesmore.com', 'subcontractor', 'PMP', true),
    (org_sparks_id, 'Sparks Electric', 'contact@sparkselectric.com', 'subcontractor', 'SPE', true),
    (org_cool_id, 'Cool Air HVAC', 'info@coolair.com', 'subcontractor', 'CAH', true),
    (org_wood_id, 'Wood Works Carpentry', 'hello@woodworks.com', 'subcontractor', 'WWC', true);

  -- Insert Trades
  INSERT INTO trades (id, name, description, is_active) VALUES
    (trade_plumbing_id, 'Plumbing', 'Water systems, pipes, fixtures, and drainage', true),
    (trade_electrical_id, 'Electrical', 'Electrical systems, wiring, and fixtures', true),
    (trade_hvac_id, 'HVAC', 'Heating, ventilation, and air conditioning systems', true),
    (trade_carpentry_id, 'Carpentry', 'Wood construction, repair, and finishing', true),
    (trade_painting_id, 'Painting', 'Interior and exterior painting services', true),
    (trade_general_id, 'General Maintenance', 'General facility maintenance and repairs', true),
    (trade_landscaping_id, 'Landscaping', 'Grounds maintenance and landscaping services', true),
    (gen_random_uuid(), 'Roofing', 'Roof installation, repair, and maintenance', true),
    (gen_random_uuid(), 'Flooring', 'Floor installation and refinishing', true),
    (gen_random_uuid(), 'Security Systems', 'Security system installation and maintenance', true);

  -- Insert Email Templates
  INSERT INTO email_templates (template_name, subject, html_content, text_content, is_active) VALUES
    ('work_order_created', 'New Work Order: {{work_order_number}}', '<h2>New Work Order Created</h2><p>Work Order: <strong>{{work_order_number}}</strong></p><p>Organization: {{organization_name}}</p><p>Description: {{description}}</p>', 'New Work Order Created\nWork Order: {{work_order_number}}\nOrganization: {{organization_name}}\nDescription: {{description}}', true),
    ('work_order_assigned', 'Work Order Assigned: {{work_order_number}}', '<h2>Work Order Assigned</h2><p>You have been assigned work order: <strong>{{work_order_number}}</strong></p><p>Due Date: {{due_date}}</p><p>Description: {{description}}</p>', 'Work Order Assigned\nWork Order: {{work_order_number}}\nDue Date: {{due_date}}\nDescription: {{description}}', true),
    ('work_order_completed', 'Work Order Completed: {{work_order_number}}', '<h2>Work Order Completed</h2><p>Work order <strong>{{work_order_number}}</strong> has been completed.</p><p>Completed by: {{completed_by}}</p><p>Completion Date: {{completion_date}}</p>', 'Work Order Completed\nWork Order: {{work_order_number}}\nCompleted by: {{completed_by}}\nCompletion Date: {{completion_date}}', true),
    ('report_submitted', 'Report Submitted for Work Order {{work_order_number}}', '<h2>Report Submitted</h2><p>A work report has been submitted for work order: <strong>{{work_order_number}}</strong></p><p>Submitted by: {{submitted_by}}</p><p>Amount: ${{invoice_amount}}</p>', 'Report Submitted\nWork Order: {{work_order_number}}\nSubmitted by: {{submitted_by}}\nAmount: ${{invoice_amount}}', true),
    ('report_reviewed', 'Report {{status}} for Work Order {{work_order_number}}', '<h2>Report {{status}}</h2><p>Your work report for work order <strong>{{work_order_number}}</strong> has been {{status}}.</p><p>Review Notes: {{review_notes}}</p>', 'Report {{status}}\nWork Order: {{work_order_number}}\nReview Notes: {{review_notes}}', true);

  -- Insert/Update Admin Profile (handles existing admin gracefully)
  INSERT INTO profiles (id, user_id, email, first_name, last_name, user_type, is_active, is_employee, hourly_cost_rate, hourly_billable_rate) 
  VALUES (admin_user_id, v_user_id, 'admin@workorderpro.com', 'System', 'Administrator', 'admin', true, true, 75.00, 125.00)
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
    updated_at = now()
  RETURNING id INTO admin_user_id;

  -- Insert Other User Profiles
  INSERT INTO profiles (id, user_id, email, first_name, last_name, user_type, is_active, is_employee, hourly_cost_rate, hourly_billable_rate) VALUES
    (employee1_id, gen_random_uuid(), 'john.smith@workorderpro.com', 'John', 'Smith', 'employee', true, true, 45.00, 85.00),
    (employee2_id, gen_random_uuid(), 'sarah.johnson@workorderpro.com', 'Sarah', 'Johnson', 'employee', true, true, 50.00, 90.00),
    (partner1_id, gen_random_uuid(), 'manager@abc-property.com', 'Michael', 'Brown', 'partner', true, false, NULL, NULL),
    (partner2_id, gen_random_uuid(), 'operations@xyz-commercial.com', 'Lisa', 'Davis', 'partner', true, false, NULL, NULL),
    (partner3_id, gen_random_uuid(), 'facilities@premiumfacilities.com', 'Robert', 'Wilson', 'partner', true, false, NULL, NULL),
    (sub1_id, gen_random_uuid(), 'joe@pipesmore.com', 'Joe', 'Plumber', 'subcontractor', true, false, NULL, NULL),
    (sub2_id, gen_random_uuid(), 'mike@sparkselectric.com', 'Mike', 'Sparks', 'subcontractor', true, false, NULL, NULL),
    (sub3_id, gen_random_uuid(), 'tom@coolair.com', 'Tom', 'Coolman', 'subcontractor', true, false, NULL, NULL),
    (sub4_id, gen_random_uuid(), 'bob@woodworks.com', 'Bob', 'Builder', 'subcontractor', true, false, NULL, NULL),
    (sub5_id, gen_random_uuid(), 'alex@pipesmore.com', 'Alex', 'Drain', 'subcontractor', true, false, NULL, NULL),
    (sub6_id, gen_random_uuid(), 'sam@sparkselectric.com', 'Sam', 'Voltage', 'subcontractor', true, false, NULL, NULL),
    (sub7_id, gen_random_uuid(), 'chris@coolair.com', 'Chris', 'Frost', 'subcontractor', true, false, NULL, NULL),
    (sub8_id, gen_random_uuid(), 'dave@woodworks.com', 'Dave', 'Carpenter', 'subcontractor', true, false, NULL, NULL);

  -- Insert User-Organization relationships (handle admin organization assignment)
  INSERT INTO user_organizations (user_id, organization_id) VALUES
    (admin_user_id, org_internal_id),
    (employee1_id, org_internal_id),
    (employee2_id, org_internal_id),
    (partner1_id, org_abc_id),
    (partner2_id, org_xyz_id),
    (partner3_id, org_premium_id),
    (sub1_id, org_pipes_id),
    (sub2_id, org_sparks_id),
    (sub3_id, org_cool_id),
    (sub4_id, org_wood_id),
    (sub5_id, org_pipes_id),
    (sub6_id, org_sparks_id),
    (sub7_id, org_cool_id),
    (sub8_id, org_wood_id)
  ON CONFLICT (user_id, organization_id) DO NOTHING;

  -- Insert Partner Locations
  INSERT INTO partner_locations (organization_id, location_name, location_number, street_address, city, state, zip_code, contact_name, contact_email, is_active) VALUES
    (org_abc_id, 'ABC Downtown Office', '001', '123 Main Street', 'Downtown', 'CA', '90210', 'Jane Manager', 'downtown@abc-property.com', true),
    (org_abc_id, 'ABC Westside Plaza', '002', '456 West Avenue', 'Westside', 'CA', '90211', 'Bob Supervisor', 'westside@abc-property.com', true),
    (org_abc_id, 'ABC Northgate Center', '003', '789 North Road', 'Northgate', 'CA', '90212', 'Alice Coordinator', 'northgate@abc-property.com', true),
    (org_xyz_id, 'XYZ Corporate Tower', '101', '321 Business Blvd', 'Corporate', 'NY', '10001', 'Mark Executive', 'corporate@xyz-commercial.com', true),
    (org_xyz_id, 'XYZ Tech Campus', '102', '654 Innovation Drive', 'Tech City', 'NY', '10002', 'Emma Director', 'tech@xyz-commercial.com', true),
    (org_xyz_id, 'XYZ Industrial Park', '103', '987 Industry Lane', 'Industrial', 'NY', '10003', 'Ryan Manager', 'industrial@xyz-commercial.com', true),
    (org_premium_id, 'Premium Luxury Mall', '201', '111 Luxury Lane', 'Uptown', 'FL', '33101', 'Grace Manager', 'luxury@premiumfacilities.com', true),
    (org_premium_id, 'Premium Business Center', '202', '222 Enterprise Street', 'Business District', 'FL', '33102', 'Kevin Director', 'business@premiumfacilities.com', true),
    (org_premium_id, 'Premium Retail Complex', '203', '333 Shopping Way', 'Retail Zone', 'FL', '33103', 'Nina Supervisor', 'retail@premiumfacilities.com', true),
    (org_premium_id, 'Premium Office Park', '204', '444 Office Drive', 'Office District', 'FL', '33104', 'Paul Coordinator', 'office@premiumfacilities.com', true);

  -- Insert Work Orders
  INSERT INTO work_orders (id, work_order_number, title, description, organization_id, trade_id, status, created_by, date_submitted, store_location, street_address, city, state, zip_code, assigned_to, assigned_to_type, date_assigned) VALUES
    (wo1_id, 'ABC-001-001', 'Leaky Faucet Repair', 'Kitchen faucet dripping constantly, needs immediate attention', org_abc_id, trade_plumbing_id, 'assigned', partner1_id, now() - interval '5 days', 'ABC Downtown Office', '123 Main Street', 'Downtown', 'CA', '90210', sub1_id, 'subcontractor', now() - interval '4 days'),
    (wo2_id, 'ABC-001-002', 'Electrical Outlet Installation', 'Install 3 new outlets in conference room', org_abc_id, trade_electrical_id, 'in_progress', partner1_id, now() - interval '3 days', 'ABC Downtown Office', '123 Main Street', 'Downtown', 'CA', '90210', sub2_id, 'subcontractor', now() - interval '2 days'),
    (wo3_id, 'XYZ-101-001', 'HVAC System Maintenance', 'Quarterly maintenance check on main HVAC system', org_xyz_id, trade_hvac_id, 'completed', partner2_id, now() - interval '10 days', 'XYZ Corporate Tower', '321 Business Blvd', 'Corporate', 'NY', '10001', sub3_id, 'subcontractor', now() - interval '8 days'),
    (gen_random_uuid(), 'PFG-201-001', 'Carpet Cleaning', 'Deep clean carpets in main lobby area', org_premium_id, trade_general_id, 'received', partner3_id, now() - interval '1 day', 'Premium Luxury Mall', '111 Luxury Lane', 'Uptown', 'FL', '33101', NULL, NULL, NULL),
    (gen_random_uuid(), 'ABC-002-001', 'Paint Touch-ups', 'Touch up paint in lobby and hallways', org_abc_id, trade_painting_id, 'assigned', partner1_id, now() - interval '2 days', 'ABC Westside Plaza', '456 West Avenue', 'Westside', 'CA', '90211', sub4_id, 'subcontractor', now() - interval '1 day'),
    (gen_random_uuid(), 'XYZ-102-001', 'Door Lock Repair', 'Main entrance door lock sticking', org_xyz_id, trade_general_id, 'in_progress', partner2_id, now() - interval '4 days', 'XYZ Tech Campus', '654 Innovation Drive', 'Tech City', 'NY', '10002', employee1_id, 'internal', now() - interval '3 days'),
    (gen_random_uuid(), 'PFG-202-001', 'Plumbing Inspection', 'Annual plumbing system inspection', org_premium_id, trade_plumbing_id, 'assigned', partner3_id, now() - interval '6 days', 'Premium Business Center', '222 Enterprise Street', 'Business District', 'FL', '33102', sub5_id, 'subcontractor', now() - interval '5 days'),
    (gen_random_uuid(), 'ABC-003-001', 'Landscape Maintenance', 'Trim bushes and plant seasonal flowers', org_abc_id, trade_landscaping_id, 'completed', partner1_id, now() - interval '15 days', 'ABC Northgate Center', '789 North Road', 'Northgate', 'CA', '90212', sub6_id, 'subcontractor', now() - interval '12 days'),
    (gen_random_uuid(), 'XYZ-103-001', 'Electrical Panel Upgrade', 'Upgrade main electrical panel for increased capacity', org_xyz_id, trade_electrical_id, 'assigned', partner2_id, now() - interval '7 days', 'XYZ Industrial Park', '987 Industry Lane', 'Industrial', 'NY', '10003', sub7_id, 'subcontractor', now() - interval '6 days'),
    (gen_random_uuid(), 'PFG-203-001', 'Carpentry Repair', 'Repair damaged wooden fixtures in food court', org_premium_id, trade_carpentry_id, 'in_progress', partner3_id, now() - interval '8 days', 'Premium Retail Complex', '333 Shopping Way', 'Retail Zone', 'FL', '33103', sub8_id, 'subcontractor', now() - interval '7 days'),
    (gen_random_uuid(), 'ABC-001-003', 'HVAC Filter Replacement', 'Replace all HVAC filters throughout building', org_abc_id, trade_hvac_id, 'received', partner1_id, now() - interval '1 hour', 'ABC Downtown Office', '123 Main Street', 'Downtown', 'CA', '90210', NULL, NULL, NULL),
    (gen_random_uuid(), 'XYZ-101-002', 'Emergency Lighting Test', 'Test and repair emergency lighting system', org_xyz_id, trade_electrical_id, 'assigned', partner2_id, now() - interval '9 days', 'XYZ Corporate Tower', '321 Business Blvd', 'Corporate', 'NY', '10001', employee2_id, 'internal', now() - interval '8 days'),
    (gen_random_uuid(), 'PFG-204-001', 'Bathroom Deep Clean', 'Deep cleaning of all public restrooms', org_premium_id, trade_general_id, 'completed', partner3_id, now() - interval '20 days', 'Premium Office Park', '444 Office Drive', 'Office District', 'FL', '33104', employee1_id, 'internal', now() - interval '18 days'),
    (gen_random_uuid(), 'ABC-002-002', 'Roof Leak Investigation', 'Investigate and repair roof leak in storage area', org_abc_id, trade_general_id, 'in_progress', partner1_id, now() - interval '11 days', 'ABC Westside Plaza', '456 West Avenue', 'Westside', 'CA', '90211', sub1_id, 'subcontractor', now() - interval '10 days'),
    (gen_random_uuid(), 'XYZ-102-002', 'Security System Update', 'Update security camera firmware and settings', org_xyz_id, trade_electrical_id, 'assigned', partner2_id, now() - interval '5 days', 'XYZ Tech Campus', '654 Innovation Drive', 'Tech City', 'NY', '10002', sub2_id, 'subcontractor', now() - interval '4 days'),
    (gen_random_uuid(), 'PFG-201-002', 'Exterior Painting', 'Paint exterior walls of main entrance', org_premium_id, trade_painting_id, 'received', partner3_id, now() - interval '2 hours', 'Premium Luxury Mall', '111 Luxury Lane', 'Uptown', 'FL', '33101', NULL, NULL, NULL);

  -- Insert Work Order Assignments
  INSERT INTO work_order_assignments (work_order_id, assigned_to, assigned_by, assignment_type, assigned_organization_id, notes) VALUES
    (wo1_id, sub1_id, admin_user_id, 'lead', org_pipes_id, 'Urgent repair needed'),
    (wo2_id, sub2_id, admin_user_id, 'lead', org_sparks_id, 'Standard installation'),
    (wo3_id, sub3_id, admin_user_id, 'lead', org_cool_id, 'Quarterly maintenance schedule');

  -- Insert Work Order Reports
  INSERT INTO work_order_reports (work_order_id, subcontractor_user_id, work_performed, materials_used, hours_worked, invoice_amount, status, submitted_at) VALUES
    (wo3_id, sub3_id, 'Completed full HVAC system maintenance including filter replacement, coil cleaning, and system testing', 'HVAC filters (4), cleaning solution, lubricants', 4.5, 450.00, 'approved', now() - interval '2 days'),
    (wo1_id, sub1_id, 'Repaired kitchen faucet by replacing worn cartridge and O-rings', 'Faucet cartridge, O-rings, plumber''s tape', 1.5, 150.00, 'submitted', now() - interval '1 day'),
    (wo2_id, sub2_id, 'Installed 3 new electrical outlets in conference room with proper grounding', 'Electrical outlets (3), wire, junction boxes', 3.0, 275.00, 'submitted', now() - interval '6 hours');

  -- Insert Invoices
  INSERT INTO invoices (id, internal_invoice_number, external_invoice_number, subcontractor_organization_id, submitted_by, status, total_amount, submitted_at) VALUES
    (invoice1_id, 'INV-2024-00001', 'PIPES-2024-001', org_pipes_id, sub1_id, 'submitted', 150.00, now() - interval '1 day'),
    (invoice2_id, 'INV-2024-00002', 'SPARKS-2024-001', org_sparks_id, sub2_id, 'draft', 275.00, NULL),
    (invoice3_id, 'INV-2024-00003', 'COOL-2024-001', org_cool_id, sub3_id, 'approved', 450.00, now() - interval '3 days');

  -- Insert Invoice Work Orders
  INSERT INTO invoice_work_orders (invoice_id, work_order_id, amount, description) VALUES
    (invoice1_id, wo1_id, 150.00, 'Faucet repair - parts and labor'),
    (invoice2_id, wo2_id, 275.00, 'Electrical outlet installation'),
    (invoice3_id, wo3_id, 450.00, 'HVAC maintenance service');

  -- Insert Employee Reports
  INSERT INTO employee_reports (employee_user_id, work_order_id, report_date, hours_worked, hourly_rate_snapshot, work_performed, notes) VALUES
    (employee1_id, (SELECT id FROM work_orders WHERE work_order_number = 'XYZ-102-001' LIMIT 1), CURRENT_DATE - 2, 2.5, 45.00, 'Repaired door lock mechanism and tested operation', 'Lock was jamming due to worn internal components'),
    (employee2_id, (SELECT id FROM work_orders WHERE work_order_number = 'XYZ-101-002' LIMIT 1), CURRENT_DATE - 1, 1.5, 50.00, 'Tested emergency lighting system, replaced 2 bulbs', 'All emergency lights now functioning properly'),
    (employee1_id, (SELECT id FROM work_orders WHERE work_order_number = 'PFG-204-001' LIMIT 1), CURRENT_DATE - 15, 4.0, 45.00, 'Deep cleaned all public restrooms, restocked supplies', 'Used commercial-grade cleaning products for deep sanitization');

  -- Insert Receipts
  INSERT INTO receipts (employee_user_id, vendor_name, amount, description, receipt_date, notes) VALUES
    (employee1_id, 'Hardware Store Plus', 45.50, 'Door lock parts and lubricant', CURRENT_DATE - 2, 'For XYZ door lock repair'),
    (employee2_id, 'Electric Supply Co', 28.99, 'Emergency light bulbs (2 pack)', CURRENT_DATE - 1, 'Replacement bulbs for emergency lighting'),
    (employee1_id, 'Cleaning Solutions Inc', 67.25, 'Commercial cleaning supplies', CURRENT_DATE - 15, 'Supplies for restroom deep cleaning');

  RETURN json_build_object(
    'success', true,
    'message', 'Test data seeded successfully',
    'details', json_build_object(
      'organizations', 8,
      'trades', 10,
      'email_templates', 5,
      'profiles', 14,
      'user_organizations', 14,
      'partner_locations', 10,
      'work_orders', 16,
      'work_order_assignments', 3,
      'work_order_reports', 3,
      'invoices', 3,
      'invoice_work_orders', 3,
      'employee_reports', 3,
      'receipts', 3
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
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION seed_test_data() TO authenticated;