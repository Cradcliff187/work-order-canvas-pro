-- Migration: 20250711000004_clean_rls_policies.sql
-- Clean consolidation of all RLS policies for better performance and maintainability
-- Drops all existing policies and recreates them with consistent patterns and optimized helper functions

-- Phase 1: Drop All Existing Policies Safely
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all existing RLS policies from all tables
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- Phase 2: Create Optimized SECURITY DEFINER Helper Functions
-- These functions bypass RLS to prevent infinite recursion and improve performance

-- Get current authenticated user's UUID
CREATE OR REPLACE FUNCTION public.auth_user_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN auth.uid();
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

-- Get current user's profile ID
CREATE OR REPLACE FUNCTION public.auth_profile_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT id 
    FROM public.profiles 
    WHERE user_id = auth.uid() 
    LIMIT 1
  );
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

-- Get current user's type efficiently
CREATE OR REPLACE FUNCTION public.auth_user_type()
RETURNS public.user_type
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT user_type 
    FROM public.profiles 
    WHERE user_id = auth.uid() 
    LIMIT 1
  );
EXCEPTION WHEN OTHERS THEN
  RETURN 'subcontractor'::public.user_type;
END;
$$;

-- Check if current user is admin
CREATE OR REPLACE FUNCTION public.auth_is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN public.auth_user_type() = 'admin';
END;
$$;

-- Get current user's organization IDs
CREATE OR REPLACE FUNCTION public.auth_user_organizations()
RETURNS TABLE(organization_id UUID)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT uo.organization_id 
  FROM public.user_organizations uo
  WHERE uo.user_id = public.auth_profile_id();
END;
$$;

-- Check if user belongs to specific organization
CREATE OR REPLACE FUNCTION public.auth_user_belongs_to_organization(org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.auth_user_organizations() 
    WHERE organization_id = org_id
  );
END;
$$;

-- Check if user is assigned to specific work order
CREATE OR REPLACE FUNCTION public.auth_user_assigned_to_work_order(wo_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.work_orders wo
    WHERE wo.id = wo_id 
    AND wo.assigned_to = public.auth_profile_id()
  );
END;
$$;

-- Phase 3: Create Clean, Consistent RLS Policies

-- === PROFILES TABLE ===
CREATE POLICY "Admins can manage all profiles"
ON public.profiles FOR ALL
TO authenticated
USING (public.auth_is_admin())
WITH CHECK (public.auth_is_admin());

CREATE POLICY "Authenticated users can view profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (user_id = public.auth_user_id())
WITH CHECK (user_id = public.auth_user_id());

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (user_id = public.auth_user_id());

-- === ORGANIZATIONS TABLE ===
CREATE POLICY "Admins can manage all organizations"
ON public.organizations FOR ALL
TO authenticated
USING (public.auth_is_admin())
WITH CHECK (public.auth_is_admin());

CREATE POLICY "Partners can view their organizations"
ON public.organizations FOR SELECT
TO authenticated
USING (
  public.auth_user_type() = 'partner' 
  AND public.auth_user_belongs_to_organization(id)
);

CREATE POLICY "Subcontractors can view organizations they work for"
ON public.organizations FOR SELECT
TO authenticated
USING (
  public.auth_user_type() = 'subcontractor'
  AND id IN (
    SELECT DISTINCT wo.organization_id 
    FROM public.work_orders wo 
    WHERE wo.assigned_to = public.auth_profile_id()
  )
);

-- === USER_ORGANIZATIONS TABLE ===
CREATE POLICY "Admins can manage all user organizations"
ON public.user_organizations FOR ALL
TO authenticated
USING (public.auth_is_admin())
WITH CHECK (public.auth_is_admin());

CREATE POLICY "Partners can manage their organization relationships"
ON public.user_organizations FOR ALL
TO authenticated
USING (
  public.auth_user_type() = 'partner'
  AND public.auth_user_belongs_to_organization(organization_id)
)
WITH CHECK (
  public.auth_user_type() = 'partner'
  AND public.auth_user_belongs_to_organization(organization_id)
);

CREATE POLICY "Users can view their own organization relationships"
ON public.user_organizations FOR SELECT
TO authenticated
USING (user_id = public.auth_profile_id());

-- === TRADES TABLE ===
CREATE POLICY "Admins can manage all trades"
ON public.trades FOR ALL
TO authenticated
USING (public.auth_is_admin())
WITH CHECK (public.auth_is_admin());

