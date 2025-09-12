-- Mark Tom Garoutte as employee
-- Update profile and manually create audit log entry

DO $$
DECLARE
    tom_profile_id uuid;
    admin_profile_id uuid;
    old_values jsonb;
    new_values jsonb;
BEGIN
    -- Get Tom's profile ID
    SELECT id INTO tom_profile_id 
    FROM profiles 
    WHERE user_id = '4453cf66-1613-44af-9e2c-881dc63b2dcf';
    
    -- Get current values for audit log
    SELECT to_jsonb(profiles.*) INTO old_values
    FROM profiles 
    WHERE id = tom_profile_id;
    
    -- Update Tom's profile
    UPDATE profiles
    SET 
      is_employee = true,
      hourly_cost_rate = 50.00,
      hourly_billable_rate = 75.00,
      is_overtime_eligible = false,
      updated_at = now()
    WHERE id = tom_profile_id;
    
    -- Get new values for audit log
    SELECT to_jsonb(profiles.*) INTO new_values
    FROM profiles 
    WHERE id = tom_profile_id;
    
    -- Get an admin user for audit log
    SELECT id INTO admin_profile_id 
    FROM profiles p
    JOIN organization_members om ON om.user_id = p.id
    JOIN organizations o ON o.id = om.organization_id
    WHERE o.organization_type = 'internal' 
    AND om.role = 'admin'
    LIMIT 1;
    
    -- Manually insert audit log
    INSERT INTO audit_logs (
        table_name,
        record_id,
        action,
        old_values,
        new_values,
        user_id
    ) VALUES (
        'profiles',
        tom_profile_id,
        'UPDATE',
        old_values,
        new_values,
        COALESCE(admin_profile_id, tom_profile_id)
    );
    
END $$;