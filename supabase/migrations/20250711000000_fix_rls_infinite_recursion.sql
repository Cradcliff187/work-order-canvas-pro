-- Migration: Fix RLS Infinite Recursion
-- This migration completely eliminates infinite recursion in RLS policies by:
-- 1. Dropping all existing policies
-- 2. Creating SECURITY DEFINER helper functions that bypass RLS
-- 3. Implementing clean policies using only the helper functions

-- ============================================================================
-- PHASE 1: Drop All Existing RLS Policies
-- ============================================================================

DO $$ 
DECLARE 
    pol record;
BEGIN 
    -- Drop all existing policies to start fresh
    FOR pol IN SELECT schemaname, tablename, policyname 
               FROM pg_policies 
               WHERE schemaname = 'public'
    LOOP 
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON ' || pol.schemaname || '.' || pol.tablename;
    END LOOP; 
END $$;

-- ============================================================================
-- PHASE 2: Create SECURITY DEFINER Helper Functions
-- ============================================================================

-- Helper function: Get current user's auth.uid()
CREATE OR REPLACE FUNCTION public.auth_user_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
    SELECT auth.uid();
$$;

-- Helper function: Get current user's profile.id without triggering RLS
CREATE OR REPLACE FUNCTION public.auth_profile_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
    SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Helper function: Get current user's user_type without triggering RLS
CREATE OR REPLACE FUNCTION public.auth_user_type()
RETURNS user_type
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
    SELECT user_type FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Helper function: Check if current user is admin
CREATE OR REPLACE FUNCTION public.auth_is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
    SELECT (SELECT user_type FROM public.profiles WHERE user_id = auth.uid() LIMIT 1) = 'admin';
$$;

-- Helper function: Get current user's organization IDs
CREATE OR REPLACE FUNCTION public.auth_user_organizations()
RETURNS UUID[]
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
    SELECT ARRAY(
        SELECT uo.organization_id 
        FROM public.user_organizations uo
        JOIN public.profiles p ON p.id = uo.user_id
        WHERE p.user_id = auth.uid()
    );
$$;

-- Helper function: Check if user is assigned to work order
CREATE OR REPLACE FUNCTION public.auth_user_assigned_to_work_order(work_order_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.work_orders wo
        WHERE wo.id = work_order_id 
        AND wo.assigned_to = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
    );
$$;

