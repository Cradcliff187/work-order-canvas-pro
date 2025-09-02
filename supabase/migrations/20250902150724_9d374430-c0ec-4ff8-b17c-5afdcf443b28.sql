-- Rename subcontractor bill columns to use "bill" terminology
ALTER TABLE subcontractor_bills 
RENAME COLUMN internal_invoice_number TO internal_bill_number;

ALTER TABLE subcontractor_bills 
RENAME COLUMN external_invoice_number TO external_bill_number;

-- Update work_orders table to use "bill" terminology
ALTER TABLE work_orders 
RENAME COLUMN subcontractor_invoice_amount TO subcontractor_bill_amount;