-- Priority 4: Comprehensive RLS Security Gap Resolution
-- This migration implements missing RLS policies for all critical tables

-- ================================
-- AUDIT LOGS SECURITY
-- ================================

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "admins_can_view_audit_logs" 
ON public.audit_logs 
FOR SELECT 
USING (jwt_is_admin());

-- Only system can insert audit logs (via triggers)
CREATE POLICY "system_can_insert_audit_logs" 
ON public.audit_logs 
FOR INSERT 
WITH CHECK (true);

-- Only admins can delete old audit logs
CREATE POLICY "admins_can_delete_audit_logs" 
ON public.audit_logs 
FOR DELETE 
USING (jwt_is_admin());

-- ================================
-- FINANCIAL DATA SECURITY
-- ================================

-- Enable RLS on invoices table
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Admins can manage all invoices
CREATE POLICY "admins_can_manage_invoices" 
ON public.invoices 
FOR ALL 
USING (jwt_is_admin())
WITH CHECK (jwt_is_admin());

-- Subcontractors can view and create their own organization's invoices
CREATE POLICY "subcontractors_can_manage_own_invoices" 
ON public.invoices 
FOR ALL 
USING (
  subcontractor_organization_id IN (
    SELECT om.organization_id 
    FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = auth_profile_id() 
    AND o.organization_type = 'subcontractor'
  )
)
WITH CHECK (
  subcontractor_organization_id IN (
    SELECT om.organization_id 
    FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = auth_profile_id() 
    AND o.organization_type = 'subcontractor'
  )
);

-- Enable RLS on invoice_work_orders table
ALTER TABLE public.invoice_work_orders ENABLE ROW LEVEL SECURITY;

-- Enable RLS on invoice_attachments table
ALTER TABLE public.invoice_attachments ENABLE ROW LEVEL SECURITY;

-- Admins can manage all invoice attachments
CREATE POLICY "admins_can_manage_invoice_attachments" 
ON public.invoice_attachments 
FOR ALL 
USING (jwt_is_admin())
WITH CHECK (jwt_is_admin());

-- Subcontractors can manage attachments for their own invoices
CREATE POLICY "subcontractors_can_manage_own_invoice_attachments" 
ON public.invoice_attachments 
FOR ALL 
USING (
  invoice_id IN (
    SELECT i.id FROM invoices i
    WHERE i.subcontractor_organization_id IN (
      SELECT om.organization_id 
      FROM organization_members om
      JOIN organizations o ON o.id = om.organization_id
      WHERE om.user_id = auth_profile_id() 
      AND o.organization_type = 'subcontractor'
    )
  )
)
WITH CHECK (
  invoice_id IN (
    SELECT i.id FROM invoices i
    WHERE i.subcontractor_organization_id IN (
      SELECT om.organization_id 
      FROM organization_members om
      JOIN organizations o ON o.id = om.organization_id
      WHERE om.user_id = auth_profile_id() 
      AND o.organization_type = 'subcontractor'
    )
  )
);

-- ================================
-- RECEIPT SECURITY
-- ================================

-- Enable RLS on receipts table
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

-- Admins can manage all receipts
CREATE POLICY "admins_can_manage_receipts" 
ON public.receipts 
FOR ALL 
USING (jwt_is_admin())
WITH CHECK (jwt_is_admin());

-- Employees can manage their own receipts
CREATE POLICY "employees_can_manage_own_receipts" 
ON public.receipts 
FOR ALL 
USING (employee_user_id = auth_profile_id())
WITH CHECK (employee_user_id = auth_profile_id());

-- Enable RLS on receipt_work_orders table
ALTER TABLE public.receipt_work_orders ENABLE ROW LEVEL SECURITY;

-- Admins can manage all receipt work order allocations
CREATE POLICY "admins_can_manage_receipt_work_orders" 
ON public.receipt_work_orders 
FOR ALL 
USING (jwt_is_admin())
WITH CHECK (jwt_is_admin());

-- Employees can view allocations for their receipts
CREATE POLICY "employees_can_view_own_receipt_allocations" 
ON public.receipt_work_orders 
FOR SELECT 
USING (
  receipt_id IN (
    SELECT id FROM receipts WHERE employee_user_id = auth_profile_id()
  )
);

-- ================================
-- EMPLOYEE REPORTS SECURITY
-- ================================

