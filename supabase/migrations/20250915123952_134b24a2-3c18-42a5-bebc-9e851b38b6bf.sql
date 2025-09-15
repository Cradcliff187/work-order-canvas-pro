-- Update BB-501-001 subcontractor bill data to make it ready for partner invoicing
UPDATE subcontractor_bills 
SET 
  partner_billing_status = 'ready',
  status = 'approved',
  operational_status = 'ready_for_partner_billing'
WHERE id = 'bf4b6003-27ea-4ad6-81bc-780a5e67c862';