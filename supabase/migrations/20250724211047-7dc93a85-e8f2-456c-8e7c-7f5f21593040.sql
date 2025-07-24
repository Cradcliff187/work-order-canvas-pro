-- Update the work order assignment email trigger to include organization ID
CREATE OR REPLACE FUNCTION public.trigger_work_order_assignment_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Call the email trigger with work order ID and assignment context including organization
  PERFORM call_send_email_trigger(
    'work_order_assigned', 
    NEW.work_order_id, 
    'work_order_assignment',
    jsonb_build_object(
      'assigned_to', NEW.assigned_to, 
      'assignment_id', NEW.id,
      'assigned_organization_id', NEW.assigned_organization_id
    )
  );
  RETURN NEW;
END;
$function$;