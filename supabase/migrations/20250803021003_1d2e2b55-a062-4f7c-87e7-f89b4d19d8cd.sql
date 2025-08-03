-- Fix RLS policy for subcontractor report submission
-- The issue is that auth_profile_id_safe() may return null and the policy logic needs to be more robust

-- Drop the existing problematic policy
DROP POLICY IF EXISTS "subcontractors_can_manage_assigned_reports" ON work_order_reports;

-- Create a more robust policy that handles the user ID matching correctly
CREATE POLICY "subcontractors_can_manage_assigned_reports" 
ON work_order_reports 
FOR ALL 
USING (
  work_order_id IN (
    SELECT wo.id
    FROM work_orders wo
    WHERE wo.assigned_organization_id IN (
      SELECT om.organization_id
      FROM organization_members om
      JOIN organizations o ON o.id = om.organization_id
      WHERE om.user_id = (
        SELECT p.id 
        FROM profiles p 
        WHERE p.user_id = auth.uid()
        LIMIT 1
      )
      AND o.organization_type = 'subcontractor'
    )
  )
)
WITH CHECK (
  work_order_id IN (
    SELECT wo.id
    FROM work_orders wo
    WHERE wo.assigned_organization_id IN (
      SELECT om.organization_id
      FROM organization_members om
      JOIN organizations o ON o.id = om.organization_id
      WHERE om.user_id = (
        SELECT p.id 
        FROM profiles p 
        WHERE p.user_id = auth.uid()
        LIMIT 1
      )
      AND o.organization_type = 'subcontractor'
    )
  )
);