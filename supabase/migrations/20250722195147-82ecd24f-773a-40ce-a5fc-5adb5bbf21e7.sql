
-- Fix the RLS policy to allow service role to create profiles
-- This will unblock the create-admin-user edge function

DROP POLICY IF EXISTS "admin_can_insert_profiles" ON public.profiles;

CREATE POLICY "admin_can_insert_profiles"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() 
  OR auth_is_admin()
  OR (current_setting('role') = 'service_role')
);

-- Add helpful comment
COMMENT ON POLICY "admin_can_insert_profiles" ON public.profiles IS 
'Allows users to create their own profile, admins to create any profile, and service role (edge functions) to create profiles';
