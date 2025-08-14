-- Clean up duplicate draft partner invoices for BB-525-001
-- First, let's identify the duplicates
WITH duplicate_invoices AS (
  SELECT 
    pi.id,
    pi.created_at,
    pi.total_amount,
    ROW_NUMBER() OVER (
      PARTITION BY wor.work_order_id, pi.status, pi.total_amount 
      ORDER BY pi.created_at DESC
    ) as rn
  FROM partner_invoices pi
  JOIN work_order_reports wor ON pi.id = wor.partner_invoice_id
  JOIN work_orders wo ON wo.id = wor.work_order_id
  WHERE wo.work_order_number = 'BB-525-001'
  AND pi.status = 'draft'
  AND pi.total_amount = 425.12
)
-- Delete the duplicate (older) invoice, keeping only the most recent one
DELETE FROM partner_invoices
WHERE id IN (
  SELECT id 
  FROM duplicate_invoices 
  WHERE rn > 1
);

-- Log the cleanup action
INSERT INTO audit_logs (
  table_name,
  record_id,
  action,
  new_values,
  user_id
) 
SELECT 
  'partner_invoices',
  pi.id,
  'duplicate_cleanup',
  jsonb_build_object(
    'work_order_number', 'BB-525-001',
    'reason', 'duplicate_draft_invoices_cleanup',
    'total_amount', 425.12
  ),
  auth_profile_id_safe()
FROM partner_invoices pi
JOIN work_order_reports wor ON pi.id = wor.partner_invoice_id
JOIN work_orders wo ON wo.id = wor.work_order_id
WHERE wo.work_order_number = 'BB-525-001'
AND pi.status = 'draft'
LIMIT 1;