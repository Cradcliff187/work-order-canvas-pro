
-- Create trigger function to send work order created email
CREATE OR REPLACE FUNCTION trigger_work_order_created_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Only send email for newly created work orders
  IF TG_OP = 'INSERT' THEN
    -- Call the edge function asynchronously
    PERFORM net.http_post(
      url := 'https://inudoymofztrvxhrlrek.supabase.co/functions/v1/email-work-order-created',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}'::jsonb,
      body := json_build_object('workOrderId', NEW.id)::jsonb
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger function to send work order assigned email
CREATE OR REPLACE FUNCTION trigger_work_order_assigned_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Send email when assigned_to changes from null to a user
  IF TG_OP = 'UPDATE' AND OLD.assigned_to IS NULL AND NEW.assigned_to IS NOT NULL THEN
    PERFORM net.http_post(
      url := 'https://inudoymofztrvxhrlrek.supabase.co/functions/v1/email-work-order-assigned',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}'::jsonb,
      body := json_build_object('workOrderId', NEW.id, 'assignedUserId', NEW.assigned_to)::jsonb
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger function to send report submitted email
CREATE OR REPLACE FUNCTION trigger_report_submitted_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Send email when new report is submitted
  IF TG_OP = 'INSERT' THEN
    PERFORM net.http_post(
      url := 'https://inudoymofztrvxhrlrek.supabase.co/functions/v1/email-report-submitted',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}'::jsonb,
      body := json_build_object('reportId', NEW.id)::jsonb
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger function to send work order completed email
CREATE OR REPLACE FUNCTION trigger_work_order_completed_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Send email when status changes to completed
  IF TG_OP = 'UPDATE' AND OLD.status != 'completed' AND NEW.status = 'completed' THEN
    PERFORM net.http_post(
      url := 'https://inudoymofztrvxhrlrek.supabase.co/functions/v1/email-work-order-completed',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}'::jsonb,
      body := json_build_object('workOrderId', NEW.id)::jsonb
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger function to send welcome email
CREATE OR REPLACE FUNCTION trigger_welcome_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Send welcome email when new profile is created
  IF TG_OP = 'INSERT' THEN
    PERFORM net.http_post(
      url := 'https://inudoymofztrvxhrlrek.supabase.co/functions/v1/email-welcome-user',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}'::jsonb,
      body := json_build_object('userId', NEW.id, 'temporaryPassword', 'Welcome123!')::jsonb
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS work_order_created_email_trigger ON work_orders;
CREATE TRIGGER work_order_created_email_trigger
  AFTER INSERT ON work_orders
  FOR EACH ROW
  EXECUTE FUNCTION trigger_work_order_created_email();

DROP TRIGGER IF EXISTS work_order_assigned_email_trigger ON work_orders;
CREATE TRIGGER work_order_assigned_email_trigger
  AFTER UPDATE ON work_orders
  FOR EACH ROW
  EXECUTE FUNCTION trigger_work_order_assigned_email();

DROP TRIGGER IF EXISTS report_submitted_email_trigger ON work_order_reports;
CREATE TRIGGER report_submitted_email_trigger
  AFTER INSERT ON work_order_reports
  FOR EACH ROW
  EXECUTE FUNCTION trigger_report_submitted_email();

DROP TRIGGER IF EXISTS work_order_completed_email_trigger ON work_orders;
CREATE TRIGGER work_order_completed_email_trigger
  AFTER UPDATE ON work_orders
  FOR EACH ROW
  EXECUTE FUNCTION trigger_work_order_completed_email();

DROP TRIGGER IF EXISTS welcome_email_trigger ON profiles;
CREATE TRIGGER welcome_email_trigger
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_welcome_email();
