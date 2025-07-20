
-- Phase 1 & 2: Fix all broken email trigger functions to use the unified email system
-- Replace the broken notify_user_welcome function
CREATE OR REPLACE FUNCTION public.notify_user_welcome() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $function$
BEGIN
  PERFORM public.call_send_email_trigger(
    'welcome_email',
    NEW.id,
    'profile'
  );
  RETURN NEW;
END;
$function$;

-- Replace the broken notify_work_order_created function  
CREATE OR REPLACE FUNCTION public.notify_work_order_created() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $function$
BEGIN
  PERFORM public.call_send_email_trigger(
    'work_order_created',
    NEW.id,
    'work_order'
  );
  RETURN NEW;
END;
$function$;

-- Replace the broken notify_work_order_assigned function
CREATE OR REPLACE FUNCTION public.notify_work_order_assigned() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $function$
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
END;
$function$;

-- Replace the broken notify_report_submitted function
CREATE OR REPLACE FUNCTION public.notify_report_submitted() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $function$
BEGIN
  PERFORM public.call_send_email_trigger(
    'report_submitted',
    NEW.id,
    'work_order_report'
  );
  RETURN NEW;
END;
$function$;

-- Replace the broken notify_report_reviewed function
CREATE OR REPLACE FUNCTION public.notify_report_reviewed() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $function$
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
END;
$function$;

-- Ensure all triggers are properly connected
-- Drop and recreate the user welcome trigger to ensure it's connected properly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.notify_user_welcome();

-- Ensure work order creation trigger exists
DROP TRIGGER IF EXISTS trigger_work_order_created ON work_orders;
CREATE TRIGGER trigger_work_order_created
  AFTER INSERT ON work_orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_work_order_created();

-- Ensure work order assignment trigger exists  
DROP TRIGGER IF EXISTS trigger_work_order_assigned ON work_orders;
CREATE TRIGGER trigger_work_order_assigned
  AFTER UPDATE ON work_orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_work_order_assigned();

-- Ensure report submission trigger exists
DROP TRIGGER IF EXISTS trigger_report_submitted ON work_order_reports;
CREATE TRIGGER trigger_report_submitted
  AFTER INSERT ON work_order_reports
  FOR EACH ROW EXECUTE FUNCTION public.notify_report_submitted();

-- Ensure report review trigger exists
DROP TRIGGER IF EXISTS trigger_report_reviewed ON work_order_reports;
CREATE TRIGGER trigger_report_reviewed
  AFTER UPDATE ON work_order_reports
  FOR EACH ROW EXECUTE FUNCTION public.notify_report_reviewed();

-- Add comment to document the unified email system
COMMENT ON FUNCTION public.call_send_email_trigger IS 'Unified email trigger function that routes to the send-email Edge Function for all email types';
