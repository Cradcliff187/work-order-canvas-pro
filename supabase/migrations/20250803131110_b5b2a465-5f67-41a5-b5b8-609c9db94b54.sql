-- Fix partner access to work order attachments
-- Drop the old policy that uses outdated auth pattern
DROP POLICY IF EXISTS "Partners view attachments for their work orders" ON work_order_attachments;

-- Create updated policy for partners to view attachments using modern auth
CREATE POLICY "Partners view attachments for their work orders" 
ON work_order_attachments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM work_orders wo
    WHERE wo.id = work_order_attachments.work_order_id 
    AND wo.organization_id IN (
      SELECT om.organization_id
      FROM organization_members om
      JOIN organizations o ON o.id = om.organization_id
      WHERE om.user_id = auth_profile_id()
      AND o.organization_type = 'partner'
    )
  )
);

-- Add policy for partners to upload attachments to their own work orders
CREATE POLICY "Partners can upload attachments to their work orders" 
ON work_order_attachments 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM work_orders wo
    WHERE wo.id = work_order_attachments.work_order_id 
    AND wo.organization_id IN (
      SELECT om.organization_id
      FROM organization_members om
      JOIN organizations o ON o.id = om.organization_id
      WHERE om.user_id = auth_profile_id()
      AND o.organization_type = 'partner'
    )
  )
);