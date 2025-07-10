-- Critical fix for admin access issue
-- This migration replaces the problematic recursive RLS policy with a secure approach

-- Drop the problematic admin policy that causes infinite recursion
DROP POLICY IF EXISTS "Admin users can manage all profiles" ON public.profiles;

-- Create a much simpler and more reliable admin policy
-- This approach avoids any recursion by using a direct auth.uid() check against known admin user IDs
CREATE POLICY "Known admin users can manage all profiles" ON public.profiles
FOR ALL TO authenticated
USING (
  auth.uid() = '2e2832d0-72aa-44df-b7a7-5e7b61a4bd5a'::uuid
)
WITH CHECK (
  auth.uid() = '2e2832d0-72aa-44df-b7a7-5e7b61a4bd5a'::uuid
);

-- Also ensure the admin user's profile is properly set up
INSERT INTO public.profiles (user_id, email, first_name, last_name, user_type, is_active)
VALUES (
  '2e2832d0-72aa-44df-b7a7-5e7b61a4bd5a'::uuid,
  'cradcliff@austinkunzconstruction.com',
  'Chris',
  'Radcliff',
  'admin'::user_type,
  true
)
ON CONFLICT (user_id) 
DO UPDATE SET 
  email = EXCLUDED.email,
  user_type = EXCLUDED.user_type,
  is_active = EXCLUDED.is_active;