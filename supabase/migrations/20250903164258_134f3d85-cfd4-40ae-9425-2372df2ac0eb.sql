-- Add missing foreign key constraint between subcontractor_bill_work_orders and work_orders
-- Use RESTRICT to prevent accidental billing data loss
DO $$
BEGIN
  -- First drop the existing constraint if it exists (it was created with CASCADE)
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_subcontractor_bill_work_orders_work_order_id'
  ) THEN
    ALTER TABLE public.subcontractor_bill_work_orders 
    DROP CONSTRAINT fk_subcontractor_bill_work_orders_work_order_id;
  END IF;
  
  -- Add the constraint with RESTRICT
  ALTER TABLE public.subcontractor_bill_work_orders 
  ADD CONSTRAINT fk_subcontractor_bill_work_orders_work_order_id 
  FOREIGN KEY (work_order_id) REFERENCES public.work_orders(id) 
  ON DELETE RESTRICT;
END $$;

-- Drop existing policies
DROP POLICY IF EXISTS "admins_can_manage_subcontractor_bill_work_orders" ON subcontractor_bill_work_orders;
DROP POLICY IF EXISTS "subcontractors_can_manage_own_subcontractor_bill_work_orders" ON subcontractor_bill_work_orders;

-- Create policy for internal users (full access)
CREATE POLICY "internal_users_can_manage_all_bill_work_orders"
ON subcontractor_bill_work_orders 
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = auth_profile_id_safe()
    AND o.organization_type = 'internal'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = auth_profile_id_safe()
    AND o.organization_type = 'internal'
  )
);

-- Create policy for subcontractors (manage their own)
CREATE POLICY "subcontractors_can_manage_own_bill_work_orders" 
ON subcontractor_bill_work_orders 
FOR ALL
TO authenticated
USING (
  EXISTS ( 
    SELECT 1
    FROM subcontractor_bills sb
    JOIN organization_members om ON om.organization_id = sb.subcontractor_organization_id
    JOIN organizations o ON o.id = om.organization_id
    WHERE sb.id = subcontractor_bill_work_orders.subcontractor_bill_id
      AND om.user_id = auth_profile_id_safe()
      AND o.organization_type = 'subcontractor'
  )
)
WITH CHECK (
  EXISTS ( 
    SELECT 1
    FROM subcontractor_bills sb
    JOIN organization_members om ON om.organization_id = sb.subcontractor_organization_id
    JOIN organizations o ON o.id = om.organization_id
    WHERE sb.id = subcontractor_bill_work_orders.subcontractor_bill_id
      AND om.user_id = auth_profile_id_safe()
      AND o.organization_type = 'subcontractor'
  )
);