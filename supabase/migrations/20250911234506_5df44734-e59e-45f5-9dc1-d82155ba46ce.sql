-- Step 1: Set missing employee rates
UPDATE profiles
SET 
  hourly_cost_rate = 35.00,
  hourly_billable_rate = 75.00
WHERE is_employee = true
  AND hourly_billable_rate IS NULL;

-- Step 2: Fix existing employee reports to use correct billable rates
-- (total_labor_cost will be auto-calculated as it's a generated column)
UPDATE employee_reports 
SET hourly_rate_snapshot = p.hourly_billable_rate
FROM profiles p
WHERE employee_reports.employee_user_id = p.id
  AND p.is_employee = true
  AND p.hourly_billable_rate IS NOT NULL
  AND employee_reports.hourly_rate_snapshot != p.hourly_billable_rate;