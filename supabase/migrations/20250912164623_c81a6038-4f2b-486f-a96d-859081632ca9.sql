-- Mark Tom Garoutte as employee
-- Simple direct update without complex joins or audit context

UPDATE profiles
SET 
  is_employee = true,
  hourly_cost_rate = 50.00,
  hourly_billable_rate = 75.00,
  is_overtime_eligible = false,
  updated_at = now()
WHERE user_id = '4453cf66-1613-44af-9e2c-881dc63b2dcf'
  AND email = 'tom@austinkunzconstruction.com';