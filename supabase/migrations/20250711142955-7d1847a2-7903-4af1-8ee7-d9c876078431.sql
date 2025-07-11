-- Add estimate_needed to work_order_status enum
ALTER TYPE work_order_status ADD VALUE IF NOT EXISTS 'estimate_needed';

-- Create status transition function with audit logging
CREATE OR REPLACE FUNCTION public.transition_work_order_status(
  work_order_id UUID,
  new_status work_order_status,
  reason TEXT DEFAULT NULL,
  user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  old_status work_order_status;
  current_user_id UUID;
BEGIN
  -- Get current status
  SELECT status INTO old_status 
  FROM work_orders 
  WHERE id = work_order_id;
  
  IF old_status IS NULL THEN
    RAISE EXCEPTION 'Work order not found: %', work_order_id;
  END IF;
  
  -- Don't update if status is the same
  IF old_status = new_status THEN
    RETURN TRUE;
  END IF;
  
  -- Get current user if not provided
  current_user_id := COALESCE(user_id, auth.uid());
  
  -- Update work order status
  UPDATE work_orders 
  SET 
    status = new_status,
    updated_at = now(),
    date_assigned = CASE 
      WHEN new_status = 'assigned' AND date_assigned IS NULL 
      THEN now() 
      ELSE date_assigned 
    END,
    completed_at = CASE 
      WHEN new_status = 'completed' AND completed_at IS NULL 
      THEN now() 
      ELSE completed_at 
    END
  WHERE id = work_order_id;
  
  -- Log the status change in audit logs
  INSERT INTO audit_logs (
    table_name,
    record_id,
    action,
    old_values,
    new_values,
    user_id
  ) VALUES (
    'work_orders',
    work_order_id,
    'STATUS_CHANGE',
    jsonb_build_object('status', old_status),
    jsonb_build_object('status', new_status, 'reason', COALESCE(reason, 'Automatic transition')),
    current_user_id
  );
  
  RETURN TRUE;
END;
$$;

-- Function to auto-update status when assignments are created
CREATE OR REPLACE FUNCTION public.auto_update_assignment_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- When assignment is created, transition from received to assigned
  IF TG_OP = 'INSERT' THEN
    PERFORM public.transition_work_order_status(
      NEW.work_order_id,
      'assigned'::work_order_status,
      'Assignment created for user: ' || NEW.assigned_to,
      NEW.assigned_by
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to check completion status based on assignments
CREATE OR REPLACE FUNCTION public.check_assignment_completion_status(
  work_order_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  lead_assignments_count INTEGER;
  completed_lead_reports INTEGER;
  current_status work_order_status;
BEGIN
  -- Get current work order status
  SELECT status INTO current_status 
  FROM work_orders 
  WHERE id = work_order_id;
  
  -- Only check completion for in_progress work orders
  IF current_status != 'in_progress' THEN
    RETURN FALSE;
  END IF;
  
  -- Count lead assignments
  SELECT COUNT(*) INTO lead_assignments_count
  FROM work_order_assignments woa
  WHERE woa.work_order_id = check_assignment_completion_status.work_order_id
    AND woa.assignment_type = 'lead';
  
  -- If no lead assignments, use legacy model (check assigned_to)
  IF lead_assignments_count = 0 THEN
    -- Check if there's an approved report from the assigned user
    SELECT COUNT(*) INTO completed_lead_reports
    FROM work_order_reports wor
    JOIN work_orders wo ON wo.id = wor.work_order_id
    WHERE wor.work_order_id = check_assignment_completion_status.work_order_id
      AND wor.status = 'approved'
      AND wor.subcontractor_user_id = wo.assigned_to;
  ELSE
    -- Count completed reports from lead assignees
    SELECT COUNT(DISTINCT woa.assigned_to) INTO completed_lead_reports
    FROM work_order_assignments woa
    JOIN work_order_reports wor ON wor.work_order_id = woa.work_order_id 
      AND wor.subcontractor_user_id = woa.assigned_to
    WHERE woa.work_order_id = check_assignment_completion_status.work_order_id
      AND woa.assignment_type = 'lead'
      AND wor.status = 'approved';
  END IF;
  
  -- If all lead assignees have completed reports, transition to completed
  IF completed_lead_reports >= GREATEST(lead_assignments_count, 1) THEN
    PERFORM public.transition_work_order_status(
      check_assignment_completion_status.work_order_id,
      'completed'::work_order_status,
      'All lead assignees have submitted approved reports'
    );
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Function to handle report submission status updates
CREATE OR REPLACE FUNCTION public.auto_update_report_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
    PERFORM public.check_assignment_completion_status(NEW.work_order_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers for automatic status updates
DROP TRIGGER IF EXISTS trigger_auto_assignment_status ON work_order_assignments;
CREATE TRIGGER trigger_auto_assignment_status
  AFTER INSERT ON work_order_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_update_assignment_status();

DROP TRIGGER IF EXISTS trigger_auto_report_status ON work_order_reports;
CREATE TRIGGER trigger_auto_report_status
  AFTER INSERT OR UPDATE ON work_order_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_update_report_status();