-- EMERGENCY: Create temporary admin bypass while we fix the session context issue
-- This will allow the admin user to access their profile temporarily

-- Create a temporary admin access policy based on email in JWT
CREATE POLICY "emergency_admin_bypass_temp" ON public.profiles
FOR ALL
USING (
  -- Allow access for the specific admin user based on JWT email
  (auth.jwt() -> 'user_metadata' ->> 'email') = 'cradcliff@austinkunzconstruction.com'
  OR
  -- Keep existing JWT logic as fallback
  user_id = auth.uid()
  OR
  id = (auth.jwt() -> 'app_metadata' ->> 'profile_id')::uuid
  OR
  user_id = (auth.jwt() ->> 'sub')::uuid
)
WITH CHECK (
  -- Allow changes for the admin user
  (auth.jwt() -> 'user_metadata' ->> 'email') = 'cradcliff@austinkunzconstruction.com'
  OR
  user_id = auth.uid()
  OR
  user_id = (auth.jwt() ->> 'sub')::uuid
);

-- Test current JWT state to see what data is available
SELECT 
  'Emergency bypass for admin' as action,
  auth.uid() as auth_uid,
  auth.jwt() ->> 'sub' as jwt_sub,
  auth.jwt() -> 'app_metadata' ->> 'profile_id' as jwt_profile_id,
  auth.jwt() -> 'user_metadata' ->> 'email' as jwt_email,
  'Temporary admin bypass created' as status;