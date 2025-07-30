-- Add RLS policies for organization_members table to complete Phase 1
CREATE POLICY "organization_members_admin_manage_policy" 
ON organization_members 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE users.id = auth.uid() 
    AND (users.raw_app_meta_data->>'user_type') = 'admin'
  )
) 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE users.id = auth.uid() 
    AND (users.raw_app_meta_data->>'user_type') = 'admin'
  )
);

CREATE POLICY "organization_members_select_policy" 
ON organization_members 
FOR SELECT 
USING (
  user_id = auth_profile_id() OR 
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE users.id = auth.uid() 
    AND (users.raw_app_meta_data->>'user_type') = 'admin'
  )
);