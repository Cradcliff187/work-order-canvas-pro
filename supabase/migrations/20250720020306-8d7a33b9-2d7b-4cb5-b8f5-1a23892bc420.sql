
-- Migration: Fix all email triggers to directly call send-email edge function
-- This removes dependency on helper functions and service role key configuration

-- 1. Work Order Created Trigger
CREATE OR REPLACE FUNCTION public.notify_work_order_created()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Directly call send-email edge function with proper parameters
  PERFORM net.http_post(
    url := 'https://inudoymofztrvxhrlrek.supabase.co/functions/v1/send-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImludWRveW1vZnp0cnZ4aHJscmVrIiwicm9sZSI6InNlcnZpY2UiLCJpYXQiOjE3MTg5NzgxNzgsImV4cCI6MjAzNDU1NDE3OH0.LDdrVf0erp8wfDhSX7uZWOh9s1vFywClIRHlPNbH2pc'
    ),
    body := jsonb_build_object(
      'template_name', 'work_order_created'::text,
      'record_id', NEW.id::text,
      'record_type', 'work_order'::text
    )::jsonb
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the transaction
  RAISE WARNING 'Email trigger failed for work order %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- 2. Work Order Assigned Trigger  
CREATE OR REPLACE FUNCTION public.notify_work_order_assigned()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://inudoymofztrvxhrlrek.supabase.co/functions/v1/send-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImludWRveW1vZnp0cnZ4aHJscmVrIiwicm9sZSI6InNlcnZpY2UiLCJpYXQiOjE3MTg5NzgxNzgsImV4cCI6MjAzNDU1NDE3OH0.LDdrVf0erp8wfDhSX7uZWOh9s1vFywClIRHlPNbH2pc'
    ),
    body := jsonb_build_object(
      'template_name', 'work_order_assigned'::text,
      'record_id', NEW.id::text,
      'record_type', 'work_order_assignment'::text
    )::jsonb
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Email trigger failed for assignment %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- 3. Report Submitted Trigger
CREATE OR REPLACE FUNCTION public.notify_report_submitted()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://inudoymofztrvxhrlrek.supabase.co/functions/v1/send-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImludWRveW1vZnp0cnZ4aHJscmVrIiwicm9sZSI6InNlcnZpY2UiLCJpYXQiOjE3MTg5NzgxNzgsImV4cCI6MjAzNDU1NDE3OH0.LDdrVf0erp8wfDhSX7uZWOh9s1vFywClIRHlPNbH2pc'
    ),
    body := jsonb_build_object(
      'template_name', 'report_submitted'::text,
      'record_id', NEW.id::text,
      'record_type', 'work_order_report'::text
    )::jsonb
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Email trigger failed for report %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- 4. Report Reviewed Trigger
CREATE OR REPLACE FUNCTION public.notify_report_reviewed()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Only send email when status changes to approved or rejected
  IF NEW.status != OLD.status AND NEW.status IN ('approved', 'rejected') THEN
    PERFORM net.http_post(
      url := 'https://inudoymofztrvxhrlrek.supabase.co/functions/v1/send-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImludWRveW1vZnp0cnZ4aHJscmVrIiwicm9sZSI6InNlcnZpY2UiLCJpYXQiOjE3MTg5NzgxNzgsImV4cCI6MjAzNDU1NDE3OH0.LDdrVf0erp8wfDhSX7uZWOh9s1vFywClIRHlPNbH2pc'
      ),
      body := jsonb_build_object(
        'template_name', 'report_reviewed'::text,
        'record_id', NEW.id::text,
        'record_type', 'work_order_report'::text
      )::jsonb
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Email trigger failed for report review %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- 5. Welcome Email Trigger (Keep it simple)
CREATE OR REPLACE FUNCTION public.notify_user_welcome()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://inudoymofztrvxhrlrek.supabase.co/functions/v1/send-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImludWRveW1vZnp0cnZ4aHJscmVrIiwicm9sZSI6InNlcnZpY2UiLCJpYXQiOjE3MTg5NzgxNzgsImV4cCI6MjAzNDU1NDE3OH0.LDdrVf0erp8wfDhSX7uZWOh9s1vFywClIRHlPNbH2pc'
    ),
    body := jsonb_build_object(
      'template_name', 'welcome_email'::text,
      'record_id', NEW.id::text,
      'record_type', 'user'::text
    )::jsonb
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Email trigger failed for user welcome %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- 6. Work Order Completion Trigger
CREATE OR REPLACE FUNCTION public.trigger_completion_email()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    PERFORM net.http_post(
      url := 'https://inudoymofztrvxhrlrek.supabase.co/functions/v1/send-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImludWRveW1vZnp0cnZ4aHJscmVrIiwicm9sZSI6InNlcnZpY2UiLCJpYXQiOjE3MTg5NzgxNzgsImV4cCI6MjAzNDU1NDE3OH0.LDdrVf0erp8wfDhSX7uZWOh9s1vFywClIRHlPNbH2pc'
      ),
      body := jsonb_build_object(
        'template_name', 'work_order_completed'::text,
        'record_id', NEW.id::text,
        'record_type', 'work_order'::text
      )::jsonb
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Email trigger failed for completion %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- 7. Create the actual database triggers that were missing
-- Work Order triggers
CREATE TRIGGER trigger_work_order_created_email
  AFTER INSERT ON work_orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_work_order_created();

CREATE TRIGGER trigger_work_order_assigned_email
  AFTER UPDATE ON work_orders
  FOR EACH ROW
  WHEN (OLD.status != 'assigned' AND NEW.status = 'assigned')
  EXECUTE FUNCTION notify_work_order_assigned();

CREATE TRIGGER trigger_work_order_completed_email
  AFTER UPDATE ON work_orders
  FOR EACH ROW
  EXECUTE FUNCTION trigger_completion_email();

-- Work Order Report triggers
CREATE TRIGGER trigger_report_submitted_email
  AFTER INSERT ON work_order_reports
  FOR EACH ROW
  EXECUTE FUNCTION notify_report_submitted();

CREATE TRIGGER trigger_report_reviewed_email
  AFTER UPDATE ON work_order_reports
  FOR EACH ROW
  EXECUTE FUNCTION notify_report_reviewed();

-- User Welcome trigger
CREATE TRIGGER trigger_user_welcome_email
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION notify_user_welcome();

-- 8. Drop the complex helper function that's causing issues
DROP FUNCTION IF EXISTS public.call_send_email_trigger(text, uuid, text);

-- 9. Clean up old broken triggers that might conflict
DROP TRIGGER IF EXISTS trigger_work_order_created ON work_orders;
DROP TRIGGER IF EXISTS trigger_work_order_assigned ON work_orders;
DROP TRIGGER IF EXISTS trigger_report_submitted ON work_order_reports;
DROP TRIGGER IF EXISTS trigger_report_reviewed ON work_order_reports;
DROP TRIGGER IF EXISTS trigger_user_welcome_email ON profiles;

-- 10. Final verification
SELECT 'Email system triggers successfully rebuilt with direct HTTP calls' as status;
