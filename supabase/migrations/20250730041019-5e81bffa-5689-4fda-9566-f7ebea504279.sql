-- Fix CRITICAL security issue: Remove policy that references user_metadata
-- This policy is vulnerable and needs to be replaced

DROP POLICY IF EXISTS "emergency_admin_bypass_temp" ON public.profiles;

-- Replace with a safer approach using JWT sub comparison only
CREATE POLICY "emergency_admin_bypass_temp" ON public.profiles
FOR ALL
USING (
  -- Keep existing safe JWT logic as primary access
  user_id = auth.uid()
  OR
  id = (auth.jwt() -> 'app_metadata' ->> 'profile_id')::uuid
  OR
  user_id = (auth.jwt() ->> 'sub')::uuid
)
WITH CHECK (
  user_id = auth.uid()
  OR
  user_id = (auth.jwt() ->> 'sub')::uuid
);