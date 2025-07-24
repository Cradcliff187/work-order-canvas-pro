-- Fix work order assignment email trigger
-- Drop and recreate the trigger function to handle assignment emails properly

DROP FUNCTION IF EXISTS trigger_work_order_assignment_email();

CREATE OR REPLACE FUNCTION public.trigger_work_order_assignment_email()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Call the email trigger with work order ID and assignment context
  PERFORM call_send_email_trigger('work_order_assigned', NEW.work_order_id, 'work_order_assignment', 
    jsonb_build_object('assigned_to', NEW.assigned_to, 'assignment_id', NEW.id));
  RETURN NEW;
END;
$function$;