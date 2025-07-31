-- Step 3: Create new policies using the security definer function
-- Profile policy - direct auth.uid() comparison
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Organization members - use the function to avoid recursion
CREATE POLICY "Users can view their own organization memberships"
ON organization_members FOR SELECT
TO authenticated
USING (user_id = public.user_profile_id());

-- Organizations - join through the function
CREATE POLICY "Users can view organizations they belong to"
ON organizations FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = public.user_profile_id()
  )
);