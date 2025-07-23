-- SURGICAL FIX: Update trigger to use correct record_type for email function
-- This fixes the "Recipient email not found" error by using 'user' instead of 'profile'

-- Update the bulletproof trigger function to use correct record_type
CREATE OR REPLACE FUNCTION public.handle_new_user_bulletproof()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  profile_id uuid;
BEGIN
  -- Step 1: Create the user profile with maximum safety
  BEGIN
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
    ON CONFLICT (user_id) DO UPDATE SET
      email = EXCLUDED.email,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      user_type = EXCLUDED.user_type
    RETURNING id INTO profile_id;
    
    -- If we still don't have profile_id, get it
    IF profile_id IS NULL THEN
      SELECT id INTO profile_id FROM public.profiles WHERE user_id = NEW.id;
    END IF;
    
    RAISE NOTICE 'Profile created successfully for user % with profile_id %', NEW.id, profile_id;
    
  EXCEPTION WHEN OTHERS THEN
    -- Log error but continue - profile creation is essential
    RAISE WARNING 'Profile creation failed for user %: %', NEW.id, SQLERRM;
    RETURN NEW; -- Allow user creation to succeed even if profile fails
  END;
  
  -- Step 2: Attempt welcome email (completely optional - never block user creation)
  IF profile_id IS NOT NULL THEN
    BEGIN
      -- Only try email if the function exists and email system is working
      IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'call_send_email_trigger') THEN
        PERFORM public.call_send_email_trigger(
          'welcome_email',
          profile_id,
          'user'
        );
        RAISE NOTICE 'Welcome email triggered for profile %', profile_id;
      ELSE
        RAISE NOTICE 'Email function not available - skipping welcome email for profile %', profile_id;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Email failure should NEVER block user creation
      RAISE WARNING 'Welcome email failed for user % (profile %): % - User creation continues', NEW.id, profile_id, SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
  
EXCEPTION WHEN OTHERS THEN
  -- Ultimate safety net - log error but don't fail auth process
  RAISE WARNING 'Complete user setup failed for user %: % - Auth user created without profile', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;