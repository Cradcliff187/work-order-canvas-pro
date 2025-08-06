-- Add is_internal column to work_order_attachments
ALTER TABLE work_order_attachments 
ADD COLUMN is_internal boolean DEFAULT false;

-- Update RLS policies to respect internal visibility
DROP POLICY IF EXISTS "Partners view attachments for their work orders" ON work_order_attachments;
DROP POLICY IF EXISTS "Partners can upload attachments to their work orders" ON work_order_attachments;

-- Partners can only view PUBLIC attachments for their work orders
CREATE POLICY "Partners view public attachments for their work orders" 
ON work_order_attachments 
FOR SELECT 
USING (
  is_internal = false AND
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

-- Partners can upload PUBLIC attachments to their work orders
CREATE POLICY "Partners can upload public attachments to their work orders" 
ON work_order_attachments 
FOR INSERT 
WITH CHECK (
  is_internal = false AND
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