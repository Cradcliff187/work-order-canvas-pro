-- Update notify_user_welcome function to include Authorization header
CREATE OR REPLACE FUNCTION public.notify_user_welcome() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $function$
BEGIN
  PERFORM net.http_post(
    url := 'https://inudoymofztrvxhrlrek.supabase.co/functions/v1/email-welcome',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object(
      'user_id', NEW.id,
      'email', NEW.email,
      'first_name', NEW.first_name,
      'last_name', NEW.last_name
    )
  );
  RETURN NEW;
END;
$function$