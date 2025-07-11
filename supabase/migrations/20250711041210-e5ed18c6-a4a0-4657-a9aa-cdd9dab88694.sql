-- Complete fix for infinite recursion in profiles table RLS policies
-- This migration eliminates ALL recursive function calls from profiles policies

-- Drop all existing problematic policies on profiles table
DROP POLICY IF EXISTS "Admins full profile access" ON public.profiles;
DROP POLICY IF EXISTS "Employees view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Partners view organization profiles" ON public.profiles;
DROP POLICY IF EXISTS "Subcontractors view limited profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can always read own profile via auth uid" ON public.profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create BOOTSTRAP policies using ONLY auth.uid() directly (no helper functions)
-- These prevent ALL recursion by never calling functions that query profiles

-- Bootstrap: Users can always read their own profile
CREATE POLICY "Bootstrap: Users read own profile by auth uid"
ON public.profiles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Bootstrap: Users can create their own profile
CREATE POLICY "Bootstrap: Users create own profile by auth uid"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Bootstrap: Users can update their own profile
CREATE POLICY "Bootstrap: Users update own profile by auth uid"
ON public.profiles FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Bootstrap: Admins can do everything (using direct subquery, no helper functions)
CREATE POLICY "Bootstrap: Admins full access via direct query"
ON public.profiles FOR ALL
TO authenticated
USING (
  user_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM public.profiles admin_check 
    WHERE admin_check.user_id = auth.uid() 
    AND admin_check.user_type = 'admin'
  )
)
WITH CHECK (
  user_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM public.profiles admin_check 
    WHERE admin_check.user_id = auth.uid() 
    AND admin_check.user_type = 'admin'
  )
);

-- Employees can view all profiles (using direct subquery, no helper functions)
CREATE POLICY "Employees view all profiles via direct query"
ON public.profiles FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles employee_check
    WHERE employee_check.user_id = auth.uid()
    AND employee_check.user_type = 'employee'
  )
);

-- Partners can view profiles in their organizations (using direct subquery, no helper functions)
CREATE POLICY "Partners view organization profiles via direct query"
ON public.profiles FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR (
    EXISTS (
      SELECT 1 FROM public.profiles partner_check
      WHERE partner_check.user_id = auth.uid()
      AND partner_check.user_type = 'partner'
    )
    AND id IN (
      SELECT p.id FROM public.profiles p
      JOIN public.user_organizations uo ON p.id = uo.user_id
      WHERE uo.organization_id IN (
        SELECT uo2.organization_id 
        FROM public.user_organizations uo2
        JOIN public.profiles current_user ON current_user.id = uo2.user_id
        WHERE current_user.user_id = auth.uid()
      )
      AND p.user_type != 'employee'
    )
  )
);

-- Subcontractors can view limited profiles (using direct subquery, no helper functions)
CREATE POLICY "Subcontractors view limited profiles via direct query"
ON public.profiles FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR (
    EXISTS (
      SELECT 1 FROM public.profiles subcontractor_check
      WHERE subcontractor_check.user_id = auth.uid()
      AND subcontractor_check.user_type = 'subcontractor'
    )
    AND id IN (
      SELECT DISTINCT p.id FROM public.profiles p
      JOIN public.user_organizations uo ON p.id = uo.user_id
      JOIN public.work_orders wo ON wo.organization_id = uo.organization_id
      WHERE wo.assigned_to = (
        SELECT id FROM public.profiles current_profile 
        WHERE current_profile.user_id = auth.uid()
      )
      AND p.user_type = 'partner'
    )
  )
);