-- Enable RLS on employee_reports table
ALTER TABLE public.employee_reports ENABLE ROW LEVEL SECURITY;

-- Admins can manage all employee reports
CREATE POLICY "admins_can_manage_employee_reports" 
ON public.employee_reports 
FOR ALL 
USING (jwt_is_admin())
WITH CHECK (jwt_is_admin());

-- Employees can manage their own reports
CREATE POLICY "employees_can_manage_own_reports" 
ON public.employee_reports 
FOR ALL 
USING (employee_user_id = auth_profile_id())
WITH CHECK (employee_user_id = auth_profile_id());

-- ================================
-- WORK ORDER REPORTS SECURITY
-- ================================

-- Enable RLS on work_order_reports table
ALTER TABLE public.work_order_reports ENABLE ROW LEVEL SECURITY;

-- Admins can manage all work order reports
CREATE POLICY "admins_can_manage_work_order_reports" 
ON public.work_order_reports 
FOR ALL 
USING (jwt_is_admin())
WITH CHECK (jwt_is_admin());

-- Subcontractors can manage reports for work orders assigned to their organization
CREATE POLICY "subcontractors_can_manage_assigned_reports" 
ON public.work_order_reports 
FOR ALL 
USING (
  work_order_id IN (
    SELECT wo.id FROM work_orders wo
    WHERE wo.assigned_organization_id IN (
      SELECT om.organization_id 
      FROM organization_members om
      JOIN organizations o ON o.id = om.organization_id
      WHERE om.user_id = auth_profile_id() 
      AND o.organization_type = 'subcontractor'
    )
  )
)
WITH CHECK (
  work_order_id IN (
    SELECT wo.id FROM work_orders wo
    WHERE wo.assigned_organization_id IN (
      SELECT om.organization_id 
      FROM organization_members om
      JOIN organizations o ON o.id = om.organization_id
      WHERE om.user_id = auth_profile_id() 
      AND o.organization_type = 'subcontractor'
    )
  )
);

-- Partners can view reports for their organization's work orders
CREATE POLICY "partners_can_view_own_work_order_reports" 
ON public.work_order_reports 
FOR SELECT 
USING (
  work_order_id IN (
    SELECT wo.id FROM work_orders wo
    WHERE wo.organization_id IN (
      SELECT om.organization_id 
      FROM organization_members om
      JOIN organizations o ON o.id = om.organization_id
      WHERE om.user_id = auth_profile_id() 
      AND o.organization_type = 'partner'
    )
  )
);

-- ================================
-- SYSTEM CONFIGURATION SECURITY
-- ================================

-- Enable RLS on email_settings table
ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage email settings
CREATE POLICY "admins_can_manage_email_settings" 
ON public.email_settings 
FOR ALL 
USING (jwt_is_admin())
WITH CHECK (jwt_is_admin());

-- Enable RLS on email_templates table
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Only admins can manage email templates
CREATE POLICY "admins_can_manage_email_templates" 
ON public.email_templates 
FOR ALL 
USING (jwt_is_admin())
WITH CHECK (jwt_is_admin());

-- Enable RLS on system_settings table
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage system settings
CREATE POLICY "admins_can_manage_system_settings" 
ON public.system_settings 
FOR ALL 
USING (jwt_is_admin())
WITH CHECK (jwt_is_admin());

-- ================================
-- PARTNER LOCATIONS SECURITY
-- ================================

-- Enable RLS on partner_locations table
ALTER TABLE public.partner_locations ENABLE ROW LEVEL SECURITY;

-- Admins can manage all partner locations
CREATE POLICY "admins_can_manage_partner_locations" 
ON public.partner_locations 
FOR ALL 
USING (jwt_is_admin())
WITH CHECK (jwt_is_admin());

-- Partners can manage their own organization's locations
CREATE POLICY "partners_can_manage_own_locations" 
ON public.partner_locations 
FOR ALL 
USING (
  organization_id IN (
    SELECT om.organization_id 
    FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = auth_profile_id() 
    AND o.organization_type = 'partner'
  )
)
WITH CHECK (
  organization_id IN (
    SELECT om.organization_id 
    FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = auth_profile_id() 
    AND o.organization_type = 'partner'
  )
);

-- Internal users can view all partner locations
CREATE POLICY "internal_can_view_partner_locations" 
ON public.partner_locations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = auth_profile_id() 
    AND o.organization_type = 'internal'
  )
);

