-- Enhanced Work Order Status Transition System Migration (Fixed)
-- This migration adds comprehensive status transition support with validation matrix

-- 1. Add estimate_approved enum value to work_order_status
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'estimate_approved' AND enumtypid = 'work_order_status'::regtype) THEN
        ALTER TYPE work_order_status ADD VALUE 'estimate_approved' AFTER 'estimate_needed';
    END IF;
END $$;

-- 2. Add date_approved column to work_orders table
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS date_approved timestamp with time zone;

-- 3. Drop existing function to allow signature change
DROP FUNCTION IF EXISTS public.transition_work_order_status(uuid, work_order_status, text, uuid);

-- 4. Create enhanced transition_work_order_status function
CREATE OR REPLACE FUNCTION public.transition_work_order_status(
  work_order_id uuid,
  new_status work_order_status,
  reason text DEFAULT NULL,
  user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_record work_orders%ROWTYPE;
  old_status work_order_status;
  transition_valid boolean := false;
  audit_user_id uuid;
  result jsonb;
BEGIN
  -- Get current work order record
  SELECT * INTO current_record FROM work_orders WHERE id = work_order_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Work order not found',
      'work_order_id', work_order_id
    );
  END IF;
  
  old_status := current_record.status;
  
  -- Skip if status is the same
  IF old_status = new_status THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Status unchanged',
      'old_status', old_status,
      'new_status', new_status
    );
  END IF;
  
  -- Determine user for audit (use provided user_id or try to get from context)
  audit_user_id := COALESCE(user_id, auth.uid(), current_record.created_by);
  
  -- Comprehensive transition validation matrix
  transition_valid := CASE old_status
    WHEN 'received' THEN new_status IN ('assigned', 'cancelled')
    WHEN 'assigned' THEN new_status IN ('in_progress', 'estimate_needed', 'completed', 'cancelled')
    WHEN 'estimate_needed' THEN new_status IN ('estimate_approved', 'cancelled')
    WHEN 'estimate_approved' THEN new_status IN ('in_progress', 'estimate_needed', 'cancelled')
    WHEN 'in_progress' THEN new_status IN ('completed', 'assigned')
    WHEN 'completed' THEN new_status IN ('in_progress')
    WHEN 'cancelled' THEN new_status IN ('received')
    ELSE false
  END;
  
  -- Return detailed error for invalid transitions
  IF NOT transition_valid THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Invalid transition from %s to %s', old_status, new_status),
      'allowed_transitions', CASE old_status
        WHEN 'received' THEN jsonb_build_array('assigned', 'cancelled')
        WHEN 'assigned' THEN jsonb_build_array('in_progress', 'estimate_needed', 'completed', 'cancelled')
        WHEN 'estimate_needed' THEN jsonb_build_array('estimate_approved', 'cancelled')
        WHEN 'estimate_approved' THEN jsonb_build_array('in_progress', 'estimate_needed', 'cancelled')
        WHEN 'in_progress' THEN jsonb_build_array('completed', 'assigned')
        WHEN 'completed' THEN jsonb_build_array('in_progress')
        WHEN 'cancelled' THEN jsonb_build_array('received')
        ELSE jsonb_build_array()
      END,
      'current_status', old_status,
      'requested_status', new_status
    );
  END IF;
  
  -- Update work order with smart timestamp management
  UPDATE work_orders 
  SET 
    status = new_status,
    updated_at = now(),
    -- Set timestamps for forward transitions
    date_assigned = CASE 
      WHEN new_status = 'assigned' THEN COALESCE(date_assigned, now())
      WHEN new_status IN ('received', 'cancelled') THEN NULL -- Clear when going backwards
      ELSE date_assigned
    END,
    date_approved = CASE 
      WHEN new_status = 'estimate_approved' THEN COALESCE(date_approved, now())
      WHEN new_status IN ('received', 'assigned', 'estimate_needed', 'cancelled') THEN NULL -- Clear when going backwards
      ELSE date_approved
    END,
    date_completed = CASE 
      WHEN new_status = 'completed' THEN COALESCE(date_completed, now())
      WHEN new_status IN ('received', 'assigned', 'estimate_needed', 'estimate_approved', 'in_progress', 'cancelled') THEN NULL -- Clear when going backwards
      ELSE date_completed
    END
  WHERE id = work_order_id;
  
  -- Create comprehensive audit log entry
  INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values, user_id, created_at)
  VALUES (
    'work_orders',
    work_order_id,
    'UPDATE',
    jsonb_build_object(
      'status', old_status,
      'transition_type', 'status_change',
      'date_assigned', current_record.date_assigned,
      'date_approved', current_record.date_approved,
      'date_completed', current_record.date_completed
    ),
    jsonb_build_object(
      'status', new_status,
      'transition_type', 'status_change',
      'transition_reason', COALESCE(reason, 'Status transition'),
      'transition_valid', true,
      'date_assigned', CASE 
        WHEN new_status = 'assigned' THEN COALESCE(current_record.date_assigned, now())
        WHEN new_status IN ('received', 'cancelled') THEN NULL
        ELSE current_record.date_assigned
      END,
      'date_approved', CASE 
        WHEN new_status = 'estimate_approved' THEN COALESCE(current_record.date_approved, now())
        WHEN new_status IN ('received', 'assigned', 'estimate_needed', 'cancelled') THEN NULL
        ELSE current_record.date_approved
      END,
      'date_completed', CASE 
        WHEN new_status = 'completed' THEN COALESCE(current_record.date_completed, now())
        WHEN new_status IN ('received', 'assigned', 'estimate_needed', 'estimate_approved', 'in_progress', 'cancelled') THEN NULL
        ELSE current_record.date_completed
      END
    ),
    audit_user_id,
    now()
  );
  
  -- Trigger email notifications for key transitions
  BEGIN
    PERFORM public.call_send_email_trigger(
      CASE new_status
        WHEN 'assigned' THEN 'work_order_assigned'
        WHEN 'completed' THEN 'work_order_completed'
        ELSE NULL
      END,
      work_order_id,
      'work_order'
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log email trigger errors but don't fail the transaction
    RAISE WARNING 'Email trigger failed for work order % status %: %', work_order_id, new_status, SQLERRM;
  END;
  
  -- Return success with transition details
  RETURN jsonb_build_object(
    'success', true,
    'message', format('Work order status transitioned from %s to %s', old_status, new_status),
    'work_order_id', work_order_id,
    'old_status', old_status,
    'new_status', new_status,
    'reason', COALESCE(reason, 'Status transition'),
    'user_id', audit_user_id,
    'timestamp', now()
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Database error during status transition',
    'error_detail', SQLERRM,
    'work_order_id', work_order_id,
    'old_status', old_status,
    'requested_status', new_status
  );
END;
$function$;

-- 5. Data consistency: Migrate any completed_at values to date_completed
UPDATE work_orders 
SET date_completed = completed_at 
WHERE completed_at IS NOT NULL AND date_completed IS NULL AND status = 'completed';

-- 6. Create test function to validate all transitions
CREATE OR REPLACE FUNCTION public.test_work_order_transitions()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  test_results jsonb := '{}';
  test_wo_id uuid;
  result jsonb;
BEGIN
  -- Create a test work order
  INSERT INTO work_orders (work_order_number, title, description, organization_id, trade_id, status, created_by)
  SELECT 
    'TEST-TRANSITION-001',
    'Test Work Order for Transitions',
    'Testing all status transitions',
    (SELECT id FROM organizations WHERE organization_type = 'partner' LIMIT 1),
    (SELECT id FROM trades LIMIT 1),
    'received',
    (SELECT id FROM profiles WHERE user_type = 'admin' LIMIT 1)
  RETURNING id INTO test_wo_id;
  
  -- Test valid transitions from received
  SELECT transition_work_order_status(test_wo_id, 'assigned') INTO result;
  test_results := test_results || jsonb_build_object('received_to_assigned', result);
  
  -- Test transition to estimate_needed
  SELECT transition_work_order_status(test_wo_id, 'estimate_needed') INTO result;
  test_results := test_results || jsonb_build_object('assigned_to_estimate_needed', result);
  
  -- Test transition to estimate_approved
  SELECT transition_work_order_status(test_wo_id, 'estimate_approved') INTO result;
  test_results := test_results || jsonb_build_object('estimate_needed_to_approved', result);
  
  -- Test transition to in_progress
  SELECT transition_work_order_status(test_wo_id, 'in_progress') INTO result;
  test_results := test_results || jsonb_build_object('estimate_approved_to_in_progress', result);
  
  -- Test transition to completed
  SELECT transition_work_order_status(test_wo_id, 'completed') INTO result;
  test_results := test_results || jsonb_build_object('in_progress_to_completed', result);
  
  -- Test backwards transition (completed to in_progress)
  SELECT transition_work_order_status(test_wo_id, 'in_progress') INTO result;
  test_results := test_results || jsonb_build_object('completed_to_in_progress', result);
  
  -- Test invalid transition (should fail)
  SELECT transition_work_order_status(test_wo_id, 'received') INTO result;
  test_results := test_results || jsonb_build_object('invalid_in_progress_to_received', result);
  
  -- Clean up test work order
  DELETE FROM work_orders WHERE id = test_wo_id;
  
  RETURN jsonb_build_object(
    'test_completed', true,
    'test_work_order_id', test_wo_id,
    'results', test_results
  );
END;
$function$;