-- Implement Partner RLS Policies for Organization-Scoped Access
-- Partners can manage their own organization's data with strict isolation

-- =====================================================
-- WORK ORDERS: Core Partner Access
-- =====================================================

-- Partners can view work orders in their organization
CREATE POLICY "partners_can_select_own_org_work_orders"
ON public.work_orders FOR SELECT
TO authenticated
USING (
  jwt_user_type() = 'partner' AND
  auth_user_belongs_to_organization(organization_id)
);

-- Partners can create work orders for their organization
CREATE POLICY "partners_can_insert_own_org_work_orders"
ON public.work_orders FOR INSERT
TO authenticated
WITH CHECK (
  jwt_user_type() = 'partner' AND
  auth_user_belongs_to_organization(organization_id)
);

-- Partners can update work orders before assignment (limited updates)
CREATE POLICY "partners_can_update_unassigned_work_orders"
ON public.work_orders FOR UPDATE
TO authenticated
USING (
  jwt_user_type() = 'partner' AND
  auth_user_belongs_to_organization(organization_id) AND
  status IN ('received', 'draft')
)
WITH CHECK (
  jwt_user_type() = 'partner' AND
  auth_user_belongs_to_organization(organization_id) AND
  status IN ('received', 'draft')
);

-- Partners can delete only their own unassigned work orders
CREATE POLICY "partners_can_delete_own_unassigned_work_orders"
ON public.work_orders FOR DELETE
TO authenticated
USING (
  jwt_user_type() = 'partner' AND
  auth_user_belongs_to_organization(organization_id) AND
  status = 'received' AND
  created_by = jwt_profile_id()
);

-- =====================================================
-- WORK ORDER REPORTS: Read-Only for Partners
-- =====================================================

-- Partners can view reports for their organization's work orders
CREATE POLICY "partners_can_select_own_org_work_order_reports"
ON public.work_order_reports FOR SELECT
TO authenticated
USING (
  jwt_user_type() = 'partner' AND
  EXISTS (
    SELECT 1 FROM work_orders wo
    WHERE wo.id = work_order_reports.work_order_id
    AND auth_user_belongs_to_organization(wo.organization_id)
  )
);

-- =====================================================
-- WORK ORDER ATTACHMENTS: View and Upload
-- =====================================================

-- Partners can view attachments for their organization's work orders
CREATE POLICY "partners_can_select_own_org_work_order_attachments"
ON public.work_order_attachments FOR SELECT
TO authenticated
USING (
  jwt_user_type() = 'partner' AND
  (
    -- Attachments linked to their work orders
    (work_order_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM work_orders wo
      WHERE wo.id = work_order_attachments.work_order_id
      AND auth_user_belongs_to_organization(wo.organization_id)
    ))
    OR
    -- Attachments linked to reports of their work orders
    (work_order_report_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM work_order_reports wor
      JOIN work_orders wo ON wo.id = wor.work_order_id
      WHERE wor.id = work_order_attachments.work_order_report_id
      AND auth_user_belongs_to_organization(wo.organization_id)
    ))
  )
);

-- Partners can upload attachments to their own work orders
CREATE POLICY "partners_can_insert_own_work_order_attachments"
ON public.work_order_attachments FOR INSERT
TO authenticated
WITH CHECK (
  jwt_user_type() = 'partner' AND
  uploaded_by_user_id = jwt_profile_id() AND
  work_order_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM work_orders wo
    WHERE wo.id = work_order_attachments.work_order_id
    AND auth_user_belongs_to_organization(wo.organization_id)
  )
);

-- =====================================================
-- PARTNER LOCATIONS: Full Management (NO DELETE)
-- =====================================================

-- Partners can view their organization's locations
CREATE POLICY "partners_can_select_own_org_partner_locations"
ON public.partner_locations FOR SELECT
TO authenticated
USING (
  jwt_user_type() = 'partner' AND
  auth_user_belongs_to_organization(organization_id) AND
  EXISTS (
    SELECT 1 FROM organizations o
    WHERE o.id = partner_locations.organization_id
    AND o.organization_type = 'partner'
  )
);

-- Partners can create locations for their organization
CREATE POLICY "partners_can_insert_own_org_partner_locations"
ON public.partner_locations FOR INSERT
TO authenticated
WITH CHECK (
  jwt_user_type() = 'partner' AND
  auth_user_belongs_to_organization(organization_id) AND
  EXISTS (
    SELECT 1 FROM organizations o
    WHERE o.id = partner_locations.organization_id
    AND o.organization_type = 'partner'
  )
);

