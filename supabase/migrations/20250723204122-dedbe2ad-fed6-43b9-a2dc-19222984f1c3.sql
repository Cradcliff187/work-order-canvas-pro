-- Migration: Comprehensive Subcontractor RLS Policies
-- This migration implements complete subcontractor access control across all tables
-- based on organization membership and work order assignments

-- =====================================================
-- PHASE 1: CORE WORK ORDER MANAGEMENT - Missing Policies
-- =====================================================

-- Add missing SELECT policy for work_order_assignments
CREATE POLICY "Subcontractors can view their assigned work order assignments" 
ON public.work_order_assignments
FOR SELECT
TO authenticated
USING (
  auth_user_type() = 'subcontractor' AND (
    -- Individual assignments (backward compatibility)
    assigned_to = auth_profile_id()
    OR
    -- Company assignments (team access)
    work_order_id IN (SELECT work_order_id FROM public.auth_user_organization_assignments())
  )
);

-- =====================================================
-- PHASE 2: INVOICE MANAGEMENT - Missing Policies
-- =====================================================

-- Add missing INSERT policy for invoices
CREATE POLICY "Subcontractors can create invoices for their organization" 
ON public.invoices
FOR INSERT
TO authenticated
WITH CHECK (
  auth_user_type() = 'subcontractor' AND 
  auth_user_belongs_to_organization(subcontractor_organization_id) AND
  submitted_by = auth_profile_id()
);

-- Add missing UPDATE policy for invoices
CREATE POLICY "Subcontractors can update their company invoices" 
ON public.invoices
FOR UPDATE
TO authenticated
USING (
  auth_user_type() = 'subcontractor' AND 
  auth_user_belongs_to_organization(subcontractor_organization_id)
)
WITH CHECK (
  auth_user_type() = 'subcontractor' AND 
  auth_user_belongs_to_organization(subcontractor_organization_id)
);

-- Add ALL invoice_work_orders policies
CREATE POLICY "Subcontractors can view their company invoice work orders" 
ON public.invoice_work_orders
FOR SELECT
TO authenticated
USING (
  auth_user_type() = 'subcontractor' AND
  EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_work_orders.invoice_id
    AND auth_user_belongs_to_organization(i.subcontractor_organization_id)
  )
);

CREATE POLICY "Subcontractors can create invoice work orders for their company" 
ON public.invoice_work_orders
FOR INSERT
TO authenticated
WITH CHECK (
  auth_user_type() = 'subcontractor' AND
  EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_work_orders.invoice_id
    AND auth_user_belongs_to_organization(i.subcontractor_organization_id)
  )
);

CREATE POLICY "Subcontractors can update their company invoice work orders" 
ON public.invoice_work_orders
FOR UPDATE
TO authenticated
USING (
  auth_user_type() = 'subcontractor' AND
  EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_work_orders.invoice_id
    AND auth_user_belongs_to_organization(i.subcontractor_organization_id)
  )
)
WITH CHECK (
  auth_user_type() = 'subcontractor' AND
  EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_work_orders.invoice_id
    AND auth_user_belongs_to_organization(i.subcontractor_organization_id)
  )
);

CREATE POLICY "Subcontractors can delete their company invoice work orders" 
ON public.invoice_work_orders
FOR DELETE
TO authenticated
USING (
  auth_user_type() = 'subcontractor' AND
  EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_work_orders.invoice_id
    AND auth_user_belongs_to_organization(i.subcontractor_organization_id)
  )
);

-- =====================================================
-- PHASE 3: ORGANIZATION AND USER VISIBILITY
-- =====================================================

-- Add SELECT policy for organizations (their own + partners for assigned work)
CREATE POLICY "Subcontractors can view relevant organizations" 
ON public.organizations
FOR SELECT
TO authenticated
USING (
  auth_user_type() = 'subcontractor' AND (
    -- Their own subcontractor organization
    (organization_type = 'subcontractor' AND auth_user_belongs_to_organization(id))
    OR
    -- Partner organizations for work orders assigned to them
    (organization_type = 'partner' AND id IN (
      SELECT DISTINCT wo.organization_id 
      FROM work_orders wo
      WHERE wo.id IN (SELECT work_order_id FROM public.auth_user_organization_assignments())
    ))
  )
);

-- Add SELECT policy for profiles (relevant users only)
CREATE POLICY "Subcontractors can view relevant user profiles" 
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth_user_type() = 'subcontractor' AND (
    -- Users in their own organization (teammates)
    id IN (
      SELECT uo.user_id 
      FROM user_organizations uo
      WHERE auth_user_belongs_to_organization(uo.organization_id)
    )
    OR
    -- Users who created work orders assigned to them (partners)
    id IN (
      SELECT DISTINCT wo.created_by
      FROM work_orders wo
      WHERE wo.id IN (SELECT work_order_id FROM public.auth_user_organization_assignments())
    )
    OR
    -- Users assigned to the same work orders (other subcontractors on same job)
    id IN (
      SELECT DISTINCT woa.assigned_to
      FROM work_order_assignments woa
      WHERE woa.work_order_id IN (SELECT work_order_id FROM public.auth_user_organization_assignments())
    )
  )
);

