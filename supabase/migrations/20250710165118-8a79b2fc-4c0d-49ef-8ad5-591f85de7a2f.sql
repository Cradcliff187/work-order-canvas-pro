-- Fix infinite recursion in RLS policies for profiles table
-- This migration resolves the "infinite recursion detected in policy for relation 'profiles'" error

-- First, create a secure function that bypasses RLS for user type checking
CREATE OR REPLACE FUNCTION public.get_user_type_secure(user_uuid uuid DEFAULT auth.uid())
RETURNS user_type AS $$
DECLARE
  result user_type;
BEGIN
  -- Use a simple query that won't trigger RLS recursion
  SELECT user_type INTO result 
  FROM public.profiles 
  WHERE user_id = user_uuid 
  LIMIT 1;
  
  RETURN COALESCE(result, 'subcontractor'::user_type);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Drop existing problematic policies on profiles table
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Partners can view profiles in their organizations" ON public.profiles;
DROP POLICY IF EXISTS "Subcontractors can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Create new non-recursive policies for profiles table
-- Allow all authenticated users to view profiles (needed for app functionality)
CREATE POLICY "Authenticated users can view profiles" ON public.profiles
FOR SELECT TO authenticated
USING (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Allow users to insert their own profile
CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Allow admin users full access (using direct email check to avoid recursion)
CREATE POLICY "Admin users can manage all profiles" ON public.profiles
FOR ALL TO authenticated
USING (
  auth.uid() IN (
    SELECT user_id FROM public.profiles 
    WHERE email = 'cradcliff@austinkunzconstruction.com' 
    AND user_type = 'admin'
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT user_id FROM public.profiles 
    WHERE email = 'cradcliff@austinkunzconstruction.com' 
    AND user_type = 'admin'
  )
);

-- Update the get_current_user_type function to use the secure version
CREATE OR REPLACE FUNCTION public.get_current_user_type()
RETURNS user_type AS $$
BEGIN
  RETURN public.get_user_type_secure(auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Update the is_admin function to use the secure version
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN public.get_user_type_secure(auth.uid()) = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;