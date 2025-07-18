
-- Create the notify_user_welcome function
CREATE OR REPLACE FUNCTION public.notify_user_welcome()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Call the email-welcome-user edge function via pg_net
  BEGIN
    PERFORM net.http_post(
      url := 'https://inudoymofztrvxhrlrek.supabase.co/functions/v1/email-welcome-user',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'userId', NEW.id::text,
        'email', NEW.email,
        'firstName', NEW.first_name,
        'lastName', NEW.last_name,
        'userType', NEW.user_type
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the profile creation
    RAISE WARNING 'Failed to send welcome email for user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

-- Create the trigger for welcome emails
DROP TRIGGER IF EXISTS trigger_user_welcome_email ON public.profiles;
CREATE TRIGGER trigger_user_welcome_email
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_user_welcome();

-- Verify all email notification functions exist
DO $$
DECLARE
  function_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO function_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND p.proname IN (
    'notify_work_order_created',
    'notify_report_submitted', 
    'notify_report_reviewed',
    'notify_user_welcome'
  );
  
  IF function_count = 4 THEN
    RAISE NOTICE 'All 4 email notification functions are present and configured';
  ELSE
    RAISE WARNING 'Expected 4 email notification functions, found %', function_count;
  END IF;
END;
$$;
