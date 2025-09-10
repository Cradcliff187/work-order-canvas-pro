-- Fix the orphaned session that's causing phantom clock-in state
UPDATE employee_reports 
SET 
  clock_out_time = clock_in_time + interval '1 minute',
  hours_worked = 0.02  -- 1 minute = 0.0167 hours, rounded to 0.02
WHERE id = '167b8c86-2f72-459c-9ca7-51dcb0381f4c'
  AND clock_in_time IS NOT NULL 
  AND clock_out_time IS NULL;