-- Enable pg_net extension for HTTP calls from database
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create email notification functions that call edge functions
CREATE OR REPLACE FUNCTION public.notify_work_order_created()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    PERFORM net.http_post(
      url := 'https://inudoymofztrvxhrlrek.supabase.co/functions/v1/email-work-order-created',
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('work_order_id', NEW.id)
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the main operation
    RAISE WARNING 'Failed to send work order created email for %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.notify_report_submitted()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    PERFORM net.http_post(
      url := 'https://inudoymofztrvxhrlrek.supabase.co/functions/v1/email-report-submitted',
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('work_order_report_id', NEW.id)
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the main operation
    RAISE WARNING 'Failed to send report submitted email for %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.notify_report_reviewed()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    PERFORM net.http_post(
      url := 'https://inudoymofztrvxhrlrek.supabase.co/functions/v1/email-report-reviewed',
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'work_order_report_id', NEW.id,
        'status', NEW.status,
        'review_notes', NEW.review_notes
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the main operation
    RAISE WARNING 'Failed to send report reviewed email for %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.notify_user_welcome()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    PERFORM net.http_post(
      url := 'https://inudoymofztrvxhrlrek.supabase.co/functions/v1/email-welcome',
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'user_id', NEW.id,
        'email', NEW.email,
        'first_name', NEW.first_name,
        'last_name', NEW.last_name,
        'user_type', NEW.user_type
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the main operation
    RAISE WARNING 'Failed to send welcome email for user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create database triggers
CREATE TRIGGER trigger_work_order_created_email
  AFTER INSERT ON work_orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_work_order_created();

CREATE TRIGGER trigger_report_submitted_email
  AFTER INSERT ON work_order_reports
  FOR EACH ROW
  EXECUTE FUNCTION notify_report_submitted();

CREATE TRIGGER trigger_report_reviewed_email
  AFTER UPDATE OF status ON work_order_reports
  FOR EACH ROW
  WHEN (OLD.status != NEW.status AND NEW.status IN ('approved', 'rejected'))
  EXECUTE FUNCTION notify_report_reviewed();

CREATE TRIGGER trigger_user_welcome_email
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION notify_user_welcome();

-- Recreate the auto report status trigger (ensure it exists)
DROP TRIGGER IF EXISTS trigger_auto_report_status_enhanced ON work_order_reports;
CREATE TRIGGER trigger_auto_report_status_enhanced
  AFTER INSERT OR UPDATE ON work_order_reports
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_report_status_enhanced();

-- Insert welcome email template
INSERT INTO email_templates (template_name, subject, html_content, text_content, is_active)
VALUES (
  'welcome_email',
  'Welcome to WorkOrderPro - Your Account is Ready!',
  '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to WorkOrderPro</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="margin: 0; font-size: 28px;">Welcome to WorkOrderPro!</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your account has been successfully created</p>
    </div>
    
    <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #333; margin-top: 0;">Hello {{first_name}} {{last_name}},</h2>
        
        <p>Welcome to WorkOrderPro! Your {{user_type}} account has been created and is ready to use.</p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
            <h3 style="margin-top: 0; color: #667eea;">Account Details:</h3>
            <ul style="margin: 0; padding-left: 20px;">
                <li><strong>Email:</strong> {{email}}</li>
                <li><strong>Account Type:</strong> {{user_type}}</li>
                <li><strong>Name:</strong> {{first_name}} {{last_name}}</li>
            </ul>
        </div>
        
        <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1976d2;">Next Steps:</h3>
            <ol style="margin: 0; padding-left: 20px;">
                <li>Log in to your account using your email address</li>
                <li>Complete your profile information</li>
                <li>Explore the dashboard and available features</li>
                <li>Contact support if you need any assistance</li>
            </ol>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{site_url}}" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Access Your Account</a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="font-size: 14px; color: #666; margin-bottom: 0;">
            If you have any questions or need assistance, please contact our support team.
        </p>
        
        <p style="font-size: 12px; color: #999; margin-top: 20px;">
            This email was sent from WorkOrderPro. If you did not expect this email, please contact support.
        </p>
    </div>
</body>
</html>',
  'Welcome to WorkOrderPro!

Hello {{first_name}} {{last_name}},

Welcome to WorkOrderPro! Your {{user_type}} account has been created and is ready to use.

Account Details:
- Email: {{email}}
- Account Type: {{user_type}}
- Name: {{first_name}} {{last_name}}

Next Steps:
1. Log in to your account using your email address
2. Complete your profile information
3. Explore the dashboard and available features
4. Contact support if you need any assistance

Access your account at: {{site_url}}

If you have any questions or need assistance, please contact our support team.

This email was sent from WorkOrderPro. If you did not expect this email, please contact support.',
  true
) ON CONFLICT (template_name) DO UPDATE SET
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content,
  text_content = EXCLUDED.text_content,
  is_active = EXCLUDED.is_active,
  updated_at = now();