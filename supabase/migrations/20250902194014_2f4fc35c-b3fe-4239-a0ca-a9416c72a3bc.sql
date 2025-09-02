-- Migration: Add estimate_pending_approval status after estimate_needed
ALTER TYPE work_order_status ADD VALUE IF NOT EXISTS 'estimate_pending_approval' AFTER 'estimate_needed';

-- Update existing work orders that should have this status
UPDATE work_orders 
SET status = 'estimate_pending_approval'
WHERE status = 'estimate_needed' 
  AND internal_estimate_amount IS NOT NULL 
  AND internal_estimate_amount > 0
  AND partner_estimate_approved IS NOT TRUE;