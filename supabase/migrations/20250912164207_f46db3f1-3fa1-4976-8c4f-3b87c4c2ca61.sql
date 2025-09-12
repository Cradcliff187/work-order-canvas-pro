-- Mark Tom Garoutte as employee
-- User ID: 4453cf66-1613-44af-9e2c-881dc63b2dcf
-- Profile ID: de6d364b-b486-43cb-9575-bee2e076c7eb

UPDATE profiles
SET 
  is_employee = true,
  hourly_cost_rate = 50.00,
  hourly_billable_rate = 75.00,
  is_overtime_eligible = false,
  updated_at = now()
WHERE user_id = '4453cf66-1613-44af-9e2c-881dc63b2dcf';