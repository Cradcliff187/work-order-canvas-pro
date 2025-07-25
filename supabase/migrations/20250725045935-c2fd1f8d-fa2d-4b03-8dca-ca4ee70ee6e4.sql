-- EMERGENCY FIX: Add missing RLS policy for subcontractor report submission
-- This allows subcontractors to insert work order reports for work orders they are assigned to

CREATE POLICY "subcontractors_can_insert_own_work_order_reports"
ON work_order_reports
FOR INSERT
TO public
WITH CHECK (
  jwt_user_type() = 'subcontractor'
  AND subcontractor_user_id = jwt_profile_id()
  AND EXISTS (
    SELECT 1 FROM work_orders wo
    WHERE wo.id = work_order_id
    AND (
      wo.assigned_to = jwt_profile_id()
      OR wo.id IN (
        SELECT work_order_id 
        FROM auth_user_organization_assignments()
      )
    )
  )
);