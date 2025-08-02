-- Phase 1: Update RLS Policies for Messaging System
-- Fix partner and subcontractor message visibility

-- Drop existing partner policy that allows access to all messages
DROP POLICY IF EXISTS "partners_can_manage_own_work_order_messages" ON work_order_messages;

-- Create new partner policy that only allows access to PUBLIC messages (is_internal = false)
CREATE POLICY "partners_can_manage_public_messages" ON work_order_messages
FOR ALL
USING (
  work_order_id IN (
    SELECT wo.id
    FROM work_orders wo
    WHERE wo.organization_id IN (
      SELECT om.organization_id
      FROM organization_members om
      JOIN organizations o ON o.id = om.organization_id
      WHERE om.user_id = auth_profile_id()
      AND o.organization_type = 'partner'
    )
  )
  AND is_internal = false  -- Only public messages
)
WITH CHECK (
  work_order_id IN (
    SELECT wo.id
    FROM work_orders wo
    WHERE wo.organization_id IN (
      SELECT om.organization_id
      FROM organization_members om
      JOIN organizations o ON o.id = om.organization_id
      WHERE om.user_id = auth_profile_id()
      AND o.organization_type = 'partner'
    )
  )
  AND is_internal = false  -- Can only create public messages
);

-- Drop existing subcontractor policy that allows access to all messages
DROP POLICY IF EXISTS "subcontractors_can_manage_assigned_work_order_messages" ON work_order_messages;

-- Create new subcontractor policy that only allows access to INTERNAL messages (is_internal = true)
CREATE POLICY "subcontractors_can_manage_internal_messages" ON work_order_messages
FOR ALL
USING (
  work_order_id IN (
    SELECT wo.id
    FROM work_orders wo
    WHERE wo.assigned_organization_id IN (
      SELECT om.organization_id
      FROM organization_members om
      JOIN organizations o ON o.id = om.organization_id
      WHERE om.user_id = auth_profile_id()
      AND o.organization_type = 'subcontractor'
    )
  )
  AND is_internal = true  -- Only internal messages
)
WITH CHECK (
  work_order_id IN (
    SELECT wo.id
    FROM work_orders wo
    WHERE wo.assigned_organization_id IN (
      SELECT om.organization_id
      FROM organization_members om
      JOIN organizations o ON o.id = om.organization_id
      WHERE om.user_id = auth_profile_id()
      AND o.organization_type = 'subcontractor'
    )
  )
  AND is_internal = true  -- Can only create internal messages
);