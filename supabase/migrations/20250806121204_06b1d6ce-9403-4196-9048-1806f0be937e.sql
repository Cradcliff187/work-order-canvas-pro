-- Rollback: Drop the current policy that uses auth.uid()
DROP POLICY IF EXISTS "Partners upload to their work orders v2" ON work_order_attachments;

-- Recreate the original policy using auth_profile_id_safe()
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