-- SECURITY-FOCUSED USER CREATION FIX WITH CRITICAL CORRECTIONS
-- This migration fixes user creation by addressing parameter naming, ID usage, and table dependencies

-- Step 1: Safely configure service role key (check if table exists first)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'system_settings') THEN
    INSERT INTO public.system_settings (category, setting_key, setting_value, description, updated_by_user_id) 
    VALUES (
      'security', 
      'service_role_key', 
      to_jsonb(current_setting('app.settings.service_role_key', true)),
      'Service role key for internal API calls',
      (SELECT id FROM profiles WHERE user_type = 'admin' LIMIT 1)
    )
    ON CONFLICT (category, setting_key) DO UPDATE SET
      setting_value = EXCLUDED.setting_value,
      updated_at = now();
    
    RAISE NOTICE 'Service role key configured in system_settings';
  ELSE
    RAISE NOTICE 'system_settings table does not exist, skipping service role key configuration';
  END IF;
END $$;

-- Step 2: Update call_send_email_trigger with proper parameter names and authorization
CREATE OR REPLACE FUNCTION public.call_send_email_trigger(
  email_type text,
  record_id uuid,
  record_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://inudoymofztrvxhrlrek.supabase.co/functions/v1/send-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(
        current_setting('app.settings.service_role_key', true),
        'fallback_service_role_key'
      )
    ),
    body := jsonb_build_object(
      'template_name', email_type,    -- ✅ Fixed: snake_case
      'record_id', record_id,         -- ✅ Fixed: snake_case  
      'record_type', record_type      -- ✅ Fixed: snake_case
    )
  );
  
  RAISE NOTICE 'Email trigger called for template: %, record: %, type: %', email_type, record_id, record_type;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Email trigger failed for %: %', email_type, SQLERRM;
END;
$$;

-- Step 3: Update trigger_welcome_email to use 'user' record type with authorization  
CREATE OR REPLACE FUNCTION public.trigger_welcome_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://inudoymofztrvxhrlrek.supabase.co/functions/v1/send-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(
        current_setting('app.settings.service_role_key', true),
        'fallback_service_role_key'
      )
    ),
    body := jsonb_build_object(
      'template_name', 'welcome_email',
      'record_id', NEW.id,
      'record_type', 'user'           -- ✅ Fixed: use 'user' consistently
    )
  );
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Welcome email trigger failed for profile %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Step 4: Update handle_new_user_bulletproof to use profile_id correctly
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
          profile_id,     -- ✅ Fixed: Use profile_id, not NEW.id
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

-- Step 5: Clean up conflicting triggers and create the missing one
DROP TRIGGER IF EXISTS on_auth_user_created_bulletproof ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_final ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_robust ON auth.users;

-- Create the missing trigger that should exist
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user_bulletproof();

-- Step 6: Verification queries
SELECT 'Trigger exists:' as check_type, 
       COUNT(*) as count 
FROM information_schema.triggers 
WHERE event_object_schema = 'auth' 
  AND event_object_table = 'users' 
  AND trigger_name = 'on_auth_user_created';

SELECT 'Function exists:' as check_type,
       COUNT(*) as count
FROM pg_proc 
WHERE proname = 'call_send_email_trigger';

-- Add helpful comments
COMMENT ON FUNCTION public.call_send_email_trigger IS 'Sends email with proper snake_case parameters and authorization headers';
COMMENT ON FUNCTION public.handle_new_user_bulletproof IS 'Bulletproof user setup that uses profile_id for email triggers and never blocks auth user creation';
COMMENT ON TRIGGER on_auth_user_created ON auth.users IS 'Triggers profile creation and welcome email when new auth user is created';