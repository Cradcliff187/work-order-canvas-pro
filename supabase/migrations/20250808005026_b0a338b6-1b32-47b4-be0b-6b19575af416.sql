-- Create priority enum with standard and urgent values
CREATE TYPE work_order_priority AS ENUM ('standard', 'urgent');

-- Add priority column to work_orders table with default 'standard'
ALTER TABLE work_orders 
ADD COLUMN priority work_order_priority NOT NULL DEFAULT 'standard'::work_order_priority;

-- Add index for efficient priority filtering
CREATE INDEX idx_work_orders_priority ON work_orders(priority);

-- Update existing work orders to have standard priority (already default, but explicit)
UPDATE work_orders SET priority = 'standard' WHERE priority IS NULL;