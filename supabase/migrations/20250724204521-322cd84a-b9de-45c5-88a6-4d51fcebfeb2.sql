-- Fix work order assignment email trigger
-- Drop the trigger first, then the function

DROP TRIGGER IF EXISTS send_assignment_email ON work_order_assignments;
DROP FUNCTION IF EXISTS trigger_work_order_assignment_email();

-- Update call_send_email_trigger to accept optional context data
CREATE OR REPLACE FUNCTION public.call_send_email_trigger(
  template_name text,
  record_id uuid,
  record_type text DEFAULT 'work_order',
  context_data jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  function_url text;
  payload jsonb;
  result text;
BEGIN
  -- Get the function URL
  function_url := 'https://inudoymofztrvxhrlrek.supabase.co/functions/v1/send-email';
  
  -- Build the payload with context data
  payload := jsonb_build_object(
    'template_name', template_name,
    'record_id', record_id,
    'record_type', record_type,
    'custom_data', context_data
  );
  
  -- Call the edge function (async, ignore response)
  BEGIN
    SELECT content INTO result
    FROM http_post(
      function_url,
      payload::text,
      'application/json',
      ARRAY[
        ('authorization', 'Bearer ' || current_setting('request.jwt.claims', true)::json->>'anon_key'),
        ('apikey', current_setting('request.jwt.claims', true)::json->>'anon_key')
      ]
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the main transaction
    RAISE WARNING 'Email trigger failed for %: %', template_name, SQLERRM;
  END;
END;
$function$;

-- Create the new trigger function for assignments
CREATE OR REPLACE FUNCTION public.trigger_work_order_assignment_email()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Call the email trigger with work order ID and assignment context
  PERFORM call_send_email_trigger(
    'work_order_assigned', 
    NEW.work_order_id, 
    'work_order_assignment',
    jsonb_build_object('assigned_to', NEW.assigned_to, 'assignment_id', NEW.id)
  );
  RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER send_assignment_email
  AFTER INSERT ON work_order_assignments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_work_order_assignment_email();