-- Add created_by_admin_id column to invoices table
ALTER TABLE invoices 
ADD COLUMN created_by_admin_id UUID REFERENCES profiles(id);

-- Update RLS policy to allow admins to create invoices for any subcontractor organization
DROP POLICY IF EXISTS "subcontractors_can_manage_own_invoices" ON invoices;

CREATE POLICY "subcontractors_can_manage_own_invoices" 
ON invoices 
FOR ALL
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
  -- Allow subcontractors to manage their own invoices
  subcontractor_organization_id IN (
    SELECT om.organization_id
    FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = auth_profile_id() 
    AND o.organization_type = 'subcontractor'
  )
  -- OR allow admins to create invoices for any subcontractor organization
  OR jwt_is_admin()
);