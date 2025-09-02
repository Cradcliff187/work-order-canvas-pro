-- Migration: Rename invoice tables to subcontractor bills
-- This migration renames invoice-related tables and columns to use "bill" terminology
-- while keeping partner invoices unchanged

BEGIN;

-- 1. Drop RLS policies that reference old table names in their expressions
-- (These will break after table rename due to table references in policy expressions)
DROP POLICY IF EXISTS "admins_can_manage_invoices" ON invoices;
DROP POLICY IF EXISTS "subcontractors_can_manage_own_invoices" ON invoices;
DROP POLICY IF EXISTS "admins_can_manage_invoice_work_orders" ON invoice_work_orders;
DROP POLICY IF EXISTS "subcontractors_can_manage_own_invoice_work_orders" ON invoice_work_orders;
DROP POLICY IF EXISTS "admins_can_manage_invoice_attachments" ON invoice_attachments;
DROP POLICY IF EXISTS "subcontractors_can_manage_own_invoice_attachments" ON invoice_attachments;

-- 2. Rename main tables (CASCADE automatically updates foreign keys)
ALTER TABLE invoices RENAME TO subcontractor_bills;
ALTER TABLE invoice_work_orders RENAME TO subcontractor_bill_work_orders;
ALTER TABLE invoice_attachments RENAME TO subcontractor_bill_attachments;

-- 3. Rename foreign key columns in the renamed tables
ALTER TABLE subcontractor_bill_work_orders 
  RENAME COLUMN invoice_id TO subcontractor_bill_id;

ALTER TABLE subcontractor_bill_attachments 
  RENAME COLUMN invoice_id TO subcontractor_bill_id;

-- 4. Rename columns in work_order_reports (critical for partner billing!)
-- NOTE: partner_invoice_id should NOT be renamed as it correctly refers to partner invoices
ALTER TABLE work_order_reports 
  RENAME COLUMN invoice_amount TO bill_amount;
ALTER TABLE work_order_reports 
  RENAME COLUMN invoice_number TO bill_number;
ALTER TABLE work_order_reports 
  RENAME COLUMN approved_subcontractor_invoice_amount TO approved_subcontractor_bill_amount;

-- 5. Rename the invoice number generation function
ALTER FUNCTION generate_internal_invoice_number() 
  RENAME TO generate_internal_bill_number;

-- 6. Recreate RLS policies with new table names
CREATE POLICY "admins_can_manage_subcontractor_bills" 
ON subcontractor_bills FOR ALL 
USING (jwt_is_admin()) 
WITH CHECK (jwt_is_admin());

CREATE POLICY "subcontractors_can_manage_own_subcontractor_bills" 
ON subcontractor_bills FOR ALL 
USING (subcontractor_organization_id IN (
  SELECT om.organization_id
  FROM organization_members om
  JOIN organizations o ON o.id = om.organization_id
  WHERE om.user_id = auth_profile_id() 
  AND o.organization_type = 'subcontractor'::organization_type
))
WITH CHECK ((subcontractor_organization_id IN (
  SELECT om.organization_id
  FROM organization_members om
  JOIN organizations o ON o.id = om.organization_id
  WHERE om.user_id = auth_profile_id() 
  AND o.organization_type = 'subcontractor'::organization_type
)) OR jwt_is_admin());

CREATE POLICY "admins_can_manage_subcontractor_bill_work_orders" 
ON subcontractor_bill_work_orders FOR ALL 
USING (jwt_is_admin()) 
WITH CHECK (jwt_is_admin());

CREATE POLICY "subcontractors_can_manage_own_subcontractor_bill_work_orders" 
ON subcontractor_bill_work_orders FOR ALL 
USING (EXISTS (
  SELECT 1
  FROM subcontractor_bills sb
  JOIN organization_members om ON om.organization_id = sb.subcontractor_organization_id
  JOIN organizations o ON o.id = om.organization_id
  WHERE sb.id = subcontractor_bill_work_orders.subcontractor_bill_id 
  AND om.user_id = auth_profile_id_safe() 
  AND o.organization_type = 'subcontractor'::organization_type
))
WITH CHECK (EXISTS (
  SELECT 1
  FROM subcontractor_bills sb
  JOIN organization_members om ON om.organization_id = sb.subcontractor_organization_id
  JOIN organizations o ON o.id = om.organization_id
  WHERE sb.id = subcontractor_bill_work_orders.subcontractor_bill_id 
  AND om.user_id = auth_profile_id_safe() 
  AND o.organization_type = 'subcontractor'::organization_type
));

CREATE POLICY "admins_can_manage_subcontractor_bill_attachments" 
ON subcontractor_bill_attachments FOR ALL 
USING (jwt_is_admin()) 
WITH CHECK (jwt_is_admin());

CREATE POLICY "subcontractors_can_manage_own_subcontractor_bill_attachments" 
ON subcontractor_bill_attachments FOR ALL 
USING (subcontractor_bill_id IN (
  SELECT sb.id
  FROM subcontractor_bills sb
  WHERE sb.subcontractor_organization_id IN (
    SELECT om.organization_id
    FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = auth_profile_id() 
    AND o.organization_type = 'subcontractor'::organization_type
  )
))
WITH CHECK (subcontractor_bill_id IN (
  SELECT sb.id
  FROM subcontractor_bills sb
  WHERE sb.subcontractor_organization_id IN (
    SELECT om.organization_id
    FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = auth_profile_id() 
    AND o.organization_type = 'subcontractor'::organization_type
  )
));

-- 7. Validation: Ensure migration completed successfully
DO $$
BEGIN
  -- Verify tables exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subcontractor_bills') THEN
    RAISE EXCEPTION 'Migration failed: subcontractor_bills table not found';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subcontractor_bill_work_orders') THEN
    RAISE EXCEPTION 'Migration failed: subcontractor_bill_work_orders table not found';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subcontractor_bill_attachments') THEN
    RAISE EXCEPTION 'Migration failed: subcontractor_bill_attachments table not found';
  END IF;
  
  -- Verify function was renamed
  IF NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'generate_internal_bill_number') THEN
    RAISE EXCEPTION 'Migration failed: generate_internal_bill_number function not found';
  END IF;
  
  RAISE NOTICE 'Migration completed successfully: Invoice tables renamed to subcontractor bills';
END $$;

COMMIT;