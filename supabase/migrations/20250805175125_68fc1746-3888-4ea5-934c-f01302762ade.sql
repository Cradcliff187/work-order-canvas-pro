-- Fix check_assignment_completion_status_enhanced function to use correct schema
-- Remove references to non-existent work_orders.assigned_to column

CREATE OR REPLACE FUNCTION public.check_assignment_completion_status_enhanced(work_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  wo_record RECORD;
  assignment_count INTEGER := 0;
  completed_reports_count INTEGER := 0;
  result jsonb;
  can_auto_complete BOOLEAN := false;
BEGIN
  -- Get work order details
  SELECT 
    id,
    status,
    auto_completion_blocked,
    completion_method
  INTO wo_record
  FROM work_orders
  WHERE id = work_order_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Work order not found',
      'work_order_id', work_order_id
    );
  END IF;
  
  -- Skip if already completed or auto-completion is blocked
  IF wo_record.status = 'completed' OR wo_record.auto_completion_blocked = true THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Work order already completed or auto-completion blocked',
      'work_order_id', work_order_id,
      'current_status', wo_record.status
    );
  END IF;
  
  -- Count assignments from work_order_assignments table
  SELECT COUNT(*) INTO assignment_count
  FROM work_order_assignments
  WHERE work_order_assignments.work_order_id = check_assignment_completion_status_enhanced.work_order_id;
  
  -- Count approved reports for this work order
  SELECT COUNT(*) INTO completed_reports_count
  FROM work_order_reports
  WHERE work_order_reports.work_order_id = check_assignment_completion_status_enhanced.work_order_id
  AND status = 'approved';
  
  -- Determine if work order can be auto-completed
  can_auto_complete := (
    assignment_count > 0 AND 
    completed_reports_count >= assignment_count AND
    wo_record.status IN ('assigned', 'in_progress')
  );
  
  -- Auto-complete if conditions are met
  IF can_auto_complete THEN
    UPDATE work_orders 
    SET 
      status = 'completed',
      date_completed = NOW(),
      completion_method = 'auto',
      completion_checked_at = NOW()
    WHERE id = work_order_id;
    
    -- Log completion
    INSERT INTO audit_logs (
      table_name,
      record_id,
      action,
      new_values,
      user_id
    ) VALUES (
      'work_orders',
      work_order_id,
      'auto_complete',
      jsonb_build_object(
        'status', 'completed',
        'completion_method', 'auto',
        'trigger', 'check_assignment_completion_status_enhanced'
      ),
      auth_profile_id_safe()
    );
    
    RETURN jsonb_build_object(
      'success', true,
      'action', 'completed',
      'work_order_id', work_order_id,
      'assignments_count', assignment_count,
      'completed_reports_count', completed_reports_count,
      'message', 'Work order auto-completed successfully'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'action', 'checked',
    'work_order_id', work_order_id,
    'assignments_count', assignment_count,
    'completed_reports_count', completed_reports_count,
    'can_auto_complete', can_auto_complete,
    'message', 'Completion status checked - no action taken'
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'work_order_id', work_order_id,
    'message', 'Error checking completion status: ' || SQLERRM
  );
END;
$function$;