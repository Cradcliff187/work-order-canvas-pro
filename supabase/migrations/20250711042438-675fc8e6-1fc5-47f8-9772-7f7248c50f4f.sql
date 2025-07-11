-- FINAL FIX: Remove ALL recursive policies from profiles table
-- Date: 2025-01-11 - DEFINITIVE RECURSION RESOLUTION

-- Drop the problematic "Temp admin access" policy that still contains subquery to profiles
DROP POLICY IF EXISTS "Temp admin access" ON public.profiles;

-- Note: Only the 3 non-recursive policies remain:
-- 1. "Users read own profile" - uses only auth.uid()
-- 2. "Users update own profile" - uses only auth.uid() 
-- 3. "Users create own profile" - uses only auth.uid()

-- No admin access via RLS - will be handled in application layer after profile fetch