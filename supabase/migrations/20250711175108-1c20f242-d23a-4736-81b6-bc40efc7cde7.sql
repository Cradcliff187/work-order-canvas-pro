-- Enhanced completion detection for work orders
-- This migration improves automatic completion when all assignees submit approved reports

-- Add completion tracking fields to work_orders table
ALTER TABLE work_orders 
ADD COLUMN IF NOT EXISTS completion_method text DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS auto_completion_blocked boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS completion_checked_at timestamp with time zone;

-- Create enhanced assignment completion check function
CREATE OR REPLACE FUNCTION public.check_assignment_completion_status_enhanced(work_order_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  current_status work_order_status;
  lead_assignments_count INTEGER;
  completed_lead_reports INTEGER;
  total_assignments_count INTEGER;
  is_legacy_model boolean DEFAULT false;
  work_order_rec RECORD;
BEGIN
  -- Get current work order details
  SELECT status, auto_completion_blocked, assigned_to 
  INTO work_order_rec
  FROM work_orders 
  WHERE id = work_order_id;
  
  -- Exit early if work order not found
  IF work_order_rec IS NULL THEN
    RETURN FALSE;
  END IF;
  
  current_status := work_order_rec.status;
  
  -- Only check completion for in_progress work orders
  IF current_status != 'in_progress' THEN
    RETURN FALSE;
  END IF;
  
  -- Don't auto-complete if manually blocked
  IF work_order_rec.auto_completion_blocked = true THEN
    RETURN FALSE;
  END IF;
  
  -- Count total assignments
  SELECT COUNT(*) INTO total_assignments_count
  FROM work_order_assignments woa
  WHERE woa.work_order_id = check_assignment_completion_status_enhanced.work_order_id;
  
  -- Count lead assignments
  SELECT COUNT(*) INTO lead_assignments_count
  FROM work_order_assignments woa
  WHERE woa.work_order_id = check_assignment_completion_status_enhanced.work_order_id
    AND woa.assignment_type = 'lead';
  
  -- Determine if using legacy model (no assignments table entries)
  IF total_assignments_count = 0 THEN
    is_legacy_model := true;
  END IF;
  
  -- Handle legacy model (single assignee in work_orders.assigned_to)
  IF is_legacy_model AND work_order_rec.assigned_to IS NOT NULL THEN
    SELECT COUNT(*) INTO completed_lead_reports
    FROM work_order_reports wor
    WHERE wor.work_order_id = check_assignment_completion_status_enhanced.work_order_id
      AND wor.status = 'approved'
      AND wor.subcontractor_user_id = work_order_rec.assigned_to;
    
    -- Complete if the assigned user has submitted an approved report
    IF completed_lead_reports >= 1 THEN
      PERFORM public.transition_work_order_status(
        check_assignment_completion_status_enhanced.work_order_id,
        'completed'::work_order_status,
        'Auto-completed: Assigned user submitted approved report'
      );
      
      -- Update completion tracking
      UPDATE work_orders 
      SET completion_method = 'automatic',
          completion_checked_at = now()
      WHERE id = check_assignment_completion_status_enhanced.work_order_id;
      
      RETURN TRUE;
    END IF;
    
    RETURN FALSE;
  END IF;
  
  -- Handle new assignment model
  IF lead_assignments_count > 0 THEN
    -- Count completed reports from lead assignees
    SELECT COUNT(DISTINCT woa.assigned_to) INTO completed_lead_reports
    FROM work_order_assignments woa
    JOIN work_order_reports wor ON wor.work_order_id = woa.work_order_id 
      AND wor.subcontractor_user_id = woa.assigned_to
    WHERE woa.work_order_id = check_assignment_completion_status_enhanced.work_order_id
      AND woa.assignment_type = 'lead'
      AND wor.status = 'approved';
  ELSE
    -- If no lead assignments, check all assignments
    SELECT COUNT(DISTINCT woa.assigned_to) INTO completed_lead_reports
    FROM work_order_assignments woa
    JOIN work_order_reports wor ON wor.work_order_id = woa.work_order_id 
      AND wor.subcontractor_user_id = woa.assigned_to
    WHERE woa.work_order_id = check_assignment_completion_status_enhanced.work_order_id
      AND wor.status = 'approved';
    
    lead_assignments_count := total_assignments_count;
  END IF;
  
  -- Check if all required assignees have completed their work
  IF completed_lead_reports >= lead_assignments_count AND lead_assignments_count > 0 THEN
    PERFORM public.transition_work_order_status(
      check_assignment_completion_status_enhanced.work_order_id,
      'completed'::work_order_status,
      FORMAT('Auto-completed: All %s lead assignees submitted approved reports', lead_assignments_count)
    );
    
    -- Update completion tracking
    UPDATE work_orders 
    SET completion_method = 'automatic',
        completion_checked_at = now()
    WHERE id = check_assignment_completion_status_enhanced.work_order_id;
    
    -- Trigger completion email notification
    PERFORM public.trigger_completion_email(check_assignment_completion_status_enhanced.work_order_id);
    
    RETURN TRUE;
  END IF;
  
  -- Update check timestamp even if not completing
  UPDATE work_orders 
  SET completion_checked_at = now()
  WHERE id = check_assignment_completion_status_enhanced.work_order_id;
  
  RETURN FALSE;
END;
$function$;

-- Create function to trigger completion email
CREATE OR REPLACE FUNCTION public.trigger_completion_email(work_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Use pg_net to call the completion email edge function
  PERFORM net.http_post(
    url := 'https://inudoymofztrvxhrlrek.supabase.co/functions/v1/email-work-order-completed',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object('work_order_id', work_order_id)
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the completion process
    RAISE WARNING 'Failed to trigger completion email for work order %: %', work_order_id, SQLERRM;
END;
$function$;

-- Update the existing report status trigger to use enhanced function
CREATE OR REPLACE FUNCTION public.auto_update_report_status_enhanced()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  current_status work_order_status;
BEGIN
  -- Get current work order status
  SELECT status INTO current_status 
  FROM work_orders 
  WHERE id = NEW.work_order_id;
  
  -- When first report is submitted, transition to in_progress
  IF TG_OP = 'INSERT' AND current_status = 'assigned' THEN
    PERFORM public.transition_work_order_status(
      NEW.work_order_id,
      'in_progress'::work_order_status,
      'First report submitted by: ' || NEW.subcontractor_user_id
    );
  END IF;
  
  -- When report is approved, check if work order should be completed
  IF TG_OP = 'UPDATE' AND NEW.status = 'approved' AND OLD.status != 'approved' THEN
    PERFORM public.check_assignment_completion_status_enhanced(NEW.work_order_id);
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update existing trigger to use enhanced function
DROP TRIGGER IF EXISTS trigger_auto_report_status ON work_order_reports;
CREATE TRIGGER trigger_auto_report_status
  AFTER INSERT OR UPDATE ON work_order_reports
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_report_status_enhanced();

-- Create function to allow manual completion override
CREATE OR REPLACE FUNCTION public.set_manual_completion_block(work_order_id uuid, blocked boolean DEFAULT true)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Only admins can block/unblock auto-completion
  IF NOT public.auth_is_admin() THEN
    RAISE EXCEPTION 'Only administrators can modify completion settings';
  END IF;
  
  UPDATE work_orders 
  SET auto_completion_blocked = blocked,
      completion_method = CASE WHEN blocked THEN 'manual_override' ELSE completion_method END
  WHERE id = work_order_id;
  
  -- Log the action
  INSERT INTO audit_logs (
    table_name,
    record_id,
    action,
    new_values,
    user_id
  ) VALUES (
    'work_orders',
    work_order_id,
    'COMPLETION_BLOCK_CHANGE',
    jsonb_build_object('auto_completion_blocked', blocked, 'changed_by', public.auth_profile_id()),
    public.auth_user_id()
  );
END;
$function$;