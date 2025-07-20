
-- Fix the email trigger to use correct Edge Function URL
CREATE OR REPLACE FUNCTION public.call_send_email_trigger(
  template_name text,
  record_id uuid,
  record_type text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  request_id bigint;
BEGIN
  -- Make the HTTP request to the new unified send-email function
  request_id := net.http_post(
    url => 'https://inudoymofztrvxhrlrek.supabase.co/functions/v1/send-email',
    body => jsonb_build_object(
      'template_name', template_name,
      'record_id', record_id::text,
      'record_type', record_type
    ),
    headers => jsonb_build_object('Content-Type', 'application/json')
  );
  
  RAISE NOTICE 'Email request % created for template % and record %', request_id, template_name, record_id;
END;
$$;

-- Add comment
COMMENT ON FUNCTION public.call_send_email_trigger IS 'Triggers email send via unified Edge Function';
