-- Create test work order assignments for testing messaging system
-- First, let's get some work order IDs and user IDs from existing test data

-- Insert work order assignments for testing
INSERT INTO work_order_assignments (work_order_id, assigned_to, assigned_by, assigned_organization_id, assignment_type, notes)
SELECT 
  wo.id as work_order_id,
  sc.id as assigned_to,
  admin.id as assigned_by,
  sco.id as assigned_organization_id,
  'lead' as assignment_type,
  'Test assignment for messaging system' as notes
FROM work_orders wo
CROSS JOIN profiles admin
CROSS JOIN profiles sc
CROSS JOIN organizations sco
WHERE wo.work_order_number IN ('ABC-001-001', 'XYZ-101-001') 
  AND admin.user_type = 'admin' 
  AND admin.email = 'cradcliff@austinkunzconstruction.com'
  AND sc.user_type = 'subcontractor' 
  AND sc.email = 'sub1@workorderpro.test'
  AND sco.organization_type = 'subcontractor'
  AND sco.name = 'Pipes & More Plumbing'
LIMIT 2;

-- Insert test messages for work orders
INSERT INTO work_order_messages (work_order_id, sender_id, message, is_internal, created_at)
SELECT 
  wo.id as work_order_id,
  admin.id as sender_id,
  'This is a public message from admin about the work order status.' as message,
  false as is_internal,
  NOW() - INTERVAL '2 hours' as created_at
FROM work_orders wo
CROSS JOIN profiles admin
WHERE wo.work_order_number = 'ABC-001-001'
  AND admin.user_type = 'admin'
  AND admin.email = 'cradcliff@austinkunzconstruction.com'
LIMIT 1;

INSERT INTO work_order_messages (work_order_id, sender_id, message, is_internal, created_at)
SELECT 
  wo.id as work_order_id,
  admin.id as sender_id,
  'This is an INTERNAL note from admin - only visible to admin/employees.' as message,
  true as is_internal,
  NOW() - INTERVAL '1 hour' as created_at
FROM work_orders wo
CROSS JOIN profiles admin
WHERE wo.work_order_number = 'ABC-001-001'
  AND admin.user_type = 'admin'
  AND admin.email = 'cradcliff@austinkunzconstruction.com'
LIMIT 1;

INSERT INTO work_order_messages (work_order_id, sender_id, message, is_internal, created_at)
SELECT 
  wo.id as work_order_id,
  partner.id as sender_id,
  'Partner asking for an update on the repair timeline.' as message,
  false as is_internal,
  NOW() - INTERVAL '30 minutes' as created_at
FROM work_orders wo
CROSS JOIN profiles partner
WHERE wo.work_order_number = 'ABC-001-001'
  AND partner.user_type = 'partner'
  AND partner.email = 'partner1@workorderpro.test'
LIMIT 1;