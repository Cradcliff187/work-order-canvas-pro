-- Fix the audit trigger to handle missing profile IDs properly
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
  -- Only insert audit log if we have a valid profile ID
  IF auth_profile_id_safe() IS NOT NULL THEN
    INSERT INTO audit_logs (
      table_name,
      record_id,
      action,
      old_values,
      new_values,
      user_id
    ) VALUES (
      TG_TABLE_NAME,
      NEW.id,
      'UPDATE',
      to_jsonb(OLD),
      to_jsonb(NEW),
      auth_profile_id_safe()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Now update Johnnie B's profile to employee status
UPDATE profiles
SET 
  is_employee = true,
  hourly_cost_rate = 45.00,
  hourly_billable_rate = 67.50,
  is_overtime_eligible = false,
  updated_at = now()
WHERE email = 'johnnieb@austinkunzconstruction.com';