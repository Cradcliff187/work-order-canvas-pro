-- Add partner_invoice_id to employee_reports table to track which entries have been billed
ALTER TABLE employee_reports 
ADD COLUMN partner_invoice_id uuid REFERENCES partner_invoices(id);