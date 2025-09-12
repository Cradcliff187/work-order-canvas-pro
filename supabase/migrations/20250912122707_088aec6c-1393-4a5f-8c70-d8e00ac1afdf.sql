-- Remove the overly restrictive unique constraint that prevents multiple time entries per day
-- This allows legitimate multiple entries per employee per work order/project per day
-- Duplicates will be handled through the approval process by admin review

ALTER TABLE employee_reports 
DROP CONSTRAINT IF EXISTS employee_reports_daily_work_unique;