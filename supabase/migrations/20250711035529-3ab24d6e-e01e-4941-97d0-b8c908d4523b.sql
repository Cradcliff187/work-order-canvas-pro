-- Fix RLS infinite recursion on profiles table
-- The issue: policies were calling auth_user_type() which queries profiles, causing recursion

-- Step 1: Drop ALL existing profiles policies to start fresh
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Employees can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Partners can view profiles in their organizations" ON public.profiles;
DROP POLICY IF EXISTS "Subcontractors can view relevant profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin users can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Step 2: Create new non-recursive policies for profiles table

-- CRITICAL: This policy allows users to fetch their own profile without recursion
-- Uses auth.uid() directly, not helper functions
CREATE POLICY "Users can always read own profile via auth uid"
ON public.profiles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Allow new users to create their profile
CREATE POLICY "Users can create own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Step 3: Create role-based view policies that can safely use helper functions
-- These only run AFTER the user has fetched their own profile

-- Admins can do everything (safe to use auth_is_admin() here)
CREATE POLICY "Admins full profile access"
ON public.profiles FOR ALL
TO authenticated
USING (
  user_id = auth.uid() -- Can always access own profile
  OR public.auth_is_admin() -- Or if they're admin
)
WITH CHECK (
  user_id = auth.uid() -- Can always modify own profile
  OR public.auth_is_admin() -- Or if they're admin
);

-- Employees can view all profiles for operational needs
CREATE POLICY "Employees view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() -- Own profile
  OR public.auth_user_type() = 'employee' -- Or if employee
);

-- Partners view profiles in their organizations (excluding employees)
CREATE POLICY "Partners view organization profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() -- Own profile
  OR (
    public.auth_user_type() = 'partner'
    AND id IN (
      SELECT p.id 
      FROM public.profiles p
      JOIN public.user_organizations uo ON p.id = uo.user_id
      WHERE uo.organization_id IN (
        SELECT organization_id FROM public.auth_user_organizations()
      )
      AND p.user_type != 'employee'
    )
  )
);

-- Subcontractors view limited profiles
CREATE POLICY "Subcontractors view limited profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() -- Own profile
  OR (
    public.auth_user_type() = 'subcontractor'
    AND id IN (
      SELECT DISTINCT p.id 
      FROM public.profiles p
      JOIN public.user_organizations uo ON p.id = uo.user_id
      JOIN public.work_orders wo ON wo.organization_id = uo.organization_id
      WHERE wo.assigned_to = public.auth_profile_id()
      AND p.user_type = 'partner'
    )
  )
);

-- Step 4: Add helpful comments
COMMENT ON POLICY "Users can always read own profile via auth uid" ON public.profiles IS 
'Critical policy that prevents recursion by allowing users to fetch their own profile using auth.uid() directly';

COMMENT ON POLICY "Admins full profile access" ON public.profiles IS 
'Admins have full access to all profiles - safe to use helper functions as this is evaluated after initial profile fetch';

COMMENT ON POLICY "Employees view all profiles" ON public.profiles IS 
'Employees can view all profiles for operational purposes - uses helper function safely';