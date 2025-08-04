-- Drop the fragile existing policy
DROP POLICY IF EXISTS "Subcontractors manage attachments for assigned work" ON work_order_attachments;

-- Create comprehensive INSERT policy for subcontractors
CREATE POLICY "Subcontractors can insert work order attachments"
ON work_order_attachments
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND uploaded_by_user_id = jwt_profile_id_safe()
  AND (
    -- For work order attachments
    (work_order_id IS NOT NULL AND work_order_id IN (
      SELECT work_order_id 
      FROM auth_user_organization_assignments()
    ))
    OR
    -- For work order report attachments
    (work_order_report_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM work_order_reports wor
      WHERE wor.id = work_order_report_id
      AND wor.subcontractor_user_id = jwt_profile_id_safe()
    ))
  )
);

-- Create comprehensive SELECT policy for subcontractors
CREATE POLICY "Subcontractors can view work order attachments"
ON work_order_attachments
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND (
    -- For work order attachments
    (work_order_id IS NOT NULL AND work_order_id IN (
      SELECT work_order_id 
      FROM auth_user_organization_assignments()
    ))
    OR
    -- For work order report attachments
    (work_order_report_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM work_order_reports wor
      WHERE wor.id = work_order_report_id
      AND wor.subcontractor_user_id = jwt_profile_id_safe()
    ))
  )
);

-- Create UPDATE policy for subcontractors (own uploads only)
CREATE POLICY "Subcontractors can update own work order attachments"
ON work_order_attachments
FOR UPDATE
USING (
  auth.uid() IS NOT NULL
  AND uploaded_by_user_id = jwt_profile_id_safe()
  AND (
    -- For work order attachments
    (work_order_id IS NOT NULL AND work_order_id IN (
      SELECT work_order_id 
      FROM auth_user_organization_assignments()
    ))
    OR
    -- For work order report attachments
    (work_order_report_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM work_order_reports wor
      WHERE wor.id = work_order_report_id
      AND wor.subcontractor_user_id = jwt_profile_id_safe()
    ))
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND uploaded_by_user_id = jwt_profile_id_safe()
  AND (
    -- For work order attachments
    (work_order_id IS NOT NULL AND work_order_id IN (
      SELECT work_order_id 
      FROM auth_user_organization_assignments()
    ))
    OR
    -- For work order report attachments
    (work_order_report_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM work_order_reports wor
      WHERE wor.id = work_order_report_id
      AND wor.subcontractor_user_id = jwt_profile_id_safe()
    ))
  )
);

-- Create DELETE policy for subcontractors (own uploads only)
CREATE POLICY "Subcontractors can delete own work order attachments"
ON work_order_attachments
FOR DELETE
USING (
  auth.uid() IS NOT NULL
  AND uploaded_by_user_id = jwt_profile_id_safe()
  AND (
    -- For work order attachments
    (work_order_id IS NOT NULL AND work_order_id IN (
      SELECT work_order_id 
      FROM auth_user_organization_assignments()
    ))
    OR
    -- For work order report attachments
    (work_order_report_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM work_order_reports wor
      WHERE wor.id = work_order_report_id
      AND wor.subcontractor_user_id = jwt_profile_id_safe()
    ))
  )
);