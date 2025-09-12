-- Update Johnnie B's profile to employee status
UPDATE profiles
SET 
  is_employee = true,
  hourly_cost_rate = 45.00,
  hourly_billable_rate = 67.50,
  is_overtime_eligible = false,
  updated_at = now()
WHERE email = 'johnnieb@austinkunzconstruction.com';