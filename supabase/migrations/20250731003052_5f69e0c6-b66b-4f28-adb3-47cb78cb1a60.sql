-- Fix RLS policies for organization_members table
-- Drop existing policies first
DROP POLICY IF EXISTS "organization_members_admin_manage_policy" ON organization_members;
DROP POLICY IF EXISTS "organization_members_select_policy" ON organization_members;
DROP POLICY IF EXISTS "Users can view their own organization memberships" ON organization_members;

-- Create new correct policy for users to view their own organization memberships
CREATE POLICY "Users can view their own organization memberships"
ON organization_members FOR SELECT
TO authenticated
USING (
  user_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
);

-- Create policy for admins to manage all organization memberships
CREATE POLICY "Admins can manage all organization memberships"
ON organization_members FOR ALL
TO authenticated
USING (has_internal_role(ARRAY['admin'::organization_role]))
WITH CHECK (has_internal_role(ARRAY['admin'::organization_role]));