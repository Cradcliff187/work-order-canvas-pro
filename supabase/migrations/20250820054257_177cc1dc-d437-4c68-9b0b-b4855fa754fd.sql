-- Fix projects RLS policy to work with organization_members instead of raw_app_meta_data
DROP POLICY IF EXISTS "employees_admins_view_projects" ON projects;

-- Create new policy that allows internal organization members to view projects
CREATE POLICY "internal_members_can_view_projects" 
ON projects 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = auth_profile_id_safe()
    AND o.organization_type = 'internal'
    AND om.role IN ('admin', 'manager', 'employee')
  )
  OR 
  -- Allow access to projects assigned to user's organization
  organization_id IN (
    SELECT om.organization_id
    FROM organization_members om
    WHERE om.user_id = auth_profile_id_safe()
  )
);

-- Also add policies for project_assignments table
CREATE POLICY "internal_members_can_view_project_assignments" 
ON project_assignments 
FOR SELECT 
USING (
  -- Users can see assignments for projects they can view
  project_id IN (
    SELECT p.id FROM projects p
    WHERE EXISTS (
      SELECT 1 
      FROM organization_members om
      JOIN organizations o ON o.id = om.organization_id
      WHERE om.user_id = auth_profile_id_safe()
      AND o.organization_type = 'internal'
    )
  )
  OR 
  -- Users can see their own assignments
  assigned_to = auth_profile_id_safe()
);

-- Add policy for users to see their own assignments
CREATE POLICY "users_can_view_own_project_assignments" 
ON project_assignments 
FOR SELECT 
USING (assigned_to = auth_profile_id_safe());