CREATE POLICY "Partners and subcontractors can view active trades"
ON public.trades FOR SELECT
TO authenticated
USING (
  public.auth_user_type() IN ('partner', 'subcontractor')
  AND is_active = true
);

-- === WORK_ORDERS TABLE ===
CREATE POLICY "Admins can manage all work orders"
ON public.work_orders FOR ALL
TO authenticated
USING (public.auth_is_admin())
WITH CHECK (public.auth_is_admin());

CREATE POLICY "Partners can manage work orders in their organizations"
ON public.work_orders FOR ALL
TO authenticated
USING (
  public.auth_user_type() = 'partner'
  AND public.auth_user_belongs_to_organization(organization_id)
)
WITH CHECK (
  public.auth_user_type() = 'partner'
  AND public.auth_user_belongs_to_organization(organization_id)
);

CREATE POLICY "Subcontractors can view assigned work orders"
ON public.work_orders FOR SELECT
TO authenticated
USING (
  public.auth_user_type() = 'subcontractor'
  AND public.auth_user_assigned_to_work_order(id)
);

-- === WORK_ORDER_REPORTS TABLE ===
CREATE POLICY "Admins can manage all work order reports"
ON public.work_order_reports FOR ALL
TO authenticated
USING (public.auth_is_admin())
WITH CHECK (public.auth_is_admin());

CREATE POLICY "Partners can view reports for their organization work orders"
ON public.work_order_reports FOR SELECT
TO authenticated
USING (
  public.auth_user_type() = 'partner'
  AND work_order_id IN (
    SELECT wo.id 
    FROM public.work_orders wo
    WHERE public.auth_user_belongs_to_organization(wo.organization_id)
  )
);

CREATE POLICY "Partners can update reports for their organization work orders"
ON public.work_order_reports FOR UPDATE
TO authenticated
USING (
  public.auth_user_type() = 'partner'
  AND work_order_id IN (
    SELECT wo.id 
    FROM public.work_orders wo
    WHERE public.auth_user_belongs_to_organization(wo.organization_id)
  )
)
WITH CHECK (
  public.auth_user_type() = 'partner'
  AND work_order_id IN (
    SELECT wo.id 
    FROM public.work_orders wo
    WHERE public.auth_user_belongs_to_organization(wo.organization_id)
  )
);

CREATE POLICY "Subcontractors can manage their own reports"
ON public.work_order_reports FOR ALL
TO authenticated
USING (
  public.auth_user_type() = 'subcontractor'
  AND subcontractor_user_id = public.auth_profile_id()
)
WITH CHECK (
  public.auth_user_type() = 'subcontractor'
  AND subcontractor_user_id = public.auth_profile_id()
);

-- === WORK_ORDER_ATTACHMENTS TABLE ===
CREATE POLICY "Admins can manage all work order attachments"
ON public.work_order_attachments FOR ALL
TO authenticated
USING (public.auth_is_admin())
WITH CHECK (public.auth_is_admin());

CREATE POLICY "Partners can view attachments for their organization work orders"
ON public.work_order_attachments FOR SELECT
TO authenticated
USING (
  public.auth_user_type() = 'partner'
  AND (
    work_order_id IN (
      SELECT wo.id 
      FROM public.work_orders wo
      WHERE public.auth_user_belongs_to_organization(wo.organization_id)
    )
    OR work_order_report_id IN (
      SELECT wor.id 
      FROM public.work_order_reports wor
      JOIN public.work_orders wo ON wo.id = wor.work_order_id
      WHERE public.auth_user_belongs_to_organization(wo.organization_id)
    )
  )
);

CREATE POLICY "Subcontractors can manage attachments for their work"
ON public.work_order_attachments FOR ALL
TO authenticated
USING (
  public.auth_user_type() = 'subcontractor'
  AND (
    uploaded_by_user_id = public.auth_profile_id()
    OR work_order_id IN (
      SELECT wo.id 
      FROM public.work_orders wo
      WHERE public.auth_user_assigned_to_work_order(wo.id)
    )
    OR work_order_report_id IN (
      SELECT wor.id 
      FROM public.work_order_reports wor
      WHERE wor.subcontractor_user_id = public.auth_profile_id()
    )
  )
)
WITH CHECK (
  public.auth_user_type() = 'subcontractor'
  AND uploaded_by_user_id = public.auth_profile_id()
);