-- Helper function: Check if user belongs to organization (for backward compatibility)
CREATE OR REPLACE FUNCTION public.auth_user_belongs_to_organization(org_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
    SELECT org_id = ANY(
        SELECT uo.organization_id 
        FROM public.user_organizations uo
        JOIN public.profiles p ON p.id = uo.user_id
        WHERE p.user_id = auth.uid()
    );
$$;

-- ============================================================================
-- PHASE 3: Create Clean RLS Policies for All Tables
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PROFILES TABLE
-- ----------------------------------------------------------------------------

-- Admins can manage all profiles
CREATE POLICY "Admins can manage all profiles"
ON public.profiles
FOR ALL
USING (auth_is_admin())
WITH CHECK (auth_is_admin());

-- Users can view all profiles (needed for app functionality)
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
USING (auth_user_id() IS NOT NULL);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (user_id = auth_user_id())
WITH CHECK (user_id = auth_user_id());

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
WITH CHECK (user_id = auth_user_id());

-- ----------------------------------------------------------------------------
-- 2. ORGANIZATIONS TABLE
-- ----------------------------------------------------------------------------

-- Admins can manage all organizations
CREATE POLICY "Admins can manage organizations"
ON public.organizations
FOR ALL
USING (auth_is_admin())
WITH CHECK (auth_is_admin());

-- Partners can view their organizations
CREATE POLICY "Partners can view their organizations"
ON public.organizations
FOR SELECT
USING (
    auth_user_type() = 'partner' 
    AND id = ANY(auth_user_organizations())
);

-- Subcontractors can view organizations they work for
CREATE POLICY "Subcontractors can view assigned organizations"
ON public.organizations
FOR SELECT
USING (
    auth_user_type() = 'subcontractor'
    AND id IN (
        SELECT DISTINCT wo.organization_id
        FROM public.work_orders wo
        WHERE wo.assigned_to = auth_profile_id()
    )
);

-- ----------------------------------------------------------------------------
-- 3. USER_ORGANIZATIONS TABLE
-- ----------------------------------------------------------------------------

-- Admins can manage all user-organization relationships
CREATE POLICY "Admins can manage user organizations"
ON public.user_organizations
FOR ALL
USING (auth_is_admin())
WITH CHECK (auth_is_admin());

-- Partners can manage relationships for their organizations
CREATE POLICY "Partners can manage their org relationships"
ON public.user_organizations
FOR ALL
USING (
    auth_user_type() = 'partner'
    AND organization_id = ANY(auth_user_organizations())
)
WITH CHECK (
    auth_user_type() = 'partner'
    AND organization_id = ANY(auth_user_organizations())
);

-- Users can view their own organization relationships
CREATE POLICY "Users can view own org relationships"
ON public.user_organizations
FOR SELECT
USING (user_id = auth_profile_id());

-- ----------------------------------------------------------------------------
-- 4. TRADES TABLE
-- ----------------------------------------------------------------------------

-- Admins can manage all trades
CREATE POLICY "Admins can manage trades"
ON public.trades
FOR ALL
USING (auth_is_admin())
WITH CHECK (auth_is_admin());

-- Partners and subcontractors can view active trades
CREATE POLICY "Partners and subcontractors can view trades"
ON public.trades
FOR SELECT
USING (
    auth_user_type() IN ('partner', 'subcontractor')
    AND is_active = true
);

-- ----------------------------------------------------------------------------
-- 5. WORK_ORDERS TABLE
-- ----------------------------------------------------------------------------

-- Admins can manage all work orders
CREATE POLICY "Admins can manage all work orders"
ON public.work_orders
FOR ALL
USING (auth_is_admin())
WITH CHECK (auth_is_admin());

-- Partners can manage work orders in their organizations
CREATE POLICY "Partners can manage org work orders"
ON public.work_orders
FOR ALL
USING (
    auth_user_type() = 'partner'
    AND organization_id = ANY(auth_user_organizations())
)
WITH CHECK (
    auth_user_type() = 'partner'
    AND organization_id = ANY(auth_user_organizations())
);

-- Subcontractors can view assigned work orders
CREATE POLICY "Subcontractors can view assigned work orders"
ON public.work_orders
FOR SELECT
USING (
    auth_user_type() = 'subcontractor'
    AND assigned_to = auth_profile_id()
);

-- ----------------------------------------------------------------------------
-- 6. WORK_ORDER_REPORTS TABLE
-- ----------------------------------------------------------------------------

-- Admins can manage all work order reports
CREATE POLICY "Admins can manage all reports"
ON public.work_order_reports
FOR ALL
USING (auth_is_admin())
WITH CHECK (auth_is_admin());

-- Partners can view and review reports for their organization work orders
CREATE POLICY "Partners can manage org reports"
ON public.work_order_reports
FOR ALL
USING (
    auth_user_type() = 'partner'
    AND work_order_id IN (
        SELECT id FROM public.work_orders 
        WHERE organization_id = ANY(auth_user_organizations())
    )
)
WITH CHECK (
    auth_user_type() = 'partner'
    AND work_order_id IN (
        SELECT id FROM public.work_orders 
        WHERE organization_id = ANY(auth_user_organizations())
    )
);

-- Subcontractors can manage their own reports
CREATE POLICY "Subcontractors can manage own reports"
ON public.work_order_reports
FOR ALL
USING (
    auth_user_type() = 'subcontractor'
    AND subcontractor_user_id = auth_profile_id()
)
WITH CHECK (
    auth_user_type() = 'subcontractor'
    AND subcontractor_user_id = auth_profile_id()
);

-- ----------------------------------------------------------------------------
-- 7. WORK_ORDER_ATTACHMENTS TABLE
-- ----------------------------------------------------------------------------

-- Admins can manage all attachments
CREATE POLICY "Admins can manage all attachments"
ON public.work_order_attachments
FOR ALL
USING (auth_is_admin())
WITH CHECK (auth_is_admin());

-- Partners can view attachments for their organization work orders
CREATE POLICY "Partners can view org attachments"
ON public.work_order_attachments
FOR SELECT
USING (
    auth_user_type() = 'partner'
    AND (
        work_order_id IN (
            SELECT id FROM public.work_orders 
            WHERE organization_id = ANY(auth_user_organizations())
        )
        OR work_order_report_id IN (
            SELECT wor.id FROM public.work_order_reports wor
            JOIN public.work_orders wo ON wo.id = wor.work_order_id
            WHERE wo.organization_id = ANY(auth_user_organizations())
        )
    )
);

-- Subcontractors can manage attachments for their work
CREATE POLICY "Subcontractors can manage own attachments"
ON public.work_order_attachments
FOR ALL
USING (
    auth_user_type() = 'subcontractor'
    AND (
        uploaded_by_user_id = auth_profile_id()
        OR work_order_id IN (
            SELECT id FROM public.work_orders 
            WHERE assigned_to = auth_profile_id()
        )
        OR work_order_report_id IN (
            SELECT id FROM public.work_order_reports 
            WHERE subcontractor_user_id = auth_profile_id()
        )
    )
)
WITH CHECK (
    auth_user_type() = 'subcontractor'
    AND uploaded_by_user_id = auth_profile_id()
);

-- ----------------------------------------------------------------------------
-- 8. EMAIL_TEMPLATES TABLE
-- ----------------------------------------------------------------------------

-- Admins can manage email templates
CREATE POLICY "Admins can manage email templates"
ON public.email_templates
FOR ALL
USING (auth_is_admin())
WITH CHECK (auth_is_admin());

-- Partners and subcontractors can view active templates
CREATE POLICY "Users can view active email templates"
ON public.email_templates
FOR SELECT
USING (
    auth_user_type() IN ('partner', 'subcontractor')
    AND is_active = true
);

-- ----------------------------------------------------------------------------
-- 9. EMAIL_LOGS TABLE
-- ----------------------------------------------------------------------------

-- Admins can view all email logs
CREATE POLICY "Admins can view email logs"
ON public.email_logs
FOR SELECT
USING (auth_is_admin());

-- Partners can view email logs for their organization work orders
CREATE POLICY "Partners can view org email logs"
ON public.email_logs
FOR SELECT
USING (
    auth_user_type() = 'partner'
    AND work_order_id IN (
        SELECT id FROM public.work_orders 
        WHERE organization_id = ANY(auth_user_organizations())
    )
);

-- ----------------------------------------------------------------------------
-- 10. EMAIL_SETTINGS TABLE
-- ----------------------------------------------------------------------------

-- Only admins can manage email settings
CREATE POLICY "Admins can manage email settings"
ON public.email_settings
FOR ALL
USING (auth_is_admin())
WITH CHECK (auth_is_admin());

-- ----------------------------------------------------------------------------
-- 11. SYSTEM_SETTINGS TABLE
-- ----------------------------------------------------------------------------

-- Only admins can manage system settings
CREATE POLICY "Admins can manage system settings"
ON public.system_settings
FOR ALL
USING (auth_is_admin())
WITH CHECK (auth_is_admin());

-- ----------------------------------------------------------------------------
-- 12. AUDIT_LOGS TABLE
-- ----------------------------------------------------------------------------

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
ON public.audit_logs
FOR SELECT
USING (auth_is_admin());

-- ============================================================================
-- PHASE 4: Update Existing Functions to Use New Helpers
-- ============================================================================

-- Update existing functions to use new helper functions
DROP FUNCTION IF EXISTS public.get_current_user_type();
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.get_user_organizations();
DROP FUNCTION IF EXISTS public.user_belongs_to_organization(UUID);
DROP FUNCTION IF EXISTS public.user_assigned_to_work_order(UUID);

-- Create compatibility aliases
CREATE OR REPLACE FUNCTION public.get_current_user_type()
RETURNS user_type
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
    SELECT auth_user_type();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
    SELECT auth_is_admin();
$$;

CREATE OR REPLACE FUNCTION public.user_belongs_to_organization(org_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
    SELECT auth_user_belongs_to_organization(org_id);
$$;

CREATE OR REPLACE FUNCTION public.user_assigned_to_work_order(wo_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
    SELECT auth_user_assigned_to_work_order(wo_id);
$$;

-- ============================================================================
-- PHASE 5: Comments and Documentation
-- ============================================================================

COMMENT ON FUNCTION public.auth_user_id() IS 'Returns current authenticated user ID';
COMMENT ON FUNCTION public.auth_profile_id() IS 'Returns current user profile ID without triggering RLS';
COMMENT ON FUNCTION public.auth_user_type() IS 'Returns current user type without triggering RLS';
COMMENT ON FUNCTION public.auth_is_admin() IS 'Checks if current user is admin without triggering RLS';
COMMENT ON FUNCTION public.auth_user_organizations() IS 'Returns array of organization IDs for current user without triggering RLS';
COMMENT ON FUNCTION public.auth_user_assigned_to_work_order(UUID) IS 'Checks if user is assigned to work order without triggering RLS';
COMMENT ON FUNCTION public.auth_user_belongs_to_organization(UUID) IS 'Checks if user belongs to organization without triggering RLS';

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- This migration eliminates all RLS infinite recursion by:
-- 1. Using SECURITY DEFINER functions that bypass RLS entirely
-- 2. Implementing clean, non-recursive policies
-- 3. Removing all direct profile table queries from policy conditions
-- 4. Maintaining backward compatibility with existing function names