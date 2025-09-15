-- Update only the partner_billing_status to make BB-501-001 ready for invoicing
-- Keep the status as 'paid' since it's already paid, just change billing status
UPDATE subcontractor_bills 
SET partner_billing_status = 'ready'
WHERE id = 'bf4b6003-27ea-4ad6-81bc-780a5e67c862';