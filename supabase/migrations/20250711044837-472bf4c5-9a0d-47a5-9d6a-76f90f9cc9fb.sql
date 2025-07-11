-- Add policy to allow all authenticated users to read basic profile information
-- This resolves 406 errors when admin dashboard tries to fetch user names for display
-- 
-- This is safe because:
-- 1. READ-ONLY access - users cannot modify profiles they don't own
-- 2. Business requirement - app needs to display user names throughout interface
-- 3. No recursion risk - uses simple 'true' condition without helper functions
-- 4. Maintains existing INSERT/UPDATE/DELETE restrictions

CREATE POLICY "Authenticated users can read basic profile info" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (true);