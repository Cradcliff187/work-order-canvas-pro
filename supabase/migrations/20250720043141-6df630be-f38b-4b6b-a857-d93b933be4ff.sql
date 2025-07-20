
-- Drop existing trigger functions and triggers
DROP TRIGGER IF EXISTS trigger_work_order_created_email ON work_orders;
DROP TRIGGER IF EXISTS trigger_user_welcome_email ON profiles;
DROP TRIGGER IF EXISTS trigger_report_submitted_email ON work_order_reports;
DROP TRIGGER IF EXISTS trigger_report_reviewed_email ON work_order_reports;
DROP TRIGGER IF EXISTS trigger_assignment_email ON work_order_assignments;

DROP FUNCTION IF EXISTS public.notify_work_order_created() CASCADE;
DROP FUNCTION IF EXISTS public.notify_user_welcome() CASCADE;
DROP FUNCTION IF EXISTS public.notify_report_submitted() CASCADE;
DROP FUNCTION IF EXISTS public.notify_report_reviewed() CASCADE;
DROP FUNCTION IF EXISTS public.notify_work_order_assigned() CASCADE;

-- Create standardized trigger functions that call the send-email endpoint
CREATE OR REPLACE FUNCTION trigger_welcome_email()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://inudoymofztrvxhrlrek.supabase.co/functions/v1/send-email',
    body := jsonb_build_object(
      'template_name', 'welcome_email',
      'record_id', NEW.id::text,
      'record_type', 'profile'
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImludWRveW1vZnp0cnZ4aHJscmVrIiwicm9sZSI6InNlcnZpY2UiLCJpYXQiOjE3MTg5NzgxNzgsImV4cCI6MjAzNDU1NDE3OH0.LDdrVf0erp8wfDhSX7uZWOh9s1vFywClIRHlPNbH2pc'
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Welcome email trigger failed for profile %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION trigger_work_order_created_email()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://inudoymofztrvxhrlrek.supabase.co/functions/v1/send-email',
    body := jsonb_build_object(
      'template_name', 'work_order_created',
      'record_id', NEW.id::text,
      'record_type', 'work_order'
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImludWRveW1vZnp0cnZ4aHJscmVrIiwicm9sZSI6InNlcnZpY2UiLCJpYXQiOjE3MTg5NzgxNzgsImV4cCI6MjAzNDU1NDE3OH0.LDdrVf0erp8wfDhSX7uZWOh9s1vFywClIRHlPNbH2pc'
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Work order created email trigger failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION trigger_work_order_assignment_email()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://inudoymofztrvxhrlrek.supabase.co/functions/v1/send-email',
    body := jsonb_build_object(
      'template_name', 'work_order_assigned',
      'record_id', NEW.id::text,
      'record_type', 'work_order_assignment'
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImludWRveW1vZnp0cnZ4aHJscmVrIiwicm9sZSI6InNlcnZpY2UiLCJpYXQiOjE3MTg5NzgxNzgsImV4cCI6MjAzNDU1NDE3OH0.LDdrVf0erp8wfDhSX7uZWOh9s1vFywClIRHlPNbH2pc'
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Assignment email trigger failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION trigger_report_submitted_email()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://inudoymofztrvxhrlrek.supabase.co/functions/v1/send-email',
    body := jsonb_build_object(
      'template_name', 'report_submitted',
      'record_id', NEW.id::text,
      'record_type', 'work_order_report'
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImludWRveW1vZnp0cnZ4aHJscmVrIiwicm9sZSI6InNlcnZpY2UiLCJpYXQiOjE3MTg5NzgxNzgsImV4cCI6MjAzNDU1NDE3OH0.LDdrVf0erp8wfDhSX7uZWOh9s1vFywClIRHlPNbH2pc'
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Report submitted email trigger failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION trigger_report_reviewed_email()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status != NEW.status AND NEW.status IN ('approved', 'rejected') THEN
    PERFORM net.http_post(
      url := 'https://inudoymofztrvxhrlrek.supabase.co/functions/v1/send-email',
      body := jsonb_build_object(
        'template_name', 'report_reviewed',
        'record_id', NEW.id::text,
        'record_type', 'work_order_report'
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImludWRveW1vZnp0cnZ4aHJscmVrIiwicm9sZSI6InNlcnZpY2UiLCJpYXQiOjE3MTg5NzgxNzgsImV4cCI6MjAzNDU1NDE3OH0.LDdrVf0erp8wfDhSX7uZWOh9s1vFywClIRHlPNbH2pc'
      )
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Report reviewed email trigger failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION trigger_work_order_completed_email()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
    PERFORM net.http_post(
      url := 'https://inudoymofztrvxhrlrek.supabase.co/functions/v1/send-email',
      body := jsonb_build_object(
        'template_name', 'work_order_completed',
        'record_id', NEW.id::text,
        'record_type', 'work_order'
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImludWRveW1vZnp0cnZ4aHJscmVrIiwicm9sZSI6InNlcnZpY2UiLCJpYXQiOjE3MTg5NzgxNzgsImV4cCI6MjAzNDU1NDE3OH0.LDdrVf0erp8wfDhSX7uZWOh9s1vFywClIRHlPNbH2pc'
      )
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Work order completed email trigger failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the database triggers
CREATE TRIGGER send_welcome_email
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_welcome_email();

CREATE TRIGGER send_work_order_created
  AFTER INSERT ON work_orders
  FOR EACH ROW
  EXECUTE FUNCTION trigger_work_order_created_email();

CREATE TRIGGER send_assignment_email
  AFTER INSERT ON work_order_assignments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_work_order_assignment_email();

CREATE TRIGGER send_report_submitted
  AFTER INSERT ON work_order_reports
  FOR EACH ROW
  EXECUTE FUNCTION trigger_report_submitted_email();

CREATE TRIGGER send_report_reviewed
  AFTER UPDATE OF status ON work_order_reports
  FOR EACH ROW
  EXECUTE FUNCTION trigger_report_reviewed_email();

CREATE TRIGGER send_work_order_completed
  AFTER UPDATE OF status ON work_orders
  FOR EACH ROW
  EXECUTE FUNCTION trigger_work_order_completed_email();
