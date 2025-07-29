-- Fix RLS circular dependency by replacing auth_profile_id() with direct auth.uid() usage
-- and updating organization-based RLS policies

-- First, let's see the current auth_profile_id function and update it to be simpler
CREATE OR REPLACE FUNCTION public.auth_profile_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  -- Direct query without RLS dependency
  SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Update profiles RLS policies to avoid circular dependency
DROP POLICY IF EXISTS "Internal admin manage profiles" ON public.profiles;
DROP POLICY IF EXISTS "Update own profile" ON public.profiles;
DROP POLICY IF EXISTS "View organization member profiles" ON public.profiles;
DROP POLICY IF EXISTS "View own profile" ON public.profiles;
DROP POLICY IF EXISTS "admins_can_update_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "admins_can_view_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "users_own_profile_create" ON public.profiles;
DROP POLICY IF EXISTS "users_own_profile_read" ON public.profiles;
DROP POLICY IF EXISTS "users_own_profile_update" ON public.profiles;

-- Create simplified RLS policies for profiles using direct auth.uid()
CREATE POLICY "profiles_users_own_read" ON public.profiles
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "profiles_users_own_update" ON public.profiles
FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "profiles_users_own_create" ON public.profiles
FOR INSERT WITH CHECK (user_id = auth.uid());

-- Admin policies using organization membership check
CREATE POLICY "profiles_admin_manage" ON public.profiles
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
    AND o.organization_type = 'internal'
    AND om.role = 'admin'
  )
);

-- Update organization_members policies to use direct auth.uid()
DROP POLICY IF EXISTS "organization_members_admin_manage_policy" ON public.organization_members;
DROP POLICY IF EXISTS "organization_members_select_policy" ON public.organization_members;

CREATE POLICY "organization_members_select_own" ON public.organization_members
FOR SELECT USING (
  user_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
);

CREATE POLICY "organization_members_admin_manage" ON public.organization_members
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
    AND o.organization_type = 'internal'
    AND om.role = 'admin'
  )
);

-- Update organizations policies
DROP POLICY IF EXISTS "Internal admin manage organizations" ON public.organizations;
DROP POLICY IF EXISTS "View own organizations" ON public.organizations;

CREATE POLICY "organizations_admin_manage" ON public.organizations
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
    AND o.organization_type = 'internal'
    AND om.role = 'admin'
  )
);

CREATE POLICY "organizations_view_own" ON public.organizations
FOR SELECT USING (
  id IN (
    SELECT om.organization_id FROM organization_members om
    WHERE om.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
  )
);

-- Update work_orders policies to use direct lookups
DROP POLICY IF EXISTS "Internal users view all work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Partners view own work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Partners create work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Subcontractors view assigned work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Internal manage work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Internal admin delete work orders" ON public.work_orders;

-- Internal users can view all work orders
CREATE POLICY "work_orders_internal_view_all" ON public.work_orders
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
    AND o.organization_type = 'internal'
  )
);

-- Internal admin/manager can manage work orders
CREATE POLICY "work_orders_internal_manage" ON public.work_orders
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
    AND o.organization_type = 'internal'
    AND om.role IN ('admin', 'manager')
  )
);

-- Partners can view and create their own work orders
CREATE POLICY "work_orders_partners_view_own" ON public.work_orders
FOR SELECT USING (
  organization_id IN (
    SELECT om.organization_id FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
    AND o.organization_type = 'partner'
  )
);

CREATE POLICY "work_orders_partners_create" ON public.work_orders
FOR INSERT WITH CHECK (
  organization_id IN (
    SELECT om.organization_id FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
    AND o.organization_type = 'partner'
  )
);

-- Subcontractors can view assigned work orders
CREATE POLICY "work_orders_subcontractors_view_assigned" ON public.work_orders
FOR SELECT USING (
  assigned_organization_id IN (
    SELECT om.organization_id FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
    AND o.organization_type = 'subcontractor'
  )
);

-- Update work_order_assignments policies
DROP POLICY IF EXISTS "Internal admin manage work order assignments" ON public.work_order_assignments;
DROP POLICY IF EXISTS "Users view their own assignments" ON public.work_order_assignments;

CREATE POLICY "work_order_assignments_internal_manage" ON public.work_order_assignments
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
    AND o.organization_type = 'internal'
    AND om.role IN ('admin', 'manager')
  )
);

CREATE POLICY "work_order_assignments_view_own" ON public.work_order_assignments
FOR SELECT USING (
  assigned_to = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
  OR assigned_organization_id IN (
    SELECT om.organization_id FROM organization_members om
    WHERE om.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
  )
);

