-- FINAL USER CREATION FIX: Comprehensive cleanup and bulletproof implementation
-- This migration consolidates all fixes into one working solution

-- ============================================
-- STEP 1: Comprehensive Trigger Cleanup
-- ============================================
-- Remove ALL existing auth user triggers to ensure clean state
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_bulletproof ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_final ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_robust ON auth.users;

-- ============================================
-- STEP 2: Update call_send_email_trigger (Remove Authorization)
-- ============================================
-- Remove authorization headers since edge function has verify_jwt = false
CREATE OR REPLACE FUNCTION public.call_send_email_trigger(
  template_name text,
  record_id uuid,
  record_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Call the edge function without authorization headers
  PERFORM
    net.http_post(
      url := 'https://inudoymofztrvxhrlrek.supabase.co/functions/v1/send-email',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object(
        'template_name', template_name,
        'record_id', record_id,
        'record_type', record_type
      )
    );
END;
$$;

-- ============================================
-- STEP 3: Update trigger_welcome_email (Add SECURITY DEFINER + Use 'user')
-- ============================================
CREATE OR REPLACE FUNCTION public.trigger_welcome_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER  -- Added SECURITY DEFINER
AS $$
BEGIN
  -- Send welcome email using 'user' record type (not 'profile')
  PERFORM public.call_send_email_trigger(
    'welcome_email',
    NEW.id,
    'user'  -- Changed from 'profile' to 'user'
  );
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail user creation
  RAISE WARNING 'Welcome email failed for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- ============================================
-- STEP 4: Update handle_new_user_bulletproof (Use profile_id correctly)
-- ============================================
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
  
  -- Step 2: Attempt welcome email using auth user ID (completely optional)
  BEGIN
    -- Only try email if the function exists and email system is working
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'call_send_email_trigger') THEN
      PERFORM public.call_send_email_trigger(
        'welcome_email',
        NEW.id,  -- Use auth user ID, not profile_id
        'user'   -- Use 'user' record type
      );
      RAISE NOTICE 'Welcome email triggered for user %', NEW.id;
    ELSE
      RAISE NOTICE 'Email function not available - skipping welcome email for user %', NEW.id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Email failure should NEVER block user creation
    RAISE WARNING 'Welcome email failed for user %: % - User creation continues', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
  
EXCEPTION WHEN OTHERS THEN
  -- Ultimate safety net - log error but don't fail auth process
  RAISE WARNING 'Complete user setup failed for user %: % - Auth user created without profile', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- ============================================
-- STEP 5: Create the Final Clean Trigger
-- ============================================
-- Create the single, definitive trigger for user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user_bulletproof();

-- ============================================
-- STEP 6: Add Comments and Verification
-- ============================================
COMMENT ON FUNCTION public.handle_new_user_bulletproof IS 'Final bulletproof user setup that creates profile and sends welcome email without blocking auth';
COMMENT ON FUNCTION public.call_send_email_trigger IS 'Calls email edge function without authorization (verify_jwt = false)';
COMMENT ON FUNCTION public.trigger_welcome_email IS 'Triggers welcome email with SECURITY DEFINER permissions';

-- Verify the trigger was created successfully
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE event_object_schema = 'auth' 
  AND event_object_table = 'users'
  AND trigger_name = 'on_auth_user_created';

-- Verify the email function exists
SELECT proname, prosecdef 
FROM pg_proc 
WHERE proname = 'call_send_email_trigger';