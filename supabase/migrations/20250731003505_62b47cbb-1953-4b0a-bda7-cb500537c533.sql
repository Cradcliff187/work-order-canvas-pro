-- Step 2: Create a function to get user's profile ID without triggering RLS
CREATE OR REPLACE FUNCTION auth.user_profile_id()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT id::text
  FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION auth.user_profile_id() TO authenticated;