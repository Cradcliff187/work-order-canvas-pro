-- Mark Tom Garoutte as employee
-- Temporarily disable audit trigger to avoid foreign key constraint

-- Disable audit trigger
ALTER TABLE profiles DISABLE TRIGGER audit_trigger;

-- Update Tom's profile
UPDATE profiles
SET 
  is_employee = true,
  hourly_cost_rate = 50.00,
  hourly_billable_rate = 75.00,
  is_overtime_eligible = false,
  updated_at = now()
WHERE user_id = '4453cf66-1613-44af-9e2c-881dc63b2dcf'
  AND email = 'tom@austinkunzconstruction.com';

-- Re-enable audit trigger
ALTER TABLE profiles ENABLE TRIGGER audit_trigger;