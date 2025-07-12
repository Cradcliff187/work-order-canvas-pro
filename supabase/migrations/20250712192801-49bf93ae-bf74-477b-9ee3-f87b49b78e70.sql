-- Migration: Add Subcontractor Company-Level Access
-- This migration enhances RLS policies to support both individual and company-level access for subcontractors
-- Backward compatible: All existing individual access patterns remain functional
-- New feature: Subcontractor organization members can see all company work

-- =====================================================
-- WORK ORDERS TABLE: Enhanced Subcontractor Access
-- =====================================================

-- Drop the existing individual-only policy
DROP POLICY IF EXISTS "Subcontractors can view assigned work orders" ON public.work_orders;

-- Create the unified individual + company policy
CREATE POLICY "Subcontractors can view assigned work orders" 
ON public.work_orders
FOR SELECT
TO authenticated
USING (
  auth_user_type() = 'subcontractor' AND (
    -- Individual assignments (backward compatibility)
    auth_user_assigned_to_work_order(id)
    OR
    -- Company assignments (new feature)  
    id IN (SELECT work_order_id FROM public.auth_user_organization_assignments())
  )
);

-- =====================================================
-- WORK ORDER REPORTS TABLE: Enhanced Subcontractor Access
-- =====================================================

-- Drop the existing individual-only policy
DROP POLICY IF EXISTS "Subcontractors can manage their own reports" ON public.work_order_reports;

-- Create the unified individual + company policy
CREATE POLICY "Subcontractors can manage their own reports" 
ON public.work_order_reports
FOR ALL
TO authenticated
USING (
  auth_user_type() = 'subcontractor' AND (
    -- Individual reports (backward compatibility)
    subcontractor_user_id = auth_profile_id()
    OR
    -- Company work order reports (new feature)
    work_order_id IN (SELECT work_order_id FROM public.auth_user_organization_assignments())
  )
)
WITH CHECK (
  auth_user_type() = 'subcontractor' AND (
    -- Individual reports (backward compatibility)
    subcontractor_user_id = auth_profile_id()
    OR
    -- Company work order reports (new feature)
    work_order_id IN (SELECT work_order_id FROM public.auth_user_organization_assignments())
  )
);

-- =====================================================
-- WORK ORDER ATTACHMENTS TABLE: Enhanced Subcontractor Access
-- =====================================================

-- Drop the existing individual-only policy
DROP POLICY IF EXISTS "Subcontractors can manage attachments for their work" ON public.work_order_attachments;

-- Create the unified individual + company policy
CREATE POLICY "Subcontractors can manage attachments for their work" 
ON public.work_order_attachments
FOR ALL
TO authenticated
USING (
  auth_user_type() = 'subcontractor' AND (
    -- Individual attachments (backward compatibility)
    uploaded_by_user_id = auth_profile_id()
    OR
    -- Individual work order assignments (backward compatibility)
    work_order_id IN (
      SELECT wo.id 
      FROM work_orders wo 
      WHERE auth_user_assigned_to_work_order(wo.id)
    )
    OR
    -- Individual report attachments (backward compatibility)
    work_order_report_id IN (
      SELECT wor.id 
      FROM work_order_reports wor 
      WHERE wor.subcontractor_user_id = auth_profile_id()
    )
    OR
    -- Company work order attachments (new feature)
    work_order_id IN (SELECT work_order_id FROM public.auth_user_organization_assignments())
    OR
    -- Company work order report attachments (new feature)
    work_order_report_id IN (
      SELECT wor.id 
      FROM work_order_reports wor 
      WHERE wor.work_order_id IN (SELECT work_order_id FROM public.auth_user_organization_assignments())
    )
  )
)
WITH CHECK (
  auth_user_type() = 'subcontractor' AND uploaded_by_user_id = auth_profile_id()
);