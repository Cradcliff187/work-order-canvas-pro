-- Fix user creation by cleaning up conflicting triggers and fixing metadata reading
-- This resolves the race condition and metadata field mismatch issues

-- Step 1: Drop ALL existing auth user triggers to clean up conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_final ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_robust ON auth.users;

-- Step 2: Drop old trigger functions
DROP FUNCTION IF EXISTS public.handle_new_user_complete();
DROP FUNCTION IF EXISTS public.handle_new_user_robust();
DROP FUNCTION IF EXISTS public.notify_user_welcome();

-- Step 3: Create the corrected function that reads from app_metadata (where edge function stores data)
CREATE OR REPLACE FUNCTION public.handle_new_user_final()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  profile_id uuid;
BEGIN
  -- Step 1: Create the user profile reading from app_metadata (where create-admin-user stores user_type)
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
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(
      (NEW.raw_app_meta_data->>'user_type')::public.user_type, 
      'subcontractor'::public.user_type
    )
  )
  ON CONFLICT (user_id) DO NOTHING
  RETURNING id INTO profile_id;
  
  -- If profile already existed, get its ID
  IF profile_id IS NULL THEN
    SELECT id INTO profile_id FROM public.profiles WHERE user_id = NEW.id;
  END IF;
  
  -- Step 2: Send welcome email using the profile ID (not auth user ID)
  IF profile_id IS NOT NULL THEN
    BEGIN
      PERFORM public.call_send_email_trigger(
        'welcome_email',
        profile_id,
        'profile'
      );
    EXCEPTION WHEN OTHERS THEN
      -- Log warning but don't fail the user creation process
      RAISE WARNING 'Welcome email failed for user % (profile %): %', NEW.id, profile_id, SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the auth process
  RAISE WARNING 'Failed to complete user setup for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Step 4: Create the single trigger that fires after user creation
CREATE TRIGGER on_auth_user_created_final
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user_final();

-- Add helpful comment
COMMENT ON FUNCTION public.handle_new_user_final IS 'Creates user profile reading from app_metadata and sends welcome email using profile ID';