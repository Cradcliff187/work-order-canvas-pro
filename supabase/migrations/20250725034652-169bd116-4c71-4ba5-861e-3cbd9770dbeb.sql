-- Add submitted_by_user_id column to work_order_reports table to track who actually submitted the report
ALTER TABLE work_order_reports 
ADD COLUMN submitted_by_user_id uuid REFERENCES profiles(id);

-- Add comment to clarify the purpose
COMMENT ON COLUMN work_order_reports.submitted_by_user_id IS 'Profile ID of the user who actually submitted the report (for admin/employee submissions on behalf of subcontractors)';

-- Update RLS policies to allow admin/employee report submission
CREATE POLICY "admins_employees_can_insert_reports_for_subcontractors" 
ON work_order_reports 
FOR INSERT 
WITH CHECK (
  (jwt_user_type() = 'admin' OR jwt_user_type() = 'employee') 
  AND (submitted_by_user_id = jwt_profile_id())
);