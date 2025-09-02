-- Migration: Update existing work orders to use estimate_pending_approval status
UPDATE work_orders 
SET status = 'estimate_pending_approval'
WHERE status = 'estimate_needed' 
  AND internal_estimate_amount IS NOT NULL 
  AND internal_estimate_amount > 0
  AND partner_estimate_approved IS NOT TRUE;