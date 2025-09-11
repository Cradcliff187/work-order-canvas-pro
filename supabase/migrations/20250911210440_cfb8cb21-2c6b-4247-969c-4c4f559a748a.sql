-- Make work_order_report_id nullable in partner_invoice_line_items
ALTER TABLE partner_invoice_line_items 
ALTER COLUMN work_order_report_id DROP NOT NULL;

-- Add comment for clarity
COMMENT ON COLUMN partner_invoice_line_items.work_order_report_id IS 
'References work_order_reports. NULL for subcontractor bills without specific report';