-- Test the sync trigger functionality
-- Step 1: Update bill to 'submitted' status
UPDATE subcontractor_bills 
SET status = 'submitted' 
WHERE id = '38e0f9a5-aee4-4efc-ac4b-cf38a6e33bee';

-- Check the automatic updates after setting to 'submitted'
SELECT 
  'After setting to submitted:' as test_step,
  internal_bill_number,
  status,
  operational_status,
  partner_billing_status
FROM subcontractor_bills 
WHERE id = '38e0f9a5-aee4-4efc-ac4b-cf38a6e33bee';

-- Step 2: Update bill back to 'approved' status  
UPDATE subcontractor_bills 
SET status = 'approved' 
WHERE id = '38e0f9a5-aee4-4efc-ac4b-cf38a6e33bee';

-- Check the automatic updates after setting to 'approved'
SELECT 
  'After setting to approved:' as test_step,
  internal_bill_number,
  status,
  operational_status,
  partner_billing_status
FROM subcontractor_bills 
WHERE id = '38e0f9a5-aee4-4efc-ac4b-cf38a6e33bee';