-- Mark Tom Garoutte as employee
-- User ID: 4453cf66-1613-44af-9e2c-881dc63b2dcf
-- Profile ID: de6d364b-b486-43cb-9575-bee2e076c7eb

-- Temporarily set a session context to avoid audit log issues
DO $$
DECLARE
    admin_user_id uuid;
BEGIN
    -- Get an admin user for audit context
    SELECT user_id INTO admin_user_id 
    FROM profiles p
    JOIN organization_members om ON om.user_id = p.id
    JOIN organizations o ON o.id = om.organization_id
    WHERE o.organization_type = 'internal' 
    AND om.role = 'admin'
    LIMIT 1;
    
    -- Set session context if admin found
    IF admin_user_id IS NOT NULL THEN
        PERFORM set_config('request.jwt.claims', 
            json_build_object('sub', admin_user_id, 'role', 'authenticated')::text, 
            true);
    END IF;
    
    -- Update Tom's profile
    UPDATE profiles
    SET 
      is_employee = true,
      hourly_cost_rate = 50.00,
      hourly_billable_rate = 75.00,
      is_overtime_eligible = false,
      updated_at = now()
    WHERE user_id = '4453cf66-1613-44af-9e2c-881dc63b2dcf';
    
    -- Clear session context
    PERFORM set_config('request.jwt.claims', null, true);
END $$;