-- Add SELECT policy for user_organizations (relevant relationships only)
CREATE POLICY "Subcontractors can view relevant user organization relationships" 
ON public.user_organizations
FOR SELECT
TO authenticated
USING (
  auth_user_type() = 'subcontractor' AND (
    -- Their own organization relationships
    auth_user_belongs_to_organization(organization_id)
    OR
    -- Relationships for users on their assigned work orders
    user_id IN (
      SELECT DISTINCT wo.created_by
      FROM work_orders wo
      WHERE wo.id IN (SELECT work_order_id FROM public.auth_user_organization_assignments())
    )
    OR
    user_id IN (
      SELECT DISTINCT woa.assigned_to
      FROM work_order_assignments woa
      WHERE woa.work_order_id IN (SELECT work_order_id FROM public.auth_user_organization_assignments())
    )
  )
);

-- Add SELECT policy for trades (reference data - all trades visible)
CREATE POLICY "Subcontractors can view all trades" 
ON public.trades
FOR SELECT
TO authenticated
USING (auth_user_type() = 'subcontractor');

-- =====================================================
-- PHASE 4: WORK PROGRESS TRACKING
-- =====================================================

-- Add SELECT policy for audit_logs (limited to their assigned work)
CREATE POLICY "Subcontractors can view audit logs for their assigned work" 
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
  auth_user_type() = 'subcontractor' AND (
    -- Audit logs for work orders assigned to them
    (table_name = 'work_orders' AND record_id IN (
      SELECT work_order_id FROM public.auth_user_organization_assignments()
    ))
    OR
    -- Audit logs for their own work order reports
    (table_name = 'work_order_reports' AND record_id IN (
      SELECT wor.id 
      FROM work_order_reports wor
      WHERE wor.work_order_id IN (SELECT work_order_id FROM public.auth_user_organization_assignments())
    ))
    OR
    -- Audit logs for work order assignments on their work
    (table_name = 'work_order_assignments' AND record_id IN (
      SELECT woa.id
      FROM work_order_assignments woa
      WHERE woa.work_order_id IN (SELECT work_order_id FROM public.auth_user_organization_assignments())
    ))
  )
);

-- =====================================================
-- PHASE 5: ORGANIZATION TYPE VALIDATION
-- =====================================================

-- Update auth_user_belongs_to_organization function to validate organization types
CREATE OR REPLACE FUNCTION public.auth_user_belongs_to_organization(p_organization_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  v_user_type user_type;
  v_org_type organization_type;
  v_belongs boolean := false;
BEGIN
  -- Get current user's type
  SELECT user_type INTO v_user_type
  FROM profiles
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  -- Get organization type
  SELECT organization_type INTO v_org_type
  FROM organizations
  WHERE id = p_organization_id
  LIMIT 1;
  
  -- Check if user belongs to organization
  SELECT EXISTS(
    SELECT 1 
    FROM user_organizations uo
    WHERE uo.user_id = auth_profile_id()
    AND uo.organization_id = p_organization_id
  ) INTO v_belongs;
  
  -- Return false if user doesn't belong to organization
  IF NOT v_belongs THEN
    RETURN false;
  END IF;
  
  -- Additional validation for subcontractors
  -- Subcontractors can only belong to subcontractor organizations
  IF v_user_type = 'subcontractor' AND v_org_type != 'subcontractor' THEN
    RETURN false;
  END IF;
  
  -- Additional validation for partners
  -- Partners can only belong to partner organizations  
  IF v_user_type = 'partner' AND v_org_type != 'partner' THEN
    RETURN false;
  END IF;
  
  -- Additional validation for employees
  -- Employees can only belong to internal organizations
  IF v_user_type = 'employee' AND v_org_type != 'internal' THEN
    RETURN false;
  END IF;
  
  RETURN v_belongs;
END;
$$;

-- Add table comments for documentation
COMMENT ON POLICY "Subcontractors can view their assigned work order assignments" ON public.work_order_assignments IS 
'Allows subcontractors to view assignments for work orders assigned to them individually or to their organization';

COMMENT ON POLICY "Subcontractors can view relevant organizations" ON public.organizations IS 
'Allows subcontractors to view their own organization and partner organizations for assigned work orders only';

COMMENT ON POLICY "Subcontractors can view relevant user profiles" ON public.profiles IS 
'Allows subcontractors to view profiles of teammates, partners who submitted work, and other assigned users on their work orders';

COMMENT ON POLICY "Subcontractors can view audit logs for their assigned work" ON public.audit_logs IS 
'Allows subcontractors to track progress on work orders assigned to them or their organization';