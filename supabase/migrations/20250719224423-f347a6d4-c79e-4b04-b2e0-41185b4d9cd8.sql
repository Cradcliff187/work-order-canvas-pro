
-- Enhanced version of the helper function with service role key safety check
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
  function_url text;
  service_key text;
BEGIN
  -- Safety check: Ensure service role key is configured
  service_key := current_setting('app.settings.service_role_key', true);
  IF service_key IS NULL OR service_key = '' THEN
    RAISE WARNING 'Service role key not configured, skipping email trigger for % %', record_type, record_id;
    RETURN;
  END IF;
  
  -- Construct the edge function URL
  function_url := 'https://inudoymofztrvxhrlrek.supabase.co/functions/v1/send-email';
  
  -- Make async HTTP request to send-email function
  SELECT net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := jsonb_build_object(
      'template_name', template_name,
      'record_id', record_id,
      'record_type', record_type
    )
  ) INTO request_id;
  
  -- Log the trigger execution (non-blocking)
  INSERT INTO audit_logs (
    table_name,
    record_id,
    action,
    new_values,
    user_id
  ) VALUES (
    'email_triggers',
    record_id,
    'EMAIL_TRIGGERED',
    jsonb_build_object(
      'template', template_name,
      'record_type', record_type,
      'request_id', request_id
    ),
    NULL
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the main transaction
  RAISE WARNING 'Email trigger failed for % %: %', record_type, record_id, SQLERRM;
END;
$$;

-- Enable pg_net extension for HTTP requests from database functions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Trigger function for work order creation
CREATE OR REPLACE FUNCTION public.trigger_work_order_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only trigger for actual new work orders
  IF TG_OP = 'INSERT' THEN
    PERFORM public.call_send_email_trigger(
      'work_order_created',
      NEW.id,
      'work_order'
    );
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the main transaction
  RAISE WARNING 'Work order created trigger failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Trigger function for work order assignment
CREATE OR REPLACE FUNCTION public.trigger_work_order_assigned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only trigger when status changes to 'assigned'
  IF TG_OP = 'UPDATE' AND 
     OLD.status != 'assigned' AND 
     NEW.status = 'assigned' THEN
    
    PERFORM public.call_send_email_trigger(
      'work_order_assigned',
      NEW.id,
      'work_order'
    );
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the main transaction
  RAISE WARNING 'Work order assigned trigger failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Trigger function for report submission
CREATE OR REPLACE FUNCTION public.trigger_report_submitted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only trigger for actual new reports
  IF TG_OP = 'INSERT' THEN
    PERFORM public.call_send_email_trigger(
      'report_submitted',
      NEW.id,
      'work_order_report'
    );
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the main transaction
  RAISE WARNING 'Report submitted trigger failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Trigger function for report review
CREATE OR REPLACE FUNCTION public.trigger_report_reviewed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only trigger when status changes to approved or rejected
  IF TG_OP = 'UPDATE' AND 
     OLD.status = 'submitted' AND 
     NEW.status IN ('approved', 'rejected') THEN
    
    PERFORM public.call_send_email_trigger(
      'report_reviewed',
      NEW.id,
      'work_order_report'
    );
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the main transaction
  RAISE WARNING 'Report reviewed trigger failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Create the actual triggers (drop existing ones first to avoid conflicts)
DROP TRIGGER IF EXISTS trigger_work_order_created ON work_orders;
CREATE TRIGGER trigger_work_order_created
  AFTER INSERT ON work_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_work_order_created();

DROP TRIGGER IF EXISTS trigger_work_order_assigned ON work_orders;
CREATE TRIGGER trigger_work_order_assigned
  AFTER UPDATE ON work_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_work_order_assigned();

DROP TRIGGER IF EXISTS trigger_report_submitted ON work_order_reports;
CREATE TRIGGER trigger_report_submitted
  AFTER INSERT ON work_order_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_report_submitted();

DROP TRIGGER IF EXISTS trigger_report_reviewed ON work_order_reports;
CREATE TRIGGER trigger_report_reviewed
  AFTER UPDATE ON work_order_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_report_reviewed();