-- Update work_order_attachments policies
DROP POLICY IF EXISTS "Internal org manage attachments" ON public.work_order_attachments;
DROP POLICY IF EXISTS "Partners view attachments for their work orders" ON public.work_order_attachments;
DROP POLICY IF EXISTS "Subcontractors manage attachments for assigned work" ON public.work_order_attachments;

CREATE POLICY "work_order_attachments_internal_manage" ON public.work_order_attachments
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
    AND o.organization_type = 'internal'
  )
);

CREATE POLICY "work_order_attachments_partners_view" ON public.work_order_attachments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM work_orders wo
    JOIN organization_members om ON om.organization_id = wo.organization_id
    JOIN organizations o ON o.id = om.organization_id
    WHERE wo.id = work_order_attachments.work_order_id
    AND om.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
    AND o.organization_type = 'partner'
  )
);

CREATE POLICY "work_order_attachments_subcontractors_manage" ON public.work_order_attachments
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM work_orders wo
    JOIN organization_members om ON om.organization_id = wo.assigned_organization_id
    JOIN organizations o ON o.id = om.organization_id
    WHERE wo.id = work_order_attachments.work_order_id
    AND om.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
    AND o.organization_type = 'subcontractor'
  )
);

-- Add missing RLS policies for tables that had none
-- email_logs policies
CREATE POLICY "email_logs_admin_manage" ON public.email_logs
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
    AND o.organization_type = 'internal'
    AND om.role = 'admin'
  )
);

-- email_recipient_settings policies
CREATE POLICY "email_recipient_settings_admin_manage" ON public.email_recipient_settings
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
    AND o.organization_type = 'internal'
    AND om.role = 'admin'
  )
);

-- email_settings policies
CREATE POLICY "email_settings_admin_manage" ON public.email_settings
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
    AND o.organization_type = 'internal'
    AND om.role = 'admin'
  )
);

-- email_templates policies
CREATE POLICY "email_templates_admin_manage" ON public.email_templates
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
    AND o.organization_type = 'internal'
    AND om.role = 'admin'
  )
);

-- employee_reports policies
CREATE POLICY "employee_reports_internal_manage" ON public.employee_reports
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
    AND o.organization_type = 'internal'
  )
);

-- invoice_attachments policies
CREATE POLICY "invoice_attachments_admin_manage" ON public.invoice_attachments
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
    AND o.organization_type = 'internal'
    AND om.role = 'admin'
  )
);

-- invoices policies
CREATE POLICY "invoices_admin_manage" ON public.invoices
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
    AND o.organization_type = 'internal'
    AND om.role = 'admin'
  )
);

CREATE POLICY "invoices_subcontractor_own" ON public.invoices
FOR ALL USING (
  subcontractor_organization_id IN (
    SELECT om.organization_id FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
    AND o.organization_type = 'subcontractor'
  )
);

-- partner_locations policies
CREATE POLICY "partner_locations_admin_manage" ON public.partner_locations
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
    AND o.organization_type = 'internal'
    AND om.role = 'admin'
  )
);

CREATE POLICY "partner_locations_partners_manage" ON public.partner_locations
FOR ALL USING (
  organization_id IN (
    SELECT om.organization_id FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
    AND o.organization_type = 'partner'
  )
);

-- receipt_work_orders policies
CREATE POLICY "receipt_work_orders_admin_manage" ON public.receipt_work_orders
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
    AND o.organization_type = 'internal'
    AND om.role = 'admin'
  )
);

-- receipts policies
CREATE POLICY "receipts_admin_manage" ON public.receipts
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
    AND o.organization_type = 'internal'
    AND om.role = 'admin'
  )
);

CREATE POLICY "receipts_employee_own" ON public.receipts
FOR ALL USING (
  employee_user_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
);

-- system_settings policies
CREATE POLICY "system_settings_admin_manage" ON public.system_settings
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
    AND o.organization_type = 'internal'
    AND om.role = 'admin'
  )
);

-- trades policies
CREATE POLICY "trades_all_read" ON public.trades
FOR SELECT USING (true);

CREATE POLICY "trades_admin_manage" ON public.trades
FOR INSERT, UPDATE, DELETE USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
    AND o.organization_type = 'internal'
    AND om.role = 'admin'
  )
);

-- work_order_reports policies
CREATE POLICY "work_order_reports_admin_manage" ON public.work_order_reports
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
    AND o.organization_type = 'internal'
  )
);

CREATE POLICY "work_order_reports_subcontractor_own" ON public.work_order_reports
FOR ALL USING (
  subcontractor_user_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
);

-- audit_logs policies
CREATE POLICY "audit_logs_admin_read" ON public.audit_logs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
    AND o.organization_type = 'internal'
    AND om.role = 'admin'
  )
);