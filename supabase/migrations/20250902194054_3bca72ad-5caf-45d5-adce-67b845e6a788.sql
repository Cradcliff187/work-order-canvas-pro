-- Migration: Add estimate_pending_approval status after estimate_needed
ALTER TYPE work_order_status ADD VALUE IF NOT EXISTS 'estimate_pending_approval' AFTER 'estimate_needed';