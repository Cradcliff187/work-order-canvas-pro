-- Remove invoice fields from work_order_reports table
-- These fields should be handled separately in the invoices table

ALTER TABLE work_order_reports 
DROP COLUMN IF EXISTS invoice_amount,
DROP COLUMN IF EXISTS invoice_number;

-- Add a comment to clarify the purpose
COMMENT ON TABLE work_order_reports IS 'Stores work completion reports without financial information. Invoice data is handled separately in the invoices table.';