-- Simple fix: Update Tom Garoutte's profile to employee status
-- The existing audit trigger will handle logging with proper fallbacks

UPDATE profiles
SET 
  is_employee = true,
  hourly_cost_rate = 50.00,
  hourly_billable_rate = 75.00,
  is_overtime_eligible = false,
  updated_at = now()
WHERE email = 'tgaroutte@austinkunzconstruction.com';