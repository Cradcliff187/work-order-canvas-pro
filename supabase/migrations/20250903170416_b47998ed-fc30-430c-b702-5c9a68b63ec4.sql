-- Drop the duplicate foreign key constraint
ALTER TABLE subcontractor_bill_work_orders 
DROP CONSTRAINT fk_subcontractor_bill_work_orders_work_order_id;