-- Drop the current problematic partner upload policy
DROP POLICY IF EXISTS "Partners upload to their work orders" ON work_order_attachments;

-- Create a new policy that uses auth.uid() directly instead of auth_profile_id_safe()
CREATE POLICY "Partners upload to their work orders v2" 
ON work_order_attachments 
FOR INSERT 
WITH CHECK (
  -- User must be uploading as themselves (using auth.uid() instead of auth_profile_id_safe())
  uploaded_by_user_id IN (
    SELECT p.id 
    FROM profiles p 
    WHERE p.user_id = auth.uid()
  )
  AND
  -- Work order must belong to a partner organization the user belongs to
  work_order_id IN (
    SELECT wo.id
    FROM work_orders wo
    WHERE wo.organization_id IN (
      SELECT om.organization_id
      FROM organization_members om
      JOIN organizations o ON o.id = om.organization_id
      JOIN profiles p ON p.id = om.user_id
      WHERE p.user_id = auth.uid()
      AND o.organization_type = 'partner'
    )
  )
);