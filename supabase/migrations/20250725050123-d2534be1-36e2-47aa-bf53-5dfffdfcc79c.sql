-- EMERGENCY FIX: Add missing RLS policy for subcontractor work order attachments
-- This allows subcontractors to insert work_order_attachments records for their report files

CREATE POLICY "subcontractors_can_insert_work_order_attachments"
ON work_order_attachments
FOR INSERT
TO public
WITH CHECK (
  jwt_user_type() = 'subcontractor'
  AND uploaded_by_user_id = jwt_profile_id()
  AND (
    -- For work order attachments
    (work_order_id IS NOT NULL AND work_order_id IN (
      SELECT work_order_id 
      FROM auth_user_organization_assignments()
    ))
    OR
    -- For work order report attachments (when submitting reports)
    (work_order_report_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM work_order_reports wor
      WHERE wor.id = work_order_report_id
      AND wor.subcontractor_user_id = jwt_profile_id()
    ))
  )
);