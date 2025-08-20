-- Fix stuck employee reports by setting clock_out_time and calculating hours_worked
UPDATE employee_reports 
SET 
  clock_out_time = clock_in_time + INTERVAL '8 hours',
  hours_worked = 8.0
WHERE clock_in_time IS NOT NULL 
  AND clock_out_time IS NULL 
  AND employee_user_id = '7e15376b-85ce-4f8e-810b-f695e3abec6f';