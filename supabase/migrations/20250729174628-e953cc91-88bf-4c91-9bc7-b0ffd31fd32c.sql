-- Create the trigger to sync work order assignments
CREATE TRIGGER sync_work_order_assignment_trigger
AFTER INSERT OR UPDATE OR DELETE ON work_order_assignments
FOR EACH ROW EXECUTE FUNCTION sync_work_order_assignment();

-- Test the fixed assignments
SELECT 
  wo.id,
  wo.work_order_number,
  wo.status,
  wo.assigned_organization_id,
  woa.assigned_to,
  woa.assigned_organization_id as assignment_org_id,
  p.first_name,
  p.last_name,
  o.name as org_name
FROM work_orders wo
LEFT JOIN work_order_assignments woa ON wo.id = woa.work_order_id
LEFT JOIN profiles p ON woa.assigned_to = p.id
LEFT JOIN organizations o ON wo.assigned_organization_id = o.id
WHERE wo.status IN ('assigned', 'in_progress')
ORDER BY wo.work_order_number
LIMIT 5;