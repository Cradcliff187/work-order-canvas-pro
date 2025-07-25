-- Fix the two work orders with 'assigned' status but no actual assignments
UPDATE work_orders 
SET 
  status = 'received',
  date_assigned = NULL,
  updated_at = now()
WHERE work_order_number IN ('BB-507-002', 'BB-502-002');

-- Add audit log entries for the status reversions
INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values, user_id, created_at)
SELECT 
  'work_orders',
  id,
  'UPDATE',
  jsonb_build_object(
    'status', 'assigned',
    'date_assigned', date_assigned
  ),
  jsonb_build_object(
    'status', 'received',
    'date_assigned', null
  ),
  created_by,
  now()
FROM work_orders 
WHERE work_order_number IN ('BB-507-002', 'BB-502-002');