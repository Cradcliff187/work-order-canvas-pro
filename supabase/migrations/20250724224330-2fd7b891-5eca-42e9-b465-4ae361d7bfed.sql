-- Continue fixing Function Search Path Mutable warnings for remaining functions
-- Adding SET search_path TO 'public' for security hardening

CREATE OR REPLACE FUNCTION public.update_user_profile_and_auth(p_profile_id uuid, p_first_name text, p_last_name text, p_email text, p_user_type user_type, p_phone text DEFAULT NULL::text, p_company_name text DEFAULT NULL::text, p_hourly_billable_rate numeric DEFAULT NULL::numeric, p_hourly_cost_rate numeric DEFAULT NULL::numeric, p_is_active boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_organization_ids uuid[];
  updated_profile profiles%ROWTYPE;
BEGIN
  -- Get the auth user_id from the profile
  SELECT user_id INTO v_user_id
  FROM profiles
  WHERE id = p_profile_id;
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Profile not found'
    );
  END IF;
  
  -- Update the profiles table
  UPDATE profiles
  SET 
    first_name = p_first_name,
    last_name = p_last_name,
    email = p_email,
    user_type = p_user_type,
    phone = p_phone,
    company_name = p_company_name,
    hourly_billable_rate = p_hourly_billable_rate,
    hourly_cost_rate = p_hourly_cost_rate,
    is_active = p_is_active,
    updated_at = now()
  WHERE id = p_profile_id
  RETURNING * INTO updated_profile;
  
  -- Get user's organization IDs for app metadata
  SELECT array_agg(uo.organization_id) INTO v_organization_ids
  FROM user_organizations uo
  WHERE uo.user_id = p_profile_id;
  
  -- Handle case where no organizations exist
  IF v_organization_ids IS NULL THEN
    v_organization_ids := '{}';
  END IF;
  
  -- Update auth.users raw_user_meta_data (for display names)
  UPDATE auth.users
  SET 
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
      'first_name', p_first_name,
      'last_name', p_last_name,
      'user_type', p_user_type,
      'email', p_email
    ),
    -- Also update raw_app_meta_data (for JWT context)
    raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
      'user_type', p_user_type,
      'profile_id', p_profile_id,
      'organization_ids', v_organization_ids,
      'is_active', p_is_active
    ),
    updated_at = now()
  WHERE id = v_user_id;
  
  -- Return success with updated profile data
  RETURN jsonb_build_object(
    'success', true,
    'profile', row_to_json(updated_profile),
    'auth_updated', true,
    'organization_ids', v_organization_ids
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'error_detail', 'Failed to update user profile and auth metadata'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.trigger_work_order_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only trigger for actual new work orders
  IF TG_OP = 'INSERT' THEN
    PERFORM public.call_send_email_trigger(
      'work_order_created',
      NEW.id,
      'work_order'
    );
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the main transaction
  RAISE WARNING 'Work order created trigger failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.jwt_profile_id()
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  profile_id uuid;
BEGIN
  -- First try to get from JWT app_metadata
  SELECT (auth.jwt() -> 'app_metadata' ->> 'profile_id')::uuid INTO profile_id;
  
  -- If not in JWT, query profiles table directly (bypassing RLS)
  IF profile_id IS NULL THEN
    SELECT id INTO profile_id
    FROM profiles
    WHERE user_id = auth.uid()
    LIMIT 1;
  END IF;
  
  RETURN profile_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.setup_bulletproof_test_data()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- Continue with more functions...
CREATE OR REPLACE FUNCTION public.ensure_single_organization_assignment()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;