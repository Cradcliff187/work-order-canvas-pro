-- Complete Email System Function Overloading Fix
-- This migration removes the 3-parameter version and updates all triggers

-- Step 1: Drop the old 3-parameter version of call_send_email_trigger
DROP FUNCTION IF EXISTS public.call_send_email_trigger(text, uuid, text);

-- Step 2: Create the unified 4-parameter version with backward compatibility
CREATE OR REPLACE FUNCTION public.call_send_email_trigger(
  template_name text,
  record_id uuid,
  record_type text DEFAULT 'work_order',
  context_data jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  function_url text;
  payload jsonb;
  http_request_id uuid;
BEGIN
  -- Get the function URL from environment
  function_url := 'https://inudoymofztrvxhrlrek.supabase.co/functions/v1/send-email';
  
  -- Build the payload with context data
  payload := jsonb_build_object(
    'template_name', template_name,
    'record_id', record_id,
    'record_type', record_type,
    'custom_data', context_data
  );
  
  -- Log the attempt
  RAISE LOG 'Calling email trigger: template=%, record_id=%, record_type=%, context=%', 
    template_name, record_id, record_type, context_data;
  
  -- Call the edge function using net.http_post (async, no response needed)
  BEGIN
    SELECT net.http_post(
      url := function_url,
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := payload
    ) INTO http_request_id;
    
    RAISE LOG 'Email trigger called successfully: request_id=%', http_request_id;
    
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the main transaction
    RAISE WARNING 'Email trigger failed for template % with record %: %', 
      template_name, record_id, SQLERRM;
  END;
END;
$function$;

-- Step 3: Update trigger_work_order_created_email to use 4-parameter version
CREATE OR REPLACE FUNCTION public.trigger_work_order_created_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Only trigger for actual new work orders
  IF TG_OP = 'INSERT' THEN
    PERFORM public.call_send_email_trigger(
      'work_order_created',
      NEW.id,
      'work_order',
      '{}'::jsonb
    );
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the main transaction
  RAISE WARNING 'Work order created trigger failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$function$;

-- Step 4: Update trigger_work_order_completed_email to use 4-parameter version
CREATE OR REPLACE FUNCTION public.trigger_work_order_completed_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Only trigger when status changes to completed
  IF TG_OP = 'UPDATE' AND 
     OLD.status != 'completed' AND 
     NEW.status = 'completed' THEN
    
    PERFORM public.call_send_email_trigger(
      'work_order_completed',
      NEW.id,
      'work_order',
      '{}'::jsonb
    );
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the main transaction
  RAISE WARNING 'Work order completed trigger failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$function$;

-- Step 5: Update trigger_report_submitted_email to use 4-parameter version
CREATE OR REPLACE FUNCTION public.trigger_report_submitted_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Only trigger for actual new reports
  IF TG_OP = 'INSERT' THEN
    PERFORM public.call_send_email_trigger(
      'report_submitted',
      NEW.id,
      'work_order_report',
      '{}'::jsonb
    );
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the main transaction
  RAISE WARNING 'Report submitted trigger failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$function$;

-- Step 6: Update trigger_report_reviewed_email to use 4-parameter version
CREATE OR REPLACE FUNCTION public.trigger_report_reviewed_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Only trigger when status changes to approved or rejected
  IF TG_OP = 'UPDATE' AND 
     OLD.status = 'submitted' AND 
     NEW.status IN ('approved', 'rejected') THEN
    
    PERFORM public.call_send_email_trigger(
      'report_reviewed',
      NEW.id,
      'work_order_report',
      '{}'::jsonb
    );
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the main transaction
  RAISE WARNING 'Report reviewed trigger failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$function$;

-- Step 7: Create the assignment email trigger with comprehensive context data
CREATE OR REPLACE FUNCTION public.trigger_work_order_assignment_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  org_email text;
BEGIN
  -- Log the trigger activation
  RAISE LOG 'Assignment email trigger fired: work_order_id=%, assigned_to=%, assigned_organization_id=%', 
    NEW.work_order_id, NEW.assigned_to, NEW.assigned_organization_id;
  
  -- Validate we have an assigned organization
  IF NEW.assigned_organization_id IS NULL THEN
    RAISE WARNING 'Assignment email trigger: No assigned_organization_id for assignment %', NEW.id;
    RETURN NEW;
  END IF;
  
  -- Get organization email for validation
  SELECT contact_email INTO org_email 
  FROM organizations 
  WHERE id = NEW.assigned_organization_id;
  
  IF org_email IS NULL THEN
    RAISE WARNING 'Assignment email trigger: No contact email found for organization %', NEW.assigned_organization_id;
    RETURN NEW;
  END IF;
  
  RAISE LOG 'Assignment email trigger: Found organization email % for org %', org_email, NEW.assigned_organization_id;
  
  -- Call the email trigger with comprehensive context
  PERFORM call_send_email_trigger(
    'work_order_assigned', 
    NEW.work_order_id, 
    'work_order_assignment',
    jsonb_build_object(
      'assigned_to', NEW.assigned_to, 
      'assignment_id', NEW.id,
      'assigned_organization_id', NEW.assigned_organization_id,
      'assignment_type', NEW.assignment_type,
      'notes', NEW.notes
    )
  );
  
  RAISE LOG 'Assignment email trigger completed successfully for assignment %', NEW.id;
  
  RETURN NEW;
  
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the assignment
  RAISE WARNING 'Assignment email trigger failed for assignment %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$function$;

-- Step 8: Ensure all triggers exist and are properly configured
DROP TRIGGER IF EXISTS send_assignment_email ON work_order_assignments;
CREATE TRIGGER send_assignment_email
  AFTER INSERT ON work_order_assignments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_work_order_assignment_email();