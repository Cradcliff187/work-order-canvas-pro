-- Fix user assignments - get actual subcontractor users from the assigned organizations
UPDATE work_order_assignments 
SET assigned_to = (
  SELECT p.id 
  FROM profiles p 
  JOIN user_organizations uo ON p.id = uo.user_id 
  WHERE uo.organization_id = work_order_assignments.assigned_organization_id 
  AND p.user_type = 'subcontractor'
  AND p.is_active = true
  LIMIT 1
)
WHERE assigned_to IS NULL AND assigned_organization_id IS NOT NULL;

-- Also create assignments for work orders that have assigned_organization_id but no assignment record
INSERT INTO work_order_assignments (work_order_id, assigned_to, assigned_organization_id, assignment_type, assigned_by, notes)
SELECT 
  wo.id,
  (
    SELECT p.id 
    FROM profiles p 
    JOIN user_organizations uo ON p.id = uo.user_id 
    WHERE uo.organization_id = wo.assigned_organization_id 
    AND p.user_type = 'subcontractor'
    AND p.is_active = true
    LIMIT 1
  ),
  wo.assigned_organization_id,
  'assigned',
  (SELECT id FROM profiles WHERE user_type = 'admin' LIMIT 1),
  'Auto-created assignment during migration'
FROM work_orders wo
WHERE wo.assigned_organization_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM work_order_assignments woa 
  WHERE woa.work_order_id = wo.id
);