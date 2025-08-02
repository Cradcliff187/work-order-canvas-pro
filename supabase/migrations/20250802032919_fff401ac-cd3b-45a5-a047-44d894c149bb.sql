-- Emergency Fix 1/4: Enable RLS and create policies for organization_members table
-- This fixes the critical login issue where users cannot access their organization memberships

-- Enable RLS on organization_members table
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can read their own organization memberships
CREATE POLICY "users_can_read_own_memberships" 
ON organization_members 
FOR SELECT 
USING (user_id = auth_profile_id_safe());

-- Policy 2: Admins can manage all organization memberships
CREATE POLICY "admins_can_manage_all_memberships" 
ON organization_members 
FOR ALL 
USING (jwt_is_admin()) 
WITH CHECK (jwt_is_admin());

-- Policy 3: Allow inserting users into organizations (for user creation)
CREATE POLICY "allow_organization_member_creation" 
ON organization_members 
FOR INSERT 
WITH CHECK (true);