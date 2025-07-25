-- Fix the handle_new_user_bulletproof trigger to have proper permissions and security context
CREATE OR REPLACE FUNCTION public.handle_new_user_bulletproof()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Enhanced logging with clearer context
  RAISE LOG 'Starting profile creation for user: %', NEW.id;
  
  BEGIN
    -- Insert profile with data from metadata
    INSERT INTO public.profiles (
      id,
      user_id,
      email,
      first_name,
      last_name,
      user_type,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      NEW.id,
      COALESCE(NEW.email, ''),
      COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
      COALESCE(NEW.raw_app_meta_data->>'user_type', 'subcontractor')::user_type,
      true,
      NOW(),
      NOW()
    );
    
    RAISE LOG 'Profile created successfully for user: %', NEW.id;
    
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't fail the auth user creation
    RAISE LOG 'Profile creation failed for user %: % - %', NEW.id, SQLSTATE, SQLERRM;
    -- Re-raise the exception to ensure the transaction fails properly
    RAISE;
  END;
  
  RETURN NEW;
END;
$$;

-- Ensure the trigger exists and is properly configured
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_bulletproof();

-- Grant necessary permissions to the authenticator role
GRANT USAGE ON SCHEMA public TO authenticator;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticator;
GRANT SELECT, INSERT, UPDATE ON public.user_organizations TO authenticator;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticator;

-- Ensure the function has proper permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user_bulletproof() TO authenticator;
GRANT EXECUTE ON FUNCTION public.handle_new_user_bulletproof() TO supabase_auth_admin;