-- Partners can update their organization's locations
CREATE POLICY "partners_can_update_own_org_partner_locations"
ON public.partner_locations FOR UPDATE
TO authenticated
USING (
  jwt_user_type() = 'partner' AND
  auth_user_belongs_to_organization(organization_id) AND
  EXISTS (
    SELECT 1 FROM organizations o
    WHERE o.id = partner_locations.organization_id
    AND o.organization_type = 'partner'
  )
)
WITH CHECK (
  jwt_user_type() = 'partner' AND
  auth_user_belongs_to_organization(organization_id) AND
  EXISTS (
    SELECT 1 FROM organizations o
    WHERE o.id = partner_locations.organization_id
    AND o.organization_type = 'partner'
  )
);

-- NOTE: NO DELETE policy for partner_locations - partners cannot delete locations

-- =====================================================
-- USER AND ORGANIZATION VISIBILITY
-- =====================================================

-- Partners can view profiles in their organization + assigned subcontractors
CREATE POLICY "partners_can_select_relevant_profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  jwt_user_type() = 'partner' AND
  (
    -- Users in their organization
    id IN (
      SELECT uo.user_id FROM user_organizations uo
      WHERE auth_user_belongs_to_organization(uo.organization_id)
    )
    OR
    -- Subcontractors assigned to their work orders
    id IN (
      SELECT DISTINCT woa.assigned_to
      FROM work_order_assignments woa
      JOIN work_orders wo ON wo.id = woa.work_order_id
      WHERE auth_user_belongs_to_organization(wo.organization_id)
    )
  )
);

-- Partners can view user-organization relationships for their organization
CREATE POLICY "partners_can_select_own_org_user_organizations"
ON public.user_organizations FOR SELECT
TO authenticated
USING (
  jwt_user_type() = 'partner' AND
  auth_user_belongs_to_organization(organization_id)
);

-- Partners can view their own organization details only
CREATE POLICY "partners_can_select_own_organization"
ON public.organizations FOR SELECT
TO authenticated
USING (
  jwt_user_type() = 'partner' AND
  organization_type = 'partner' AND
  auth_user_belongs_to_organization(id)
);

-- Partners can view all trades (reference data)
CREATE POLICY "partners_can_select_all_trades"
ON public.trades FOR SELECT
TO authenticated
USING (jwt_user_type() = 'partner');

-- =====================================================
-- FINANCIAL VISIBILITY: Read-Only
-- =====================================================

-- Partners can view invoices related to their work orders only
CREATE POLICY "partners_can_select_own_org_invoices"
ON public.invoices FOR SELECT
TO authenticated
USING (
  jwt_user_type() = 'partner' AND
  EXISTS (
    SELECT 1 FROM invoice_work_orders iwo
    JOIN work_orders wo ON wo.id = iwo.work_order_id
    WHERE iwo.invoice_id = invoices.id
    AND auth_user_belongs_to_organization(wo.organization_id)
  )
);

-- Partners can view invoice work orders for their invoices
CREATE POLICY "partners_can_select_own_org_invoice_work_orders"
ON public.invoice_work_orders FOR SELECT
TO authenticated
USING (
  jwt_user_type() = 'partner' AND
  EXISTS (
    SELECT 1 FROM work_orders wo
    WHERE wo.id = invoice_work_orders.work_order_id
    AND auth_user_belongs_to_organization(wo.organization_id)
  )
);

-- Partners can view invoice attachments for their invoices
CREATE POLICY "partners_can_select_own_org_invoice_attachments"
ON public.invoice_attachments FOR SELECT
TO authenticated
USING (
  jwt_user_type() = 'partner' AND
  EXISTS (
    SELECT 1 FROM invoice_work_orders iwo
    JOIN work_orders wo ON wo.id = iwo.work_order_id
    WHERE iwo.invoice_id = invoice_attachments.invoice_id
    AND auth_user_belongs_to_organization(wo.organization_id)
  )
);

-- =====================================================
-- SYSTEM MONITORING: Limited Access
-- =====================================================

-- Partners can view audit logs for their organization's activities
CREATE POLICY "partners_can_select_own_org_audit_logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (
  jwt_user_type() = 'partner' AND
  (
    -- Logs for work orders in their organization
    (table_name = 'work_orders' AND EXISTS (
      SELECT 1 FROM work_orders wo
      WHERE wo.id = audit_logs.record_id
      AND auth_user_belongs_to_organization(wo.organization_id)
    ))
    OR
    -- Logs for their organization's data
    (table_name IN ('partner_locations', 'organizations') AND EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.id = audit_logs.record_id
      AND auth_user_belongs_to_organization(o.id)
    ))
  )
);

-- Add comments for clarity
COMMENT ON POLICY "partners_can_select_own_org_work_orders" ON public.work_orders IS 
'Allows partners to view work orders belonging to their organization only';

COMMENT ON POLICY "partners_can_insert_own_org_work_orders" ON public.work_orders IS 
'Allows partners to create new work orders for their organization';

COMMENT ON POLICY "partners_can_select_own_organization" ON public.organizations IS 
'Allows partners to view their own partner organization details only, ensures organization type isolation';