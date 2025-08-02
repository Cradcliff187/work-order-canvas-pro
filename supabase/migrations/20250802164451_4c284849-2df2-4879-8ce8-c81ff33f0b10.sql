-- Create function to handle new user creation and profile setup
CREATE OR REPLACE FUNCTION public.handle_new_user_bulletproof()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_first_name text;
  user_last_name text;
  user_org_id uuid;
  user_org_role text;
BEGIN
  -- Extract user metadata
  user_first_name := NEW.raw_user_meta_data ->> 'first_name';
  user_last_name := NEW.raw_user_meta_data ->> 'last_name';
  user_org_id := (NEW.raw_app_meta_data ->> 'organization_id')::uuid;
  user_org_role := NEW.raw_app_meta_data ->> 'organization_role';
  
  -- Create profile for new user
  INSERT INTO public.profiles (
    user_id, 
    email, 
    first_name, 
    last_name,
    is_active
  )
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(user_first_name, ''),
    COALESCE(user_last_name, ''),
    true
  );
  
  -- Create organization membership if organization data is provided
  IF user_org_id IS NOT NULL THEN
    INSERT INTO public.organization_members (
      user_id,
      organization_id,
      role
    )
    VALUES (
      (SELECT id FROM public.profiles WHERE user_id = NEW.id),
      user_org_id,
      COALESCE(user_org_role::organization_role, 'member'::organization_role)
    );
  END IF;
  
  RETURN NEW;
  
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't block user creation
  RAISE WARNING 'Profile creation failed for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Create trigger to automatically create profiles when auth users are created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_bulletproof();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user_bulletproof() TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.handle_new_user_bulletproof() TO authenticator;