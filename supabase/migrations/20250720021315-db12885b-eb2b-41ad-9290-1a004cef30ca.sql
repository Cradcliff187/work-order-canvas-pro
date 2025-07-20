-- Migration: Fix all email triggers to use the unified send-email edge function
-- Run this BEFORE dropping call_send_email_trigger

-- 1. Fix Work Order Created
DROP FUNCTION IF EXISTS public.notify_work_order_created() CASCADE;
CREATE OR REPLACE FUNCTION public.notify_work_order_created()
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
      'template_name', 'work_order_created'::text,
      'record_id', NEW.id::text,
      'record_type', 'work_order'::text
    )::jsonb
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Email trigger failed for work order %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- 2. Fix User Welcome (it's calling wrong URL)
DROP FUNCTION IF EXISTS public.notify_user_welcome() CASCADE;
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

-- 3. Fix Report Submitted
DROP FUNCTION IF EXISTS public.notify_report_submitted() CASCADE;
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

-- 4. Fix Report Reviewed
DROP FUNCTION IF EXISTS public.notify_report_reviewed() CASCADE;
CREATE OR REPLACE FUNCTION public.notify_report_reviewed()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
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

-- 5. Create missing functions for assignments and completions
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

-- 6. Recreate the triggers with correct function names
DROP TRIGGER IF EXISTS trigger_work_order_created_email ON work_orders;
CREATE TRIGGER trigger_work_order_created_email
  AFTER INSERT ON work_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_work_order_created();

DROP TRIGGER IF EXISTS trigger_user_welcome_email ON profiles;
CREATE TRIGGER trigger_user_welcome_email
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_user_welcome();

DROP TRIGGER IF EXISTS trigger_report_submitted_email ON work_order_reports;
CREATE TRIGGER trigger_report_submitted_email
  AFTER INSERT ON work_order_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_report_submitted();

DROP TRIGGER IF EXISTS trigger_report_reviewed_email ON work_order_reports;
CREATE TRIGGER trigger_report_reviewed_email
  AFTER UPDATE OF status ON work_order_reports
  FOR EACH ROW
  WHEN (OLD.status != NEW.status AND NEW.status IN ('approved', 'rejected'))
  EXECUTE FUNCTION public.notify_report_reviewed();

-- Create assignment trigger on work_order_assignments table
DROP TRIGGER IF EXISTS trigger_assignment_email ON work_order_assignments;
CREATE TRIGGER trigger_assignment_email
  AFTER INSERT ON work_order_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_work_order_assigned();