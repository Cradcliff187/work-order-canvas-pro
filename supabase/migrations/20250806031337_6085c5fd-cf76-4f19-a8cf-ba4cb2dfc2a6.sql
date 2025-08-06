-- Add subcontractor_organization_id column to work_order_reports table
ALTER TABLE work_order_reports 
ADD COLUMN subcontractor_organization_id uuid REFERENCES organizations(id);

-- Create index for better performance
CREATE INDEX idx_work_order_reports_subcontractor_organization_id 
ON work_order_reports(subcontractor_organization_id);

-- Update RLS policies to support organization-based access for subcontractors
CREATE POLICY "subcontractors_can_manage_org_assigned_reports" 
ON work_order_reports
FOR ALL
TO authenticated
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