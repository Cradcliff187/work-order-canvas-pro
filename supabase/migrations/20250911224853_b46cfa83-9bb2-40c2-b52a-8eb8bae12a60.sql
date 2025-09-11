-- Create indexes for better query performance on employee_reports
CREATE INDEX IF NOT EXISTS idx_employee_reports_employee_date 
ON employee_reports(employee_user_id, report_date DESC);

CREATE INDEX IF NOT EXISTS idx_employee_reports_approval_status 
ON employee_reports(approval_status);

CREATE INDEX IF NOT EXISTS idx_employee_reports_work_order_date 
ON employee_reports(work_order_id, report_date DESC);

CREATE INDEX IF NOT EXISTS idx_employee_reports_project_date 
ON employee_reports(project_id, report_date DESC);

CREATE INDEX IF NOT EXISTS idx_employee_reports_search 
ON employee_reports USING gin(to_tsvector('english', work_performed));

-- Enable realtime for employee_reports
ALTER TABLE employee_reports REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE employee_reports;