-- Fix the call_send_email_trigger function to include proper authentication headers
CREATE OR REPLACE FUNCTION public.call_send_email_trigger(template_name text, record_id uuid, record_type text DEFAULT 'work_order'::text, context_data jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  function_url text;
  payload jsonb;
  http_request_id uuid;
  service_role_key text;
  anon_key text;
BEGIN
  -- Get the function URL from environment
  function_url := 'https://inudoymofztrvxhrlrek.supabase.co/functions/v1/send-email';
  
  -- Get authentication keys from environment
  service_role_key := current_setting('app.settings.service_role_key', true);
  anon_key := current_setting('app.settings.anon_key', true);
  
  -- Fallback to hardcoded anon key if not in settings
  IF anon_key IS NULL OR anon_key = '' THEN
    anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImludWRveW1vZnp0cnZ4aHJscmVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxNjI2NTksImV4cCI6MjA2NzczODY1OX0.Qm8B5GLXnXcZrz_3idT9UCUYxF_cPi1gtr5F3eMeNI4';
  END IF;
  
  -- Build the payload with context data
  payload := jsonb_build_object(
    'template_name', template_name,
    'record_id', record_id,
    'record_type', record_type,
    'custom_data', context_data
  );
  
  -- Log the attempt
  RAISE LOG 'Calling email trigger: template=%, record_id=%, record_type=%, context=%', 
    template_name, record_id, record_type, context_data;
  
  -- Call the edge function using net.http_post with proper authentication headers
  BEGIN
    SELECT net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(service_role_key, anon_key),
        'apikey', anon_key
      ),
      body := payload
    ) INTO http_request_id;
    
    RAISE LOG 'Email trigger called successfully: request_id=%', http_request_id;
    
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the main transaction
    RAISE WARNING 'Email trigger failed for template % with record %: %', 
      template_name, record_id, SQLERRM;
  END;
END;
$function$;