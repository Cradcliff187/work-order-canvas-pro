-- PHASE 1A: EMERGENCY RLS POLICY UPDATES
-- Fix authentication by updating profile policies with fallback logic

-- Drop existing problematic profile policies
DROP POLICY IF EXISTS "users_own_profile_read" ON public.profiles;
DROP POLICY IF EXISTS "users_own_profile_create" ON public.profiles;
DROP POLICY IF EXISTS "users_own_profile_update" ON public.profiles;

-- Create emergency profile policies with session fallback
CREATE POLICY "emergency_profile_read_fallback" ON public.profiles
FOR SELECT 
USING (
  -- Primary: Check user_id matches auth.uid()
  user_id = auth.uid()
  OR
  -- Fallback: If auth.uid() is NULL, try JWT profile_id match
  (auth.uid() IS NULL AND id = COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'profile_id')::uuid,
    (SELECT id FROM profiles WHERE user_id = (auth.jwt() ->> 'sub')::uuid LIMIT 1)
  ))
);

CREATE POLICY "emergency_profile_create_fallback" ON public.profiles
FOR INSERT
WITH CHECK (
  -- Primary: Check user_id matches auth.uid()
  user_id = auth.uid()
  OR
  -- Fallback: If auth.uid() is NULL, allow creation with JWT sub
  (auth.uid() IS NULL AND user_id = (auth.jwt() ->> 'sub')::uuid)
);

CREATE POLICY "emergency_profile_update_fallback" ON public.profiles
FOR UPDATE
USING (
  -- Primary: Check user_id matches auth.uid()
  user_id = auth.uid()
  OR
  -- Fallback: If auth.uid() is NULL, try JWT profile_id match
  (auth.uid() IS NULL AND id = COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'profile_id')::uuid,
    (SELECT id FROM profiles WHERE user_id = (auth.jwt() ->> 'sub')::uuid LIMIT 1)
  ))
)
WITH CHECK (
  -- Primary: Check user_id matches auth.uid()
  user_id = auth.uid()
  OR
  -- Fallback: If auth.uid() is NULL, allow update with JWT sub
  (auth.uid() IS NULL AND user_id = (auth.jwt() ->> 'sub')::uuid)
);

-- Test the emergency fixes
SELECT 
  'Emergency auth recovery Phase 1A' as phase,
  auth.uid() as auth_uid,
  auth.jwt() ->> 'sub' as jwt_sub,
  auth.jwt() -> 'app_metadata' ->> 'profile_id' as jwt_profile_id,
  (SELECT COUNT(*) FROM profiles) as total_profiles,
  'RLS policies updated with fallback logic' as status;