-- Fix infinite recursion in invoice_work_orders RLS policy
-- The current policy creates a circular dependency when checking invoices table
-- Replace with a more direct approach using JWT metadata

-- Drop the problematic policy
DROP POLICY IF EXISTS "subcontractors_can_manage_own_invoice_work_orders" ON invoice_work_orders;

-- Create a new policy that uses organization IDs from JWT instead of querying invoices table
CREATE POLICY "subcontractors_can_manage_own_invoice_work_orders" 
ON invoice_work_orders 
FOR ALL 
USING (
  jwt_user_type() = 'subcontractor' AND 
  work_order_id IN (
    SELECT wo.id 
    FROM work_orders wo 
    JOIN work_order_assignments woa ON woa.work_order_id = wo.id
    WHERE woa.assigned_to = jwt_profile_id()
  )
)
WITH CHECK (
  jwt_user_type() = 'subcontractor' AND 
  work_order_id IN (
    SELECT wo.id 
    FROM work_orders wo 
    JOIN work_order_assignments woa ON woa.work_order_id = wo.id
    WHERE woa.assigned_to = jwt_profile_id()
  )
);