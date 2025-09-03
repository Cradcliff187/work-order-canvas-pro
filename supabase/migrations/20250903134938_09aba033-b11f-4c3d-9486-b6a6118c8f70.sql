-- Add missing foreign key constraint between subcontractor_bill_work_orders and work_orders
ALTER TABLE public.subcontractor_bill_work_orders 
ADD CONSTRAINT fk_subcontractor_bill_work_orders_work_order_id 
FOREIGN KEY (work_order_id) REFERENCES public.work_orders(id) 
ON DELETE CASCADE;