-- Step 1: Drop ALL Existing Policies (Clean Slate)
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Drop all policies on profiles
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', r.policyname);
  END LOOP;
  
  -- Drop all policies on organization_members
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'organization_members' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON organization_members', r.policyname);
  END LOOP;
  
  -- Drop all policies on organizations
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'organizations' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON organizations', r.policyname);
  END LOOP;
END $$;

-- Step 2: Create function in public schema with safe name
DROP FUNCTION IF EXISTS public.user_profile_id();
DROP FUNCTION IF EXISTS public.get_current_user_profile_id();

CREATE OR REPLACE FUNCTION public.get_current_user_profile_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN (
    SELECT id
    FROM public.profiles
    WHERE user_id = auth.uid()
    LIMIT 1
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_current_user_profile_id() TO authenticated;

-- Step 3: Create Simple, Working Policies
-- Simple profile policy - direct comparison (no recursion)
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Organization members - use the function
CREATE POLICY "Users can view their organization memberships"
ON organization_members FOR SELECT
TO authenticated
USING (user_id = public.get_current_user_profile_id());

-- Organizations - use the function
CREATE POLICY "Users can view their organizations"
ON organizations FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = public.get_current_user_profile_id()
  )
);