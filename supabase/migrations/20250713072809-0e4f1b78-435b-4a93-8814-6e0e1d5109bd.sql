-- Fix transition_work_order_status function to handle foreign key violations gracefully
-- This prevents seeding failures when user_id references don't exist in audit_logs

CREATE OR REPLACE FUNCTION public.transition_work_order_status(work_order_id uuid, new_status work_order_status, reason text DEFAULT NULL::text, user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
  
  -- Log the status change in audit logs with error handling
  BEGIN
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
  EXCEPTION WHEN foreign_key_violation THEN
    -- Log warning but don't fail the status transition during seeding
    RAISE WARNING 'Audit log failed for work order status change %: %', work_order_id, SQLERRM;
  WHEN OTHERS THEN
    -- Log any other errors but don't fail the status transition
    RAISE WARNING 'Audit log failed for work order status change %: %', work_order_id, SQLERRM;
  END;
  
  RETURN TRUE;
END;
$function$