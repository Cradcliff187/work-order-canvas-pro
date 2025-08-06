-- Fix work order deletion by adding CASCADE DELETE to email_logs foreign key

-- Drop the existing foreign key constraint
ALTER TABLE email_logs DROP CONSTRAINT IF EXISTS email_logs_work_order_id_fkey;

-- Recreate the constraint with CASCADE DELETE
ALTER TABLE email_logs 
ADD CONSTRAINT email_logs_work_order_id_fkey 
FOREIGN KEY (work_order_id) 
REFERENCES work_orders(id) 
ON DELETE CASCADE;