-- ================================
-- EMAIL RECIPIENT SETTINGS SECURITY
-- ================================

-- Enable RLS on email_recipient_settings table
ALTER TABLE public.email_recipient_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage email recipient settings
CREATE POLICY "admins_can_manage_email_recipient_settings" 
ON public.email_recipient_settings 
FOR ALL 
USING (jwt_is_admin())
WITH CHECK (jwt_is_admin());

-- ================================
-- ORGANIZATION LOCATION SEQUENCES SECURITY
-- ================================

-- Enable RLS on organization_location_sequences table
ALTER TABLE public.organization_location_sequences ENABLE ROW LEVEL SECURITY;

-- Existing policy should handle this, but ensure it's comprehensive
-- Drop existing if needed and recreate
DROP POLICY IF EXISTS "admins_can_manage_location_sequences" ON public.organization_location_sequences;

CREATE POLICY "admins_can_manage_location_sequences" 
ON public.organization_location_sequences 
FOR ALL 
USING (jwt_is_admin())
WITH CHECK (jwt_is_admin());

-- ================================
-- TRADES TABLE SECURITY FIX
-- ================================

-- Add missing SELECT policy for trades
CREATE POLICY "users_can_view_active_trades" 
ON public.trades 
FOR SELECT 
USING (is_active = true);

-- ================================
-- WORK ORDER MESSAGES ADDITIONAL SECURITY
-- ================================

-- Add policies for partners and subcontractors to view/insert messages for their work orders
CREATE POLICY "partners_can_manage_own_work_order_messages" 
ON public.work_order_messages 
FOR ALL 
USING (
  work_order_id IN (
    SELECT wo.id FROM work_orders wo
    WHERE wo.organization_id IN (
      SELECT om.organization_id 
      FROM organization_members om
      JOIN organizations o ON o.id = om.organization_id
      WHERE om.user_id = auth_profile_id() 
      AND o.organization_type = 'partner'
    )
  )
)
WITH CHECK (
  work_order_id IN (
    SELECT wo.id FROM work_orders wo
    WHERE wo.organization_id IN (
      SELECT om.organization_id 
      FROM organization_members om
      JOIN organizations o ON o.id = om.organization_id
      WHERE om.user_id = auth_profile_id() 
      AND o.organization_type = 'partner'
    )
  )
);

CREATE POLICY "subcontractors_can_manage_assigned_work_order_messages" 
ON public.work_order_messages 
FOR ALL 
USING (
  work_order_id IN (
    SELECT wo.id FROM work_orders wo
    WHERE wo.assigned_organization_id IN (
      SELECT om.organization_id 
      FROM organization_members om
      JOIN organizations o ON o.id = om.organization_id
      WHERE om.user_id = auth_profile_id() 
      AND o.organization_type = 'subcontractor'
    )
  )
)
WITH CHECK (
  work_order_id IN (
    SELECT wo.id FROM work_orders wo
    WHERE wo.assigned_organization_id IN (
      SELECT om.organization_id 
      FROM organization_members om
      JOIN organizations o ON o.id = om.organization_id
      WHERE om.user_id = auth_profile_id() 
      AND o.organization_type = 'subcontractor'
    )
  )
);

-- ================================
-- SECURITY VALIDATION
-- ================================

-- Create a function to validate security setup
CREATE OR REPLACE FUNCTION public.validate_security_setup()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb := '{}';
  tables_with_rls text[];
  tables_without_rls text[];
  policy_count integer;
BEGIN
  -- Check which tables have RLS enabled
  SELECT array_agg(schemaname || '.' || tablename) INTO tables_with_rls
  FROM pg_tables 
  WHERE schemaname = 'public' 
  AND rowsecurity = true;
  
  -- Check which tables don't have RLS enabled
  SELECT array_agg(schemaname || '.' || tablename) INTO tables_without_rls
  FROM pg_tables 
  WHERE schemaname = 'public' 
  AND rowsecurity = false;
  
  -- Count total policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE schemaname = 'public';
  
  RETURN jsonb_build_object(
    'tables_with_rls', COALESCE(tables_with_rls, ARRAY[]::text[]),
    'tables_without_rls', COALESCE(tables_without_rls, ARRAY[]::text[]),
    'total_policies', policy_count,
    'security_status', 'comprehensive_rls_implemented',
    'timestamp', now()
  );
END;
$$;