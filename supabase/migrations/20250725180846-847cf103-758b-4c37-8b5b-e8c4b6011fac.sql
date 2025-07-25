-- Remove legacy assignment columns from work_orders table
-- These are redundant as all assignment logic is handled by work_order_assignments table

ALTER TABLE work_orders 
DROP COLUMN IF EXISTS assigned_to,
DROP COLUMN IF EXISTS assigned_to_type;