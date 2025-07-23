-- Fix RLS policies to allow admins to view all profiles for user management
-- Add admin access policy while keeping existing user access policies

-- Create policy for admins to view all profiles
CREATE POLICY "admins_can_view_all_profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.jwt_is_admin());

-- Create policy for admins to update all profiles  
CREATE POLICY "admins_can_update_all_profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.jwt_is_admin())
WITH CHECK (public.jwt_is_admin());

-- Create policy for admins to delete profiles
CREATE POLICY "admins_can_delete_profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (public.jwt_is_admin());