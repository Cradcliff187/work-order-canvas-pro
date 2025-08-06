-- Fix the missing RLS policy condition for partner uploads
-- First drop the existing broken policy
DROP POLICY IF EXISTS "Partners upload to their work orders" ON work_order_attachments;

-- Create the correct policy with proper conditions
CREATE POLICY "Partners upload to their work orders"
ON work_order_attachments
FOR INSERT 
WITH CHECK (
  -- User must be a partner
  EXISTS (
    SELECT 1 
    FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = auth_profile_id_safe()
    AND o.organization_type = 'partner'
  )
  AND
  -- Work order must belong to their organization
  work_order_id IN (
    SELECT wo.id
    FROM work_orders wo
    JOIN organization_members om ON wo.organization_id = om.organization_id
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = auth_profile_id_safe()
    AND o.organization_type = 'partner'
  )
  AND
  -- User must be uploading as themselves
  uploaded_by_user_id = auth_profile_id_safe()
);