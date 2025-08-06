-- Fix the welcome email bug by using correct record_type
CREATE OR REPLACE FUNCTION public.handle_new_user_bulletproof()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_first_name text;
  user_last_name text;
  user_org_id uuid;
  user_org_role text;
  profile_id uuid;
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
  )
  RETURNING id INTO profile_id;
  
  -- Create organization membership if organization data is provided
  IF user_org_id IS NOT NULL THEN
    INSERT INTO public.organization_members (
      user_id,
      organization_id,
      role
    )
    VALUES (
      profile_id,
      user_org_id,
      COALESCE(user_org_role::organization_role, 'member'::organization_role)
    );
  END IF;
  
  -- Queue auth confirmation email with correct record_type
  BEGIN
    INSERT INTO email_queue (
      template_name,
      record_id,
      record_type,
      context_data,
      status,
      created_at,
      retry_count
    ) VALUES (
      'auth_confirmation',  -- Use existing auth_confirmation template
      NEW.id,              -- Auth user ID
      'auth_user',         -- ✅ Changed from 'user' to 'auth_user' to fix lookup bug
      jsonb_build_object(
        'first_name', COALESCE(user_first_name, ''),
        'last_name', COALESCE(user_last_name, ''),
        'email', NEW.email
      ),
      'pending',
      NOW(),
      0
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't block user creation
    RAISE WARNING 'Email queue insertion failed for user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
  
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't block user creation
  RAISE WARNING 'Profile creation failed for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;