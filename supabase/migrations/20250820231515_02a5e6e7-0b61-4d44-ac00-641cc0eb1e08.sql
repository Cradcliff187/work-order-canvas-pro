-- Add missing clock-out location columns to employee_reports table
ALTER TABLE employee_reports 
ADD COLUMN IF NOT EXISTS clock_out_location_address TEXT,
ADD COLUMN IF NOT EXISTS clock_out_location_lat NUMERIC,
ADD COLUMN IF NOT EXISTS clock_out_location_lng NUMERIC;