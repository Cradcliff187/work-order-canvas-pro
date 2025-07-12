-- Migration: Enhanced Invoice Company-Level Access
-- This migration updates invoice RLS policies to provide consistent company-level access
-- for subcontractors while maintaining financial privacy between companies

-- =====================================================
-- INVOICES TABLE: Enhanced Company-Level Access
-- =====================================================

-- Drop existing inconsistent policies
DROP POLICY IF EXISTS "Subcontractors can view their invoices" ON public.invoices;
DROP POLICY IF EXISTS "Subcontractors can delete their draft invoices" ON public.invoices;

-- Create unified company-level policies
CREATE POLICY "Subcontractors can view their company invoices" 
ON public.invoices FOR SELECT TO authenticated
USING (
  auth_user_type() = 'subcontractor' AND 
  auth_user_belongs_to_organization(subcontractor_organization_id)
);

CREATE POLICY "Subcontractors can delete their company draft invoices"
ON public.invoices FOR DELETE TO authenticated  
USING (
  auth_user_type() = 'subcontractor' AND 
  status = 'draft' AND
  auth_user_belongs_to_organization(subcontractor_organization_id)
);