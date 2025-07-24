-- Fix the assignment email trigger system completely

-- Step 1: Create the proper call_send_email_trigger function
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

-- Step 2: Create the assignment email trigger with comprehensive logging
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

-- Step 3: Ensure the trigger exists and is properly configured
DROP TRIGGER IF EXISTS send_assignment_email ON work_order_assignments;

CREATE TRIGGER send_assignment_email
  AFTER INSERT ON work_order_assignments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_work_order_assignment_email();

-- Step 4: Add logging to help debug email issues
CREATE OR REPLACE FUNCTION public.log_email_debug(
  message text,
  context jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RAISE LOG 'EMAIL_DEBUG: % - Context: %', message, context;
END;
$function$;

-- Step 5: Test the email trigger immediately (if there are any recent assignments)
DO $$
DECLARE
  recent_assignment record;
BEGIN
  -- Find the most recent assignment to test the trigger
  SELECT * INTO recent_assignment 
  FROM work_order_assignments 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  IF recent_assignment.id IS NOT NULL THEN
    RAISE LOG 'Testing email trigger with recent assignment: %', recent_assignment.id;
    
    -- Call the trigger function directly for testing
    PERFORM trigger_work_order_assignment_email()
    FROM (SELECT recent_assignment.*) AS NEW;
    
    RAISE LOG 'Email trigger test completed';
  ELSE
    RAISE LOG 'No recent assignments found for testing';
  END IF;
END;
$$;