-- === EMAIL_TEMPLATES TABLE ===
CREATE POLICY "Admins can manage all email templates"
ON public.email_templates FOR ALL
TO authenticated
USING (public.auth_is_admin())
WITH CHECK (public.auth_is_admin());

CREATE POLICY "Partners and subcontractors can view active email templates"
ON public.email_templates FOR SELECT
TO authenticated
USING (
  public.auth_user_type() IN ('partner', 'subcontractor')
  AND is_active = true
);

-- === EMAIL_LOGS TABLE ===
CREATE POLICY "Admins can view all email logs"
ON public.email_logs FOR SELECT
TO authenticated
USING (public.auth_is_admin());

CREATE POLICY "Partners can view email logs for their organization"
ON public.email_logs FOR SELECT
TO authenticated
USING (
  public.auth_user_type() = 'partner'
  AND work_order_id IN (
    SELECT wo.id 
    FROM public.work_orders wo
    WHERE public.auth_user_belongs_to_organization(wo.organization_id)
  )
);

-- === EMAIL_SETTINGS TABLE ===
CREATE POLICY "Admins can manage all email settings"
ON public.email_settings FOR ALL
TO authenticated
USING (public.auth_is_admin())
WITH CHECK (public.auth_is_admin());

-- === SYSTEM_SETTINGS TABLE ===
CREATE POLICY "Admins can manage all system settings"
ON public.system_settings FOR ALL
TO authenticated
USING (public.auth_is_admin())
WITH CHECK (public.auth_is_admin());

-- === AUDIT_LOGS TABLE ===
CREATE POLICY "Admins can view all audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (public.auth_is_admin());

-- Phase 4: Create Legacy Function Aliases for Backward Compatibility
-- These ensure existing code doesn't break while using optimized functions internally

CREATE OR REPLACE FUNCTION public.get_current_user_type()
RETURNS public.user_type
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN public.auth_user_type();
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN public.auth_is_admin();
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_organizations()
RETURNS TABLE(organization_id UUID)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.auth_user_organizations();
END;
$$;

CREATE OR REPLACE FUNCTION public.user_belongs_to_organization(org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN public.auth_user_belongs_to_organization(org_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.user_assigned_to_work_order(wo_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN public.auth_user_assigned_to_work_order(wo_id);
END;
$$;

-- Phase 5: Grant Execute Permissions
GRANT EXECUTE ON FUNCTION public.auth_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_profile_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_type() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_organizations() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_belongs_to_organization(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_assigned_to_work_order(UUID) TO authenticated;

-- Legacy function permissions
GRANT EXECUTE ON FUNCTION public.get_current_user_type() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_organizations() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_belongs_to_organization(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_assigned_to_work_order(UUID) TO authenticated;

-- Phase 6: Add Function Documentation
COMMENT ON FUNCTION public.auth_user_id() IS 
'Returns current authenticated user UUID. SECURITY DEFINER to bypass RLS.';

COMMENT ON FUNCTION public.auth_profile_id() IS 
'Returns current user profile ID from profiles table. SECURITY DEFINER to bypass RLS.';

COMMENT ON FUNCTION public.auth_user_type() IS 
'Returns current user type efficiently. SECURITY DEFINER to prevent RLS recursion.';

COMMENT ON FUNCTION public.auth_is_admin() IS 
'Checks if current user is admin. Optimized helper for RLS policies.';

COMMENT ON FUNCTION public.auth_user_organizations() IS 
'Returns organization IDs current user belongs to. SECURITY DEFINER for performance.';

COMMENT ON FUNCTION public.auth_user_belongs_to_organization(UUID) IS 
'Checks if current user belongs to specified organization. Optimized for RLS.';

COMMENT ON FUNCTION public.auth_user_assigned_to_work_order(UUID) IS 
'Checks if current user is assigned to specified work order. Optimized for RLS.';

-- Migration Complete: Clean RLS System Established
-- ✅ All policies dropped and recreated with consistent patterns
-- ✅ Optimized SECURITY DEFINER functions prevent RLS recursion
-- ✅ Backward compatibility maintained with legacy function aliases
-- ✅ Performance improved with direct auth function calls
-- ✅ Admin: Full access to everything
-- ✅ Partner: Organization-scoped access
-- ✅ Subcontractor: Assignment-scoped access
-- ✅ Comprehensive documentation added