-- Fix foreign key constraint violation in seed_test_data function
-- Use existing authenticated user ID for all test profiles' user_id field

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
  
  -- Test profile IDs (unique profile IDs, but same user_id)
  admin_profile_id uuid;
  partner1_profile_id uuid;
  partner2_profile_id uuid;
  sub1_profile_id uuid;
  sub2_profile_id uuid;
  emp1_profile_id uuid;
  
  -- Work order IDs
  wo1_id uuid;
  wo2_id uuid;
  wo3_id uuid;
  wo4_id uuid;
  
  -- Invoice IDs
  inv1_id uuid;
  inv2_id uuid;
  
  -- Report IDs
  report1_id uuid;
  report2_id uuid;
  
  -- Assignment IDs
  assign1_id uuid;
  assign2_id uuid;
  
  -- Receipt IDs
  receipt1_id uuid;
  receipt2_id uuid;
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

  -- Get existing trade IDs (use real trades instead of creating new ones)
  SELECT id INTO trade_plumbing_id FROM trades WHERE name ILIKE '%plumb%' LIMIT 1;
  SELECT id INTO trade_electrical_id FROM trades WHERE name ILIKE '%electric%' LIMIT 1;
  SELECT id INTO trade_hvac_id FROM trades WHERE name ILIKE '%hvac%' OR name ILIKE '%air%' LIMIT 1;
  SELECT id INTO trade_general_id FROM trades WHERE name ILIKE '%general%' OR name ILIKE '%maintenance%' LIMIT 1;
  SELECT id INTO trade_carpentry_id FROM trades WHERE name ILIKE '%carpen%' OR name ILIKE '%wood%' LIMIT 1;

  -- Generate UUIDs for new data
  org_internal_id := gen_random_uuid();
  org_abc_id := gen_random_uuid();
  org_xyz_id := gen_random_uuid();
  org_premium_id := gen_random_uuid();
  org_pipes_id := gen_random_uuid();
  org_sparks_id := gen_random_uuid();
  org_cool_id := gen_random_uuid();
  org_wood_id := gen_random_uuid();
  
  -- Use existing admin profile ID, generate new profile IDs for others
  admin_profile_id := COALESCE(existing_admin_profile_id, gen_random_uuid());
  partner1_profile_id := gen_random_uuid();
  partner2_profile_id := gen_random_uuid();
  sub1_profile_id := gen_random_uuid();
  sub2_profile_id := gen_random_uuid();
  emp1_profile_id := gen_random_uuid();
  
  wo1_id := gen_random_uuid();
  wo2_id := gen_random_uuid();
  wo3_id := gen_random_uuid();
  wo4_id := gen_random_uuid();
  
  inv1_id := gen_random_uuid();
  inv2_id := gen_random_uuid();
  
  report1_id := gen_random_uuid();
  report2_id := gen_random_uuid();
  
  assign1_id := gen_random_uuid();
  assign2_id := gen_random_uuid();
  
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

  -- 2. Insert Test User Profiles (ALL use the same user_id but have unique profile ids)
  INSERT INTO profiles (id, user_id, email, first_name, last_name, user_type, company_name, is_active, is_employee, hourly_cost_rate, hourly_billable_rate) VALUES
    (admin_profile_id, v_user_id, 'admin@workorderpro.com', 'System', 'Administrator', 'admin', 'WorkOrderPro', true, true, 75.00, 125.00),
    (partner1_profile_id, v_user_id, 'partner1@abc.com', 'Sarah', 'Johnson', 'partner', 'ABC Property Management', true, false, NULL, NULL),
    (partner2_profile_id, v_user_id, 'partner2@xyz.com', 'Mike', 'Chen', 'partner', 'XYZ Commercial Properties', true, false, NULL, NULL),
    (sub1_profile_id, v_user_id, 'plumber@pipesmore.com', 'Tom', 'Wilson', 'subcontractor', 'Pipes & More Plumbing', true, false, 45.00, 85.00),
    (sub2_profile_id, v_user_id, 'electrician@sparks.com', 'Lisa', 'Anderson', 'subcontractor', 'Sparks Electric', true, false, 50.00, 95.00),
    (emp1_profile_id, v_user_id, 'maintenance@workorderpro.com', 'Alex', 'Thompson', 'employee', 'WorkOrderPro', true, true, 35.00, 65.00)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    updated_at = now();

  -- 3. Insert User-Organization relationships
  INSERT INTO user_organizations (user_id, organization_id) VALUES
    (admin_profile_id, org_internal_id),
    (partner1_profile_id, org_abc_id),
    (partner2_profile_id, org_xyz_id),
    (sub1_profile_id, org_pipes_id),
    (sub2_profile_id, org_sparks_id),
    (emp1_profile_id, org_internal_id)
  ON CONFLICT (user_id, organization_id) DO NOTHING;

  -- 4. Insert Partner Locations
  INSERT INTO partner_locations (organization_id, location_name, location_number, street_address, city, state, zip_code, contact_name, contact_email, is_active) VALUES
    (org_abc_id, 'ABC Downtown Office', '001', '123 Main Street', 'Downtown', 'CA', '90210', 'Jane Manager', 'downtown@abc-property.com', true),
    (org_abc_id, 'ABC Westside Plaza', '002', '456 West Avenue', 'Westside', 'CA', '90211', 'Bob Supervisor', 'westside@abc-property.com', true),
    (org_xyz_id, 'XYZ Corporate Tower', '101', '321 Business Blvd', 'Corporate', 'NY', '10001', 'Mark Executive', 'corporate@xyz-commercial.com', true),
    (org_xyz_id, 'XYZ Tech Campus', '102', '654 Innovation Drive', 'Tech City', 'NY', '10002', 'Emma Director', 'tech@xyz-commercial.com', true),
    (org_premium_id, 'Premium Luxury Mall', '201', '111 Luxury Lane', 'Uptown', 'FL', '33101', 'Grace Manager', 'luxury@premiumfacilities.com', true);

  -- 5. Insert Work Orders (using existing trade IDs)
  INSERT INTO work_orders (id, work_order_number, title, description, organization_id, trade_id, status, created_by, assigned_to, date_submitted, store_location, street_address, city, state, zip_code) VALUES
    (wo1_id, 'ABC-001-001', 'Leaky Faucet Repair', 'Kitchen faucet dripping constantly', org_abc_id, trade_plumbing_id, 'assigned', admin_profile_id, sub1_profile_id, now() - interval '5 days', 'ABC Downtown Office', '123 Main Street', 'Downtown', 'CA', '90210'),
    (wo2_id, 'ABC-002-001', 'Electrical Outlet Installation', 'Install 3 new outlets in conference room', org_abc_id, trade_electrical_id, 'in_progress', admin_profile_id, sub2_profile_id, now() - interval '3 days', 'ABC Westside Plaza', '456 West Avenue', 'Westside', 'CA', '90211'),
    (wo3_id, 'XYZ-101-001', 'HVAC System Maintenance', 'Quarterly maintenance check on main HVAC system', org_xyz_id, trade_hvac_id, 'received', admin_profile_id, NULL, now() - interval '2 days', 'XYZ Corporate Tower', '321 Business Blvd', 'Corporate', 'NY', '10001'),
    (wo4_id, 'PFG-201-001', 'General Maintenance', 'Monthly facility maintenance tasks', org_premium_id, trade_general_id, 'completed', admin_profile_id, emp1_profile_id, now() - interval '10 days', 'Premium Luxury Mall', '111 Luxury Lane', 'Uptown', 'FL', '33101');

  -- 6. Insert Work Order Assignments
  INSERT INTO work_order_assignments (id, work_order_id, assigned_to, assigned_by, assignment_type, assigned_organization_id, notes) VALUES
    (assign1_id, wo1_id, sub1_profile_id, admin_profile_id, 'lead', org_pipes_id, 'Urgent repair needed'),
    (assign2_id, wo2_id, sub2_profile_id, admin_profile_id, 'lead', org_sparks_id, 'Standard electrical work');

  -- 7. Insert Work Order Reports
  INSERT INTO work_order_reports (id, work_order_id, subcontractor_user_id, work_performed, materials_used, hours_worked, invoice_amount, invoice_number, status, notes) VALUES
    (report1_id, wo2_id, sub2_profile_id, 'Installed 3 new electrical outlets in conference room', 'Outlets (3), wire, junction boxes', 4.5, 425.00, 'SPE-2024-001', 'approved', 'Work completed successfully'),
    (report2_id, wo4_id, emp1_profile_id, 'Completed monthly maintenance checklist', 'Cleaning supplies, light bulbs', 6.0, 0.00, NULL, 'approved', 'Internal employee work');

  -- 8. Insert Work Order Attachments
  INSERT INTO work_order_attachments (work_order_id, work_order_report_id, file_name, file_url, file_type, uploaded_by_user_id) VALUES
    (wo1_id, NULL, 'before_photo.jpg', 'https://example.com/before.jpg', 'photo', admin_profile_id),
    (NULL, report1_id, 'completion_photo.jpg', 'https://example.com/complete.jpg', 'photo', sub2_profile_id),
    (NULL, report2_id, 'maintenance_checklist.pdf', 'https://example.com/checklist.pdf', 'document', emp1_profile_id);

  -- 9. Insert Invoices
  INSERT INTO invoices (id, internal_invoice_number, external_invoice_number, subcontractor_organization_id, status, submitted_by, submitted_at, total_amount) VALUES
    (inv1_id, 'INV-2024-00001', 'SPE-2024-001', org_sparks_id, 'approved', sub2_profile_id, now() - interval '1 day', 425.00),
    (inv2_id, 'INV-2024-00002', 'PMP-2024-001', org_pipes_id, 'submitted', sub1_profile_id, now() - interval '2 hours', 350.00);

  -- 10. Insert Invoice Work Orders
  INSERT INTO invoice_work_orders (invoice_id, work_order_id, work_order_report_id, amount, description) VALUES
    (inv1_id, wo2_id, report1_id, 425.00, 'Electrical outlet installation'),
    (inv2_id, wo1_id, NULL, 350.00, 'Plumbing repair estimate');

  -- 11. Insert Invoice Attachments
  INSERT INTO invoice_attachments (invoice_id, file_name, file_url, file_type, uploaded_by) VALUES
    (inv1_id, 'invoice_SPE-2024-001.pdf', 'https://example.com/invoice1.pdf', 'invoice', sub2_profile_id),
    (inv2_id, 'invoice_PMP-2024-001.pdf', 'https://example.com/invoice2.pdf', 'invoice', sub1_profile_id);

  -- 12. Insert Employee Reports
  INSERT INTO employee_reports (employee_user_id, work_order_id, report_date, hours_worked, hourly_rate_snapshot, work_performed, notes) VALUES
    (emp1_profile_id, wo4_id, (now() - interval '10 days')::date, 6.0, 35.00, 'Monthly facility maintenance', 'Completed all scheduled tasks'),
    (emp1_profile_id, wo1_id, (now() - interval '2 days')::date, 2.0, 35.00, 'Initial assessment of plumbing issue', 'Confirmed leak, scheduled contractor');

  -- 13. Insert Receipts
  INSERT INTO receipts (id, employee_user_id, vendor_name, amount, receipt_date, description, notes) VALUES
    (receipt1_id, emp1_profile_id, 'Home Depot', 45.67, (now() - interval '3 days')::date, 'Cleaning supplies and light bulbs', 'For monthly maintenance'),
    (receipt2_id, emp1_profile_id, 'Ace Hardware', 23.45, (now() - interval '1 day')::date, 'Emergency plumbing supplies', 'Temporary fix materials');

  -- 14. Insert Receipt Work Orders (allocating receipts to work orders)
  INSERT INTO receipt_work_orders (receipt_id, work_order_id, allocated_amount, allocation_notes) VALUES
    (receipt1_id, wo4_id, 45.67, 'Monthly maintenance supplies'),
    (receipt2_id, wo1_id, 23.45, 'Emergency plumbing repair supplies');

  RETURN json_build_object(
    'success', true,
    'message', 'Comprehensive test data seeded successfully',
    'details', json_build_object(
      'organizations', 8,
      'profiles', 6,
      'user_organizations', 6,
      'partner_locations', 5,
      'work_orders', 4,
      'work_order_assignments', 2,
      'work_order_reports', 2,
      'work_order_attachments', 3,
      'invoices', 2,
      'invoice_work_orders', 2,
      'invoice_attachments', 2,
      'employee_reports', 2,
      'receipts', 2,
      'receipt_work_orders', 2
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