
-- PHASE 1: NUCLEAR CLEANUP - Remove all conflicting user creation triggers and functions

-- Drop all existing user creation triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_robust ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_correct ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_robust_fixed ON auth.users;

-- Drop all existing user creation functions
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.handle_new_user_robust();
DROP FUNCTION IF EXISTS public.handle_new_user_correct();
DROP FUNCTION IF EXISTS public.handle_new_user_robust_fixed();

-- Clean up any test users that were created incorrectly (keep only the real admin)
DELETE FROM public.user_organizations 
WHERE user_id IN (
  SELECT id FROM public.profiles 
  WHERE email LIKE '%test%' 
  OR email LIKE '%@workorderpro.test'
  OR email = 'chris.l.radcliff@gmail.com'
);

DELETE FROM public.profiles 
WHERE email LIKE '%test%' 
OR email LIKE '%@workorderpro.test'
OR email = 'chris.l.radcliff@gmail.com';

-- PHASE 2: CREATE SINGLE, BULLETPROOF SOLUTION

-- Create one simple, working function that explicitly handles app_metadata
CREATE OR REPLACE FUNCTION public.handle_new_user_final()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_type_raw text;
  v_user_type public.user_type;
  v_first_name text;
  v_last_name text;
BEGIN
  -- Get the raw user_type from app_metadata (where create-admin-user edge function puts it)
  v_user_type_raw := NEW.raw_app_meta_data->>'user_type';
  
  -- Log what we received for debugging
  RAISE NOTICE 'Processing new user %. App metadata user_type: %. Full app_metadata: %', 
    NEW.id, v_user_type_raw, NEW.raw_app_meta_data;
  
  -- Explicitly validate and cast the user_type
  IF v_user_type_raw = 'admin' THEN
    v_user_type := 'admin'::public.user_type;
  ELSIF v_user_type_raw = 'partner' THEN
    v_user_type := 'partner'::public.user_type;
  ELSIF v_user_type_raw = 'subcontractor' THEN
    v_user_type := 'subcontractor'::public.user_type;
  ELSIF v_user_type_raw = 'employee' THEN
    v_user_type := 'employee'::public.user_type;
  ELSE
    -- Fallback to subcontractor only if no valid type found
    v_user_type := 'subcontractor'::public.user_type;
    RAISE NOTICE 'No valid user_type found in app_metadata, defaulting to subcontractor for user %', NEW.id;
  END IF;
  
  -- Get name fields from user_metadata
  v_first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', 'User');
  v_last_name := COALESCE(NEW.raw_user_meta_data->>'last_name', '');
  
  -- Insert the profile
  INSERT INTO public.profiles (
    user_id, 
    email, 
    first_name, 
    last_name,
    user_type
  )
  VALUES (
    NEW.id,
    NEW.email,
    v_first_name,
    v_last_name,
    v_user_type
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RAISE NOTICE 'Successfully created profile for user % with user_type %', NEW.id, v_user_type;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log the error but don't fail the auth process
  RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Create the single trigger
CREATE TRIGGER on_auth_user_created_final
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user_final();
