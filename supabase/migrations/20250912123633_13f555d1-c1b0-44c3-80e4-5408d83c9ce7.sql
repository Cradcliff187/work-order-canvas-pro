-- Drop the unique index that prevents multiple time entries per day
-- This resolves the duplicate key violation error when employees need to submit
-- multiple legitimate time entries for the same work order/project on the same day

DROP INDEX IF EXISTS public.employee_reports_daily_work_unique;