-- Fix RLS policy for admin/employee report submissions
-- The current policy is too restrictive when JWT metadata is missing

-- Drop the existing policy
DROP POLICY IF EXISTS "admins_employees_can_insert_reports_for_subcontractors" ON work_order_reports;

-- Create a more flexible policy that handles missing JWT metadata
CREATE POLICY "admins_employees_can_insert_reports_for_subcontractors" 
ON work_order_reports 
FOR INSERT 
WITH CHECK (
  -- Allow if user is admin or employee based on JWT metadata
  (jwt_user_type() IN ('admin', 'employee') AND submitted_by_user_id = jwt_profile_id())
  OR
  -- Fallback: Allow if user is admin/employee based on direct profile lookup (when JWT metadata is missing)
  (submitted_by_user_id IN (
    SELECT p.id 
    FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.user_type IN ('admin', 'employee')
    AND p.is_active = true
  ))
);