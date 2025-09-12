-- Mark Tom Garoutte as employee
-- Create system profile for audit logs and update Tom's profile

-- Create system profile for migration audit logs (if it doesn't exist)
INSERT INTO profiles (
  id,
  user_id, 
  email,
  first_name,
  last_name,
  is_employee,
  is_active
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000000',
  'system@migrations',
  'System',
  'Migration',
  false,
  false
) ON CONFLICT (user_id) DO NOTHING;

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