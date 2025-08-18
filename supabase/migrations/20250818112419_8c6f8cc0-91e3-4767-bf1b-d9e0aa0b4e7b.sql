-- Clean up existing bad data first
DELETE FROM receipt_work_orders 
WHERE allocated_amount <= 0;

-- Add NOT NULL constraint to work_order_id in receipt_work_orders
ALTER TABLE receipt_work_orders
ADD CONSTRAINT check_work_order_required 
CHECK (work_order_id IS NOT NULL);

-- Add constraint for positive allocated_amount
ALTER TABLE receipt_work_orders
ADD CONSTRAINT check_positive_allocation 
CHECK (allocated_amount > 0);

-- Create index for better performance on valid allocations
CREATE INDEX IF NOT EXISTS idx_receipt_work_orders_valid 
ON receipt_work_orders(work_order_id, allocated_amount) 
WHERE work_order_id IS NOT NULL AND allocated_amount > 0;