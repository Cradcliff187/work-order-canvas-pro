
-- Fix: Allow service role to create profiles via edge function
-- This migration updates the RLS policy to permit the create-admin-user edge function
-- to insert profiles when running with service role privileges

-- Step 1: Drop the existing policy that's blocking service role
DROP POLICY IF EXISTS "admin_can_insert_profiles" ON public.profiles;

-- Step 2: Create new policy that allows:
-- 1. Users to create their own profile (user_id = auth.uid())
-- 2. Admins to create any profile (auth_is_admin())
-- 3. Service role to create any profile (for edge functions)
CREATE POLICY "admin_can_insert_profiles"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() 
  OR auth_is_admin()
  OR current_setting('request.jwt.claim.role', true) = 'service_role'
);

-- Step 3: Also update the update policy for consistency
DROP POLICY IF EXISTS "admin_can_update_profiles" ON public.profiles;

CREATE POLICY "admin_can_update_profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() 
  OR auth_is_admin()
  OR current_setting('request.jwt.claim.role', true) = 'service_role'
)
WITH CHECK (
  user_id = auth.uid() 
  OR auth_is_admin()
  OR current_setting('request.jwt.claim.role', true) = 'service_role'
);

-- Step 4: Update view policy for consistency
DROP POLICY IF EXISTS "admin_can_view_profiles" ON public.profiles;

CREATE POLICY "admin_can_view_profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  OR auth_is_admin()
  OR current_setting('request.jwt.claim.role', true) = 'service_role'
);

-- Step 5: Update delete policy for consistency (service role should be able to clean up)
DROP POLICY IF EXISTS "admin_can_delete_profiles" ON public.profiles;

CREATE POLICY "admin_can_delete_profiles"
ON public.profiles FOR DELETE
TO authenticated
USING (
  auth_is_admin()
  OR current_setting('request.jwt.claim.role', true) = 'service_role'
);

-- Add comment explaining the fix
COMMENT ON POLICY "admin_can_insert_profiles" ON public.profiles IS 
'Allows users to create their own profile, admins to create any profile, and service role (edge functions) to create profiles';
