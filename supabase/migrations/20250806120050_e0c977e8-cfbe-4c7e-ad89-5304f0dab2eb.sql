-- Drop the existing problematic policy
DROP POLICY IF EXISTS "Partners upload to their work orders" ON work_order_attachments;

-- Create a simpler, more reliable policy for partner uploads
CREATE POLICY "Partners upload to their work orders" 
ON work_order_attachments 
FOR INSERT 
WITH CHECK (
  -- Ensure user is uploading as themselves
  uploaded_by_user_id = auth_profile_id_safe()
  AND
  -- Ensure work order belongs to a partner organization the user belongs to
  work_order_id IN (
    SELECT wo.id
    FROM work_orders wo
    WHERE wo.organization_id IN (
      SELECT om.organization_id
      FROM organization_members om
      JOIN organizations o ON o.id = om.organization_id
      WHERE om.user_id = auth_profile_id_safe()
      AND o.organization_type = 'partner'
    )
  )
);