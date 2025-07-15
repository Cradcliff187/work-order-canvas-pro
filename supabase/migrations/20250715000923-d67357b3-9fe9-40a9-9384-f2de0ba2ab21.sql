-- Create organization assignment validation and cleanup function
CREATE OR REPLACE FUNCTION public.ensure_single_organization_assignment()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cleanup_count integer := 0;
  validation_errors jsonb := '[]';
  user_record record;
  org_count integer;
  expected_org_type public.organization_type;
  actual_org_type public.organization_type;
BEGIN
  -- Clean up multiple organization assignments for non-admin users
  FOR user_record IN 
    SELECT p.id, p.user_type, p.email, p.first_name, p.last_name
    FROM profiles p
    WHERE p.user_type != 'admin'
  LOOP
    -- Count organizations for this user
    SELECT COUNT(*) INTO org_count
    FROM user_organizations uo
    WHERE uo.user_id = user_record.id;
    
    -- If user has multiple organizations, keep only the first matching one
    IF org_count > 1 THEN
      -- Determine expected organization type
      expected_org_type := CASE user_record.user_type
        WHEN 'partner' THEN 'partner'::organization_type
        WHEN 'subcontractor' THEN 'subcontractor'::organization_type
        WHEN 'employee' THEN 'internal'::organization_type
        ELSE NULL
      END;
      
      -- Delete all but the first matching organization
      WITH matching_orgs AS (
        SELECT uo.id, row_number() OVER (ORDER BY uo.created_at) as rn
        FROM user_organizations uo
        JOIN organizations o ON o.id = uo.organization_id
        WHERE uo.user_id = user_record.id
        AND (expected_org_type IS NULL OR o.organization_type = expected_org_type)
      )
      DELETE FROM user_organizations
      WHERE user_id = user_record.id
      AND id IN (
        SELECT id FROM matching_orgs WHERE rn > 1
      );
      
      -- Delete any remaining non-matching organizations
      DELETE FROM user_organizations uo
      USING organizations o
      WHERE uo.organization_id = o.id
      AND uo.user_id = user_record.id
      AND expected_org_type IS NOT NULL
      AND o.organization_type != expected_org_type;
      
      cleanup_count := cleanup_count + 1;
    END IF;
    
    -- Validate remaining assignment
    SELECT COUNT(*) INTO org_count
    FROM user_organizations uo
    WHERE uo.user_id = user_record.id;
    
    IF org_count = 0 AND user_record.user_type != 'admin' THEN
      validation_errors := validation_errors || jsonb_build_object(
        'user_id', user_record.id,
        'email', user_record.email,
        'error', 'No organization assigned',
        'user_type', user_record.user_type
      );
    ELSIF org_count = 1 THEN
      -- Check if organization type matches user type
      SELECT o.organization_type INTO actual_org_type
      FROM user_organizations uo
      JOIN organizations o ON o.id = uo.organization_id
      WHERE uo.user_id = user_record.id;
      
      expected_org_type := CASE user_record.user_type
        WHEN 'partner' THEN 'partner'::organization_type
        WHEN 'subcontractor' THEN 'subcontractor'::organization_type
        WHEN 'employee' THEN 'internal'::organization_type
        ELSE NULL
      END;
      
      IF expected_org_type IS NOT NULL AND actual_org_type != expected_org_type THEN
        validation_errors := validation_errors || jsonb_build_object(
          'user_id', user_record.id,
          'email', user_record.email,
          'error', 'Organization type mismatch',
          'user_type', user_record.user_type,
          'expected_org_type', expected_org_type,
          'actual_org_type', actual_org_type
        );
      END IF;
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'cleaned_up_users', cleanup_count,
    'validation_errors', validation_errors,
    'message', format('Cleaned up %s users with multiple organizations', cleanup_count)
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'message', 'Failed to ensure single organization assignments'
  );
END;
$$;

-- Update seed_test_data function to ensure single organization assignments
CREATE OR REPLACE FUNCTION public.seed_test_data()
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
  partner1_id uuid;
  partner2_id uuid;
  partner3_id uuid;
  sub1_id uuid;
  sub2_id uuid;
  sub3_id uuid;
  sub4_id uuid;
  emp1_id uuid;
  emp2_id uuid;
  wo1_id uuid;
  wo2_id uuid;
  wo3_id uuid;
  cleanup_result jsonb;
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

  -- Generate UUIDs for organizations
  org_internal_id := gen_random_uuid();
  org_abc_id := gen_random_uuid();
  org_xyz_id := gen_random_uuid();
  org_premium_id := gen_random_uuid();
  org_pipes_id := gen_random_uuid();
  org_sparks_id := gen_random_uuid();
  org_cool_id := gen_random_uuid();
  org_wood_id := gen_random_uuid();
  
  -- Generate UUIDs for trades
  trade_plumbing_id := gen_random_uuid();
  trade_electrical_id := gen_random_uuid();
  trade_hvac_id := gen_random_uuid();
  trade_carpentry_id := gen_random_uuid();
  trade_painting_id := gen_random_uuid();
  trade_general_id := gen_random_uuid();
  trade_landscaping_id := gen_random_uuid();
  
  -- Generate UUIDs for test users
  admin_user_id := COALESCE(existing_admin_profile_id, gen_random_uuid());
  partner1_id := gen_random_uuid();
  partner2_id := gen_random_uuid();
  partner3_id := gen_random_uuid();
  sub1_id := gen_random_uuid();
  sub2_id := gen_random_uuid();
  sub3_id := gen_random_uuid();
  sub4_id := gen_random_uuid();
  emp1_id := gen_random_uuid();
  emp2_id := gen_random_uuid();
  
  wo1_id := gen_random_uuid();
  wo2_id := gen_random_uuid();
  wo3_id := gen_random_uuid();

  -- Insert Organizations
  INSERT INTO organizations (id, name, contact_email, organization_type, initials, is_active) VALUES
    (org_internal_id, 'WorkOrderPro Internal', 'admin@workorderpro.com', 'internal', 'WOP', true),
    (org_abc_id, 'ABC Property Management', 'contact@abc-property.com', 'partner', 'ABC', true),
    (org_xyz_id, 'XYZ Commercial Properties', 'info@xyz-commercial.com', 'partner', 'XYZ', true),
    (org_premium_id, 'Premium Facilities Group', 'support@premiumfacilities.com', 'partner', 'PFG', true),
    (org_pipes_id, 'Pipes & More Plumbing', 'service@pipesmore.com', 'subcontractor', 'PMP', true),
    (org_sparks_id, 'Sparks Electric', 'contact@sparkselectric.com', 'subcontractor', 'SPE', true),
    (org_cool_id, 'Cool Air HVAC', 'info@coolair.com', 'subcontractor', 'CAH', true),
    (org_wood_id, 'Wood Works Carpentry', 'hello@woodworks.com', 'subcontractor', 'WWC', true)
  ON CONFLICT (name) DO UPDATE SET
    contact_email = EXCLUDED.contact_email,
    organization_type = EXCLUDED.organization_type,
    initials = EXCLUDED.initials;

  -- Insert Trades
  INSERT INTO trades (id, name, description, is_active) VALUES
    (trade_plumbing_id, 'Plumbing', 'Water systems, pipes, fixtures, and drainage', true),
    (trade_electrical_id, 'Electrical', 'Electrical systems, wiring, and fixtures', true),
    (trade_hvac_id, 'HVAC', 'Heating, ventilation, and air conditioning systems', true),
    (trade_carpentry_id, 'Carpentry', 'Wood construction, repair, and finishing', true),
    (trade_painting_id, 'Painting', 'Interior and exterior painting services', true),
    (trade_general_id, 'General Maintenance', 'General facility maintenance and repairs', true),
    (trade_landscaping_id, 'Landscaping', 'Grounds maintenance and landscaping services', true)
  ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active;

  -- Insert Email Templates
  INSERT INTO email_templates (template_name, subject, html_content, text_content, is_active) VALUES
    ('work_order_created', 'New Work Order: {{work_order_number}}', '<h2>New Work Order Created</h2><p>Work Order: <strong>{{work_order_number}}</strong></p>', 'New Work Order Created', true),
    ('work_order_assigned', 'Work Order Assigned: {{work_order_number}}', '<h2>Work Order Assigned</h2><p>You have been assigned work order: <strong>{{work_order_number}}</strong></p>', 'Work Order Assigned', true),
    ('work_order_completed', 'Work Order Completed: {{work_order_number}}', '<h2>Work Order Completed</h2><p>Work order <strong>{{work_order_number}}</strong> has been completed.</p>', 'Work Order Completed', true)
  ON CONFLICT (template_name) DO UPDATE SET
    subject = EXCLUDED.subject,
    html_content = EXCLUDED.html_content,
    text_content = EXCLUDED.text_content,
    is_active = EXCLUDED.is_active;

  -- Clear existing user-organization relationships for test users
  DELETE FROM user_organizations 
  WHERE user_id IN (
    SELECT id FROM profiles 
    WHERE email LIKE '%@abc.com' 
    OR email LIKE '%@xyz.com' 
    OR email LIKE '%@premium.com'
    OR email LIKE '%@pipesmore.com'
    OR email LIKE '%@sparks.com'
    OR email LIKE '%@coolair.com'
    OR email LIKE '%@woodworks.com'
    OR email LIKE 'maintenance@workorderpro.com'
    OR email LIKE 'supervisor@workorderpro.com'
  );

  -- Insert Test User Profiles (these will be available for impersonation)
  INSERT INTO profiles (id, user_id, email, first_name, last_name, user_type, company_name, is_active, is_employee) VALUES
    -- Keep existing admin (will be updated if exists)
    (admin_user_id, v_user_id, 'admin@workorderpro.com', 'System', 'Administrator', 'admin', 'WorkOrderPro', true, true),
    -- Test Partners - ONE per organization
    (partner1_id, gen_random_uuid(), 'partner1@abc.com', 'Sarah', 'Johnson', 'partner', 'ABC Property Management', true, false),
    (partner2_id, gen_random_uuid(), 'partner2@xyz.com', 'Mike', 'Chen', 'partner', 'XYZ Commercial Properties', true, false),
    (partner3_id, gen_random_uuid(), 'partner3@premium.com', 'Emily', 'Rodriguez', 'partner', 'Premium Facilities Group', true, false),
    -- Test Subcontractors - ONE per organization
    (sub1_id, gen_random_uuid(), 'plumber@pipesmore.com', 'Tom', 'Wilson', 'subcontractor', 'Pipes & More Plumbing', true, false),
    (sub2_id, gen_random_uuid(), 'electrician@sparks.com', 'Lisa', 'Anderson', 'subcontractor', 'Sparks Electric', true, false),
    (sub3_id, gen_random_uuid(), 'hvac@coolair.com', 'David', 'Martinez', 'subcontractor', 'Cool Air HVAC', true, false),
    (sub4_id, gen_random_uuid(), 'carpenter@woodworks.com', 'Jessica', 'Taylor', 'subcontractor', 'Wood Works Carpentry', true, false),
    -- Test Employees - Multiple can belong to internal org
    (emp1_id, gen_random_uuid(), 'maintenance@workorderpro.com', 'Alex', 'Thompson', 'employee', 'WorkOrderPro', true, true),
    (emp2_id, gen_random_uuid(), 'supervisor@workorderpro.com', 'Jordan', 'Lee', 'employee', 'WorkOrderPro', true, true)
  ON CONFLICT (email) 
  DO UPDATE SET 
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    user_type = EXCLUDED.user_type,
    company_name = EXCLUDED.company_name,
    is_active = EXCLUDED.is_active,
    is_employee = EXCLUDED.is_employee,
    updated_at = now();

  -- Get actual organization IDs after insert/update
  SELECT id INTO org_internal_id FROM organizations WHERE name = 'WorkOrderPro Internal';
  SELECT id INTO org_abc_id FROM organizations WHERE name = 'ABC Property Management';
  SELECT id INTO org_xyz_id FROM organizations WHERE name = 'XYZ Commercial Properties';
  SELECT id INTO org_premium_id FROM organizations WHERE name = 'Premium Facilities Group';
  SELECT id INTO org_pipes_id FROM organizations WHERE name = 'Pipes & More Plumbing';
  SELECT id INTO org_sparks_id FROM organizations WHERE name = 'Sparks Electric';
  SELECT id INTO org_cool_id FROM organizations WHERE name = 'Cool Air HVAC';
  SELECT id INTO org_wood_id FROM organizations WHERE name = 'Wood Works Carpentry';

  -- Get actual user IDs after insert/update
  SELECT id INTO partner1_id FROM profiles WHERE email = 'partner1@abc.com';
  SELECT id INTO partner2_id FROM profiles WHERE email = 'partner2@xyz.com';
  SELECT id INTO partner3_id FROM profiles WHERE email = 'partner3@premium.com';
  SELECT id INTO sub1_id FROM profiles WHERE email = 'plumber@pipesmore.com';
  SELECT id INTO sub2_id FROM profiles WHERE email = 'electrician@sparks.com';
  SELECT id INTO sub3_id FROM profiles WHERE email = 'hvac@coolair.com';
  SELECT id INTO sub4_id FROM profiles WHERE email = 'carpenter@woodworks.com';
  SELECT id INTO emp1_id FROM profiles WHERE email = 'maintenance@workorderpro.com';
  SELECT id INTO emp2_id FROM profiles WHERE email = 'supervisor@workorderpro.com';

  -- Insert User-Organization relationships (SINGLE assignment per user)
  INSERT INTO user_organizations (user_id, organization_id) VALUES
    -- Admin can belong to internal org
    (admin_user_id, org_internal_id),
    -- Partners - ONE organization each
    (partner1_id, org_abc_id),
    (partner2_id, org_xyz_id),
    (partner3_id, org_premium_id),
    -- Subcontractors - ONE organization each
    (sub1_id, org_pipes_id),
    (sub2_id, org_sparks_id),
    (sub3_id, org_cool_id),
    (sub4_id, org_wood_id),
    -- Employees - Internal org
    (emp1_id, org_internal_id),
    (emp2_id, org_internal_id)
  ON CONFLICT (user_id, organization_id) DO NOTHING;

  -- Insert Partner Locations
  INSERT INTO partner_locations (organization_id, location_name, location_number, street_address, city, state, zip_code, contact_name, contact_email, is_active) VALUES
    (org_abc_id, 'ABC Downtown Office', '001', '123 Main Street', 'Downtown', 'CA', '90210', 'Jane Manager', 'downtown@abc-property.com', true),
    (org_abc_id, 'ABC Westside Plaza', '002', '456 West Avenue', 'Westside', 'CA', '90211', 'Bob Supervisor', 'westside@abc-property.com', true),
    (org_xyz_id, 'XYZ Corporate Tower', '101', '321 Business Blvd', 'Corporate', 'NY', '10001', 'Mark Executive', 'corporate@xyz-commercial.com', true),
    (org_xyz_id, 'XYZ Tech Campus', '102', '654 Innovation Drive', 'Tech City', 'NY', '10002', 'Emma Director', 'tech@xyz-commercial.com', true),
    (org_premium_id, 'Premium Luxury Mall', '201', '111 Luxury Lane', 'Uptown', 'FL', '33101', 'Grace Manager', 'luxury@premiumfacilities.com', true)
  ON CONFLICT (organization_id, location_number) DO NOTHING;

  -- Insert Work Orders
  INSERT INTO work_orders (id, work_order_number, title, description, organization_id, trade_id, status, created_by, assigned_to, date_submitted, store_location, street_address, city, state, zip_code) VALUES
    (wo1_id, 'ABC-001-001', 'Leaky Faucet Repair', 'Kitchen faucet dripping constantly', org_abc_id, trade_plumbing_id, 'assigned', admin_user_id, sub1_id, now() - interval '5 days', 'ABC Downtown Office', '123 Main Street', 'Downtown', 'CA', '90210'),
    (wo2_id, 'ABC-002-001', 'Electrical Outlet Installation', 'Install 3 new outlets in conference room', org_abc_id, trade_electrical_id, 'in_progress', admin_user_id, sub2_id, now() - interval '3 days', 'ABC Westside Plaza', '456 West Avenue', 'Westside', 'CA', '90211'),
    (wo3_id, 'XYZ-101-001', 'HVAC System Maintenance', 'Quarterly maintenance check on main HVAC system', org_xyz_id, trade_hvac_id, 'received', admin_user_id, NULL, now() - interval '10 days', 'XYZ Corporate Tower', '321 Business Blvd', 'Corporate', 'NY', '10001')
  ON CONFLICT (work_order_number) DO NOTHING;

  -- Run cleanup to ensure single organization assignments
  SELECT ensure_single_organization_assignment() INTO cleanup_result;

  RETURN json_build_object(
    'success', true,
    'message', 'Test data seeded successfully with single organization assignments',
    'details', json_build_object(
      'organizations', 8,
      'trades', 7,
      'email_templates', 3,
      'profiles', 10,
      'user_organizations', 10,
      'partner_locations', 5,
      'work_orders', 3
    ),
    'cleanup_result', cleanup_result
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