-- Fix infinite recursion in invoice_work_orders RLS policies
-- Drop all existing policies to eliminate conflicts
DROP POLICY IF EXISTS "Subcontractors can create invoice work orders for their company" ON invoice_work_orders;
DROP POLICY IF EXISTS "Subcontractors can delete their company invoice work orders" ON invoice_work_orders;
DROP POLICY IF EXISTS "Subcontractors can update their company invoice work orders" ON invoice_work_orders;
DROP POLICY IF EXISTS "Subcontractors can view their company invoice work orders" ON invoice_work_orders;
DROP POLICY IF EXISTS "admins_can_delete_invoice_work_orders" ON invoice_work_orders;
DROP POLICY IF EXISTS "admins_can_insert_invoice_work_orders" ON invoice_work_orders;
DROP POLICY IF EXISTS "admins_can_select_invoice_work_orders" ON invoice_work_orders;
DROP POLICY IF EXISTS "admins_can_update_invoice_work_orders" ON invoice_work_orders;
DROP POLICY IF EXISTS "employees_can_select_invoice_work_orders" ON invoice_work_orders;
DROP POLICY IF EXISTS "partners_can_select_own_org_invoice_work_orders" ON invoice_work_orders;

-- Create simplified, non-recursive policies using established helper functions
-- Admin access
CREATE POLICY "admins_can_manage_invoice_work_orders" ON invoice_work_orders
  FOR ALL USING (jwt_is_admin()) WITH CHECK (jwt_is_admin());

-- Employee access (read-only)
CREATE POLICY "employees_can_select_invoice_work_orders" ON invoice_work_orders
  FOR SELECT USING (jwt_user_type() = 'employee'::user_type);

-- Subcontractor access - using a direct organization check to avoid recursion
CREATE POLICY "subcontractors_can_manage_own_invoice_work_orders" ON invoice_work_orders
  FOR ALL
  USING (
    jwt_user_type() = 'subcontractor'::user_type 
    AND EXISTS (
      SELECT 1 FROM invoices i 
      WHERE i.id = invoice_work_orders.invoice_id 
      AND i.subcontractor_organization_id IN (
        SELECT organization_id FROM user_organizations 
        WHERE user_id = jwt_profile_id()
      )
    )
  )
  WITH CHECK (
    jwt_user_type() = 'subcontractor'::user_type 
    AND EXISTS (
      SELECT 1 FROM invoices i 
      WHERE i.id = invoice_work_orders.invoice_id 
      AND i.subcontractor_organization_id IN (
        SELECT organization_id FROM user_organizations 
        WHERE user_id = jwt_profile_id()
      )
    )
  );

-- Partner access (read-only) - direct check without helper function
CREATE POLICY "partners_can_select_own_org_invoice_work_orders" ON invoice_work_orders
  FOR SELECT
  USING (
    jwt_user_type() = 'partner'::user_type 
    AND EXISTS (
      SELECT 1 FROM work_orders wo 
      WHERE wo.id = invoice_work_orders.work_order_id 
      AND wo.organization_id IN (
        SELECT organization_id FROM user_organizations 
        WHERE user_id = jwt_profile_id()
      )
    )
  );