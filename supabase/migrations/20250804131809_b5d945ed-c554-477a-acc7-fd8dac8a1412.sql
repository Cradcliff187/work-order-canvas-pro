-- Make subcontractor_user_id nullable in work_order_reports to allow admin-only reports
ALTER TABLE work_order_reports 
ALTER COLUMN subcontractor_user_id DROP NOT NULL;