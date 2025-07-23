-- Fix user creation by restoring profile creation trigger alongside email notifications
-- This combines profile creation AND email sending in a single robust trigger

-- Drop the current trigger that only sends emails
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create a combined function that both creates profiles and sends welcome emails
CREATE OR REPLACE FUNCTION public.handle_new_user_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Step 1: Create the user profile with race condition handling
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
      (NEW.raw_user_meta_data->>'user_type')::public.user_type, 
      'subcontractor'::public.user_type
    )
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Step 2: Send welcome email (with error handling to not block user creation)
  BEGIN
    PERFORM public.call_send_email_trigger(
      'welcome_email',
      NEW.id,
      'profile'
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log warning but don't fail the user creation process
    RAISE WARNING 'Welcome email failed for user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the auth process
  RAISE WARNING 'Failed to complete user setup for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Create the trigger that fires after user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user_complete();

-- Add helpful comment
COMMENT ON FUNCTION public.handle_new_user_complete IS 'Creates user profile and sends welcome email when new auth user is created';