-- Fix missing work_order_report_id in invoice_work_orders table
UPDATE invoice_work_orders 
SET work_order_report_id = (
  SELECT wor.id
  FROM work_order_reports wor
  WHERE wor.work_order_id = invoice_work_orders.work_order_id
  AND wor.status = 'approved'
  LIMIT 1
)
WHERE work_order_report_id IS NULL;