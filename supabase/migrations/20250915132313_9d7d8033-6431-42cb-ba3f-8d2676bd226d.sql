-- Fix legacy Big Boy bills to be ready for partner invoicing
-- Update the 10 legacy bills that were marked as 'billed' to 'ready'
UPDATE subcontractor_bills 
SET partner_billing_status = 'ready'
WHERE internal_bill_number IN (
    'INV-2025-00001',
    'INV-2025-00002', 
    'INV-2025-00003',
    'INV-2025-00004',
    'INV-2025-00005',
    'INV-2025-00006',
    'INV-2025-00007',
    'INV-2025-00008',
    'INV-2025-00012',
    'INV-2025-00013'
)
AND partner_billing_status = 'billed'
AND status = 'paid';