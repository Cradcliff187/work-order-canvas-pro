
-- Migration: Backup Email System Before Removal
-- Date: 2025-01-19
-- Purpose: Document all email-related database objects before removal for recovery purposes

-- =====================================================
-- BACKUP DOCUMENTATION - EMAIL SYSTEM COMPONENTS
-- =====================================================

-- This migration serves as a complete backup/documentation of the email system
-- before removal. It contains ALL the information needed to restore the system.

-- =====================================================
-- EMAIL TRIGGERS TO BE REMOVED
-- =====================================================

-- 1. TRIGGER: trigger_user_welcome_email ON profiles
--    Purpose: Sends welcome email when new user profile is created
--    Function: notify_user_welcome()

-- 2. TRIGGER: trigger_report_reviewed_email ON work_order_reports  
--    Purpose: Sends email when report status changes to approved/rejected
--    Function: notify_report_reviewed()

-- 3. TRIGGER: trigger_report_submitted_email ON work_order_reports
--    Purpose: Sends email when new report is submitted
--    Function: notify_report_submitted()

-- 4. TRIGGER: trigger_work_order_created_email ON work_orders
--    Purpose: Sends email when new work order is created
--    Function: notify_work_order_created()

-- =====================================================
-- EMAIL NOTIFICATION FUNCTIONS TO BE REMOVED
-- =====================================================

-- FUNCTION: notify_user_welcome()
-- Purpose: HTTP POST to email-welcome-user edge function
-- Current definition saved for recovery:
/*
CREATE OR REPLACE FUNCTION public.notify_user_welcome()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $function$
BEGIN
  PERFORM net.http_post(
    url := 'https://inudoymofztrvxhrlrek.supabase.co/functions/v1/email-welcome-user',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object(
      'userId', NEW.id,
      'temporaryPassword', CASE WHEN NEW.user_type != 'admin' THEN 'TempPass123!' ELSE NULL END
    )
  );
  RETURN NEW;
END;
$function$
*/

-- FUNCTION: notify_report_reviewed()
-- Purpose: HTTP POST to email-report-reviewed edge function
-- Current definition saved for recovery:
/*
CREATE OR REPLACE FUNCTION public.notify_report_reviewed()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $function$
BEGIN
  IF NEW.status != OLD.status AND NEW.status IN ('approved', 'rejected') THEN
    PERFORM net.http_post(
      url := 'https://inudoymofztrvxhrlrek.supabase.co/functions/v1/email-report-reviewed',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'reportId', NEW.id,
        'status', NEW.status,
        'reviewNotes', NEW.review_notes
      )
    );
  END IF;
  RETURN NEW;
END;
$function$
*/

-- FUNCTION: notify_report_submitted()
-- Purpose: HTTP POST to email-report-submitted edge function
-- Current definition saved for recovery:
/*
CREATE OR REPLACE FUNCTION public.notify_report_submitted()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $function$
BEGIN
  PERFORM net.http_post(
    url := 'https://inudoymofztrvxhrlrek.supabase.co/functions/v1/email-report-submitted',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object(
      'reportId', NEW.id
    )
  );
  RETURN NEW;
END;
$function$
*/

-- FUNCTION: notify_work_order_created()
-- Purpose: HTTP POST to email-work-order-created edge function
-- Current definition saved for recovery:
/*
CREATE OR REPLACE FUNCTION public.notify_work_order_created()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $function$
BEGIN
  PERFORM net.http_post(
    url := 'https://inudoymofztrvxhrlrek.supabase.co/functions/v1/email-work-order-created',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object(
      'workOrderId', NEW.id
    )
  );
  RETURN NEW;
END;
$function$
*/

-- FUNCTION: trigger_completion_email()
-- Purpose: HTTP POST to email-work-order-completed edge function
-- Current definition saved for recovery:
/*
CREATE OR REPLACE FUNCTION public.trigger_completion_email()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $function$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    PERFORM net.http_post(
      url := 'https://inudoymofztrvxhrlrek.supabase.co/functions/v1/email-work-order-completed',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'workOrderId', NEW.id
      )
    );
  END IF;
  RETURN NEW;
END;
$function$
*/

-- =====================================================
-- EMAIL TEMPLATES PRESERVED (NOT REMOVED)
-- =====================================================
-- The following email templates will remain in the database:
-- 1. work_order_received
-- 2. work_order_assigned  
-- 3. report_submitted
-- 4. work_order_completed
-- 5. welcome_email
-- 6. report_reviewed
-- 7. invoice_submitted

-- =====================================================
-- EDGE FUNCTIONS PRESERVED (NOT REMOVED)
-- =====================================================
-- The following edge functions will remain deployed:
-- 1. email-welcome-user
-- 2. email-report-reviewed
-- 3. email-report-submitted
-- 4. email-work-order-created
-- 5. email-work-order-assigned
-- 6. email-work-order-completed

-- =====================================================
-- RECOVERY INSTRUCTIONS
-- =====================================================
-- To restore the email system:
-- 1. Recreate the functions using the definitions above
-- 2. Recreate the triggers:
--    - CREATE TRIGGER trigger_user_welcome_email AFTER INSERT ON profiles FOR EACH ROW EXECUTE FUNCTION notify_user_welcome();
--    - CREATE TRIGGER trigger_report_reviewed_email AFTER UPDATE ON work_order_reports FOR EACH ROW EXECUTE FUNCTION notify_report_reviewed();
--    - CREATE TRIGGER trigger_report_submitted_email AFTER INSERT ON work_order_reports FOR EACH ROW EXECUTE FUNCTION notify_report_submitted();
--    - CREATE TRIGGER trigger_work_order_created_email AFTER INSERT ON work_orders FOR EACH ROW EXECUTE FUNCTION notify_work_order_created();
-- 3. Ensure edge functions are deployed and functional
-- 4. Test email functionality

-- =====================================================
-- WHAT WILL REMAIN AFTER REMOVAL
-- =====================================================
-- - All audit triggers (for logging changes)
-- - All status transition triggers (for business logic)
-- - All email templates (for potential manual use)
-- - All edge functions (for potential manual testing)
-- - Email logs table (for historical records)
-- - Email settings tables (for configuration)

-- This backup migration does not execute any changes - it only documents the current state
SELECT 'Email system backup documentation created successfully' as backup_status;
