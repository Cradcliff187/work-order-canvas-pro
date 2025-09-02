-- Fix remaining invoice_date column
ALTER TABLE subcontractor_bills 
  RENAME COLUMN invoice_date TO bill_date;