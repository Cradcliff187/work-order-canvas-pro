-- Update legacy Big Boy subcontractor bills to be ready for partner invoicing
-- These bills are already paid but need to be marked as ready for partner invoicing
UPDATE subcontractor_bills 
SET partner_billing_status = 'ready'
WHERE internal_bill_number LIKE 'BB-%' 
  AND partner_billing_status IN ('billed', 'paid')
  AND status = 'paid';