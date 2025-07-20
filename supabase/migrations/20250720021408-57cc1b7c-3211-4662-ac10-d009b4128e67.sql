-- Now safe to drop since nothing uses it anymore
DROP FUNCTION IF EXISTS public.call_send_email_trigger(text, uuid, text);