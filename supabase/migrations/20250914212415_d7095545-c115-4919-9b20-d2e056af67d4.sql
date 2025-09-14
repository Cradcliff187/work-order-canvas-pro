-- Backfill partner invoice work order associations for existing invoices
-- This migration will create work order associations for existing partner invoices
-- based on the subcontractor bills that were used to create them

INSERT INTO partner_invoice_work_orders (partner_invoice_id, work_order_id, amount, description)
SELECT DISTINCT
  pi.id as partner_invoice_id,
  sbwo.work_order_id,
  sbwo.amount * (1 + COALESCE(pi.markup_percentage, 0) / 100) as amount,
  CONCAT('Work Order ', wo.work_order_number, ': ', wo.title) as description
FROM partner_invoices pi
JOIN subcontractor_bills sb ON sb.partner_billing_status = 'invoiced'
JOIN subcontractor_bill_work_orders sbwo ON sbwo.subcontractor_bill_id = sb.id
JOIN work_orders wo ON wo.id = sbwo.work_order_id
LEFT JOIN partner_invoice_work_orders existing_piwo ON existing_piwo.partner_invoice_id = pi.id AND existing_piwo.work_order_id = sbwo.work_order_id
WHERE existing_piwo.id IS NULL -- Only insert if association doesn't already exist
AND pi.created_at >= sb.approved_at; -- Ensure invoice was created after bill approval