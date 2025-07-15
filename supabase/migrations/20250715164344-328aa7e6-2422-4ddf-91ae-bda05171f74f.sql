-- Replace JWT-based RLS policies with function-based policies on profiles table
-- This uses the secure auth_is_admin() function instead of direct JWT access

-- Step 1: Drop the problematic JWT-based policies
DROP POLICY IF EXISTS "admin_can_insert_profiles_jwt" ON public.profiles;
DROP POLICY IF EXISTS "admin_can_update_profiles_jwt" ON public.profiles;
DROP POLICY IF EXISTS "admin_can_delete_profiles_jwt" ON public.profiles;
DROP POLICY IF EXISTS "admin_can_view_all_profiles_jwt" ON public.profiles;

-- Step 2: Create new function-based policies using auth_is_admin()

-- Allow users to create own profile OR admins to create any profile
CREATE POLICY "admin_can_insert_profiles"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() OR auth_is_admin()
);

-- Allow users to update own profile OR admins to update any profile
CREATE POLICY "admin_can_update_profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() OR auth_is_admin()
)
WITH CHECK (
  user_id = auth.uid() OR auth_is_admin()
);

-- Allow users to view own profile OR admins to view any profile
CREATE POLICY "admin_can_view_profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR auth_is_admin()
);

-- Allow only admins to delete profiles
CREATE POLICY "admin_can_delete_profiles"
ON public.profiles FOR DELETE
TO authenticated
USING (auth_is_admin());