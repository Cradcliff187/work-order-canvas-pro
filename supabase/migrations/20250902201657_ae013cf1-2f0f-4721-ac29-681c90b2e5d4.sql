-- Test the sync trigger with a valid status transition
-- Test: Update an 'approved' bill to 'paid' status (valid forward transition)

-- Show current state
SELECT 
  'Before update:' as test_step,
  internal_bill_number,
  status,
  operational_status,
  partner_billing_status
FROM subcontractor_bills 
WHERE id = '38e0f9a5-aee4-4efc-ac4b-cf38a6e33bee';

-- Update bill to 'paid' status (valid transition from 'approved')
UPDATE subcontractor_bills 
SET status = 'paid',
    paid_at = now()
WHERE id = '38e0f9a5-aee4-4efc-ac4b-cf38a6e33bee';

-- Check the automatic trigger updates
SELECT 
  'After setting to paid:' as test_step,
  internal_bill_number,
  status,
  operational_status,
  partner_billing_status
FROM subcontractor_bills 
WHERE id = '38e0f9a5-aee4-4efc-ac4b-cf38a6e33bee';