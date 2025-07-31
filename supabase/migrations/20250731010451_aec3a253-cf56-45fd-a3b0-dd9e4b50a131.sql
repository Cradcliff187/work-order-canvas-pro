-- NUCLEAR OPTION: Drop all RLS policies on these tables
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop ALL policies on profiles
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', r.policyname);
    END LOOP;
    
    -- Drop ALL policies on organization_members  
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'organization_members' AND schemaname = 'public')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON organization_members', r.policyname);
    END LOOP;
    
    -- Drop ALL policies on organizations
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'organizations' AND schemaname = 'public')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON organizations', r.policyname);
    END LOOP;
END $$;

-- Verify all policies are gone
SELECT tablename, COUNT(*) as policy_count 
FROM pg_policies 
WHERE tablename IN ('profiles', 'organization_members', 'organizations')
GROUP BY tablename;

-- Create the simplest possible policies that work

-- Profiles: Direct auth.uid() comparison only
CREATE POLICY "profiles_select_own"
ON profiles FOR SELECT
USING (auth.uid() = user_id);

-- Organization members: Allow authenticated users to read
CREATE POLICY "org_members_select_authenticated"
ON organization_members FOR SELECT
USING (auth.role() = 'authenticated');

-- Organizations: Allow authenticated users to read
CREATE POLICY "organizations_select_authenticated"
ON organizations FOR SELECT
USING (auth.role() = 'authenticated');