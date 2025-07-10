-- Migration: Fix admin system by replacing hardcoded UUID with role-based access
-- Replace hardcoded admin UUID in RLS policies with proper role checks

-- Drop the hardcoded UUID policy on profiles table
DROP POLICY IF EXISTS "Known admin users can manage all profiles" ON public.profiles;

-- Create new role-based admin policy using is_admin() function
CREATE POLICY "Admins can manage all profiles" 
ON public.profiles 
FOR ALL 
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Add comment for clarity
COMMENT ON POLICY "Admins can manage all profiles" ON public.profiles IS 
'Allows users with admin role to manage all profiles using role-based access instead of hardcoded UUIDs';