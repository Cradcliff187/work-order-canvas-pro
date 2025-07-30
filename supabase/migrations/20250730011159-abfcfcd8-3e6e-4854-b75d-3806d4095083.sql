-- PHASE 1A FIX: Remove infinite recursion from profile policies
-- The issue: Cannot query profiles table from within its own RLS policy

-- Drop the problematic recursive policies
DROP POLICY IF EXISTS "emergency_profile_read_fallback" ON public.profiles;
DROP POLICY IF EXISTS "emergency_profile_create_fallback" ON public.profiles;
DROP POLICY IF EXISTS "emergency_profile_update_fallback" ON public.profiles;

-- Create corrected policies using ONLY JWT data (no table queries)
CREATE POLICY "fixed_profile_read_jwt_only" ON public.profiles
FOR SELECT 
USING (
  -- Primary: Check user_id matches auth.uid()
  user_id = auth.uid()
  OR
  -- Fallback: Direct JWT profile_id match (no subqueries)
  id = (auth.jwt() -> 'app_metadata' ->> 'profile_id')::uuid
  OR
  -- Second fallback: JWT sub match
  user_id = (auth.jwt() ->> 'sub')::uuid
);

CREATE POLICY "fixed_profile_create_jwt_only" ON public.profiles
FOR INSERT
WITH CHECK (
  -- Primary: Check user_id matches auth.uid()
  user_id = auth.uid()
  OR
  -- Fallback: Allow creation with JWT sub
  user_id = (auth.jwt() ->> 'sub')::uuid
);

CREATE POLICY "fixed_profile_update_jwt_only" ON public.profiles
FOR UPDATE
USING (
  -- Primary: Check user_id matches auth.uid()
  user_id = auth.uid()
  OR
  -- Fallback: Direct JWT profile_id match
  id = (auth.jwt() -> 'app_metadata' ->> 'profile_id')::uuid
  OR
  -- Second fallback: JWT sub match
  user_id = (auth.jwt() ->> 'sub')::uuid
)
WITH CHECK (
  -- Primary: Check user_id matches auth.uid()
  user_id = auth.uid()
  OR
  -- Fallback: Allow update with JWT sub
  user_id = (auth.jwt() ->> 'sub')::uuid
);

-- Test the fixed policies
SELECT 
  'Fixed infinite recursion in Phase 1A' as phase,
  auth.uid() as auth_uid,
  auth.jwt() ->> 'sub' as jwt_sub,
  auth.jwt() -> 'app_metadata' ->> 'profile_id' as jwt_profile_id,
  'Removed table queries from RLS policies' as status;