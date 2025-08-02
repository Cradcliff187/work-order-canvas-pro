-- Fix existing subcontractor messages to be internal
-- Update messages posted by subcontractors to set is_internal = true

UPDATE work_order_messages 
SET is_internal = true
WHERE sender_id IN (
  SELECT p.id
  FROM profiles p
  JOIN organization_members om ON p.id = om.user_id
  JOIN organizations o ON om.organization_id = o.id
  WHERE o.organization_type = 'subcontractor'
) 
AND is_internal = false;