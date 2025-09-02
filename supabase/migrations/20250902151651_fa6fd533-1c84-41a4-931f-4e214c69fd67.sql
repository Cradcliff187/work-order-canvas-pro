-- EMERGENCY FIX: Rename columns within subcontractor_bills table
BEGIN;

-- Check current column names first  
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'subcontractor_bills' 
  AND column_name LIKE '%invoice%'
ORDER BY ordinal_position;

-- Rename the actual columns in the subcontractor_bills table
ALTER TABLE subcontractor_bills 
  RENAME COLUMN internal_invoice_number TO internal_bill_number;

ALTER TABLE subcontractor_bills 
  RENAME COLUMN external_invoice_number TO external_bill_number;

-- Also rename invoice_date to bill_date for consistency
ALTER TABLE subcontractor_bills 
  RENAME COLUMN invoice_date TO bill_date;

COMMIT;