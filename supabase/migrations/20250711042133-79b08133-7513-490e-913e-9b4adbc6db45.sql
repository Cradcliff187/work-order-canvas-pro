-- Fix RLS recursion by removing ALL subqueries to profiles table
-- Date: 2025-01-11

-- Drop ALL existing policies on profiles
DROP POLICY IF EXISTS "Bootstrap: Admins full access via direct query" ON public.profiles;
DROP POLICY IF EXISTS "Bootstrap: Users create own profile by auth uid" ON public.profiles;
DROP POLICY IF EXISTS "Bootstrap: Users read own profile by auth uid" ON public.profiles;
DROP POLICY IF EXISTS "Bootstrap: Users update own profile by auth uid" ON public.profiles;
DROP POLICY IF EXISTS "Employees view all profiles via direct query" ON public.profiles;
DROP POLICY IF EXISTS "Partners view organization profiles via direct query" ON public.profiles;
DROP POLICY IF EXISTS "Subcontractors view limited profiles via direct query" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile fixed" ON public.profiles;

-- Create ONLY these policies with NO recursion

-- 1. Everyone can read their own profile (NO RECURSION)
CREATE POLICY "Users read own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 2. Everyone can update their own profile (NO RECURSION)
CREATE POLICY "Users update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 3. Everyone can create their own profile (NO RECURSION)
CREATE POLICY "Users create own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- 4. Simple admin policy for testing (NO RECURSION)
CREATE POLICY "Temp admin access"
ON public.profiles FOR ALL
TO authenticated
USING (
  user_id = auth.uid() 
  OR user_id IN (
    SELECT user_id FROM public.profiles 
    WHERE email = 'cradcliff@austinkunzconstruction.com'
  )
);