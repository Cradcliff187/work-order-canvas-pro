-- Critical Security Fix: Remove overly permissive RLS policies
-- These policies currently allow any authenticated user to read ALL data
-- which is a severe security vulnerability

-- Drop dangerous "read all" policies that expose all user data
DROP POLICY IF EXISTS "users_can_read_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "users_can_read_all_organizations" ON public.organizations;
DROP POLICY IF EXISTS "users_can_read_all_memberships" ON public.organization_members;

-- Note: Existing specific policies remain in place to ensure proper access:
-- - Users can still read their own profiles
-- - Users can still view organizations they belong to
-- - Admins retain full access via admin-specific policies
-- - Organization-scoped access is preserved