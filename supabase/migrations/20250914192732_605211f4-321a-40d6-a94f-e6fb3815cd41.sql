-- Add QB Invoice # field to partner_invoices table
ALTER TABLE partner_invoices 
ADD COLUMN qb_invoice_number text;