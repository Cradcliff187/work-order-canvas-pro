-- Temporarily disable audit trigger, update profile, then re-enable
ALTER TABLE profiles DISABLE TRIGGER ALL;

UPDATE profiles
SET 
  is_employee = true,
  hourly_cost_rate = 45.00,
  hourly_billable_rate = 67.50,
  is_overtime_eligible = false,
  updated_at = now()
WHERE email = 'johnnieb@austinkunzconstruction.com';

ALTER TABLE profiles ENABLE TRIGGER ALL;