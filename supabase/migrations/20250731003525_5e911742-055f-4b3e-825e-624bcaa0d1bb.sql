-- Step 2 (Fixed): Create a function in public schema instead of auth schema
CREATE OR REPLACE FUNCTION public.user_profile_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
  SELECT id
  FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.user_profile_id() TO authenticated;