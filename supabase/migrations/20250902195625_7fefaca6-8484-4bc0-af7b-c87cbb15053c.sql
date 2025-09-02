-- Update is_valid_transition function to support estimate_pending_approval status
CREATE OR REPLACE FUNCTION is_valid_transition(p_from_status work_order_status, p_to_status work_order_status)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE p_from_status
    WHEN 'received' THEN 
      p_to_status IN ('assigned', 'estimate_needed', 'cancelled')
    WHEN 'assigned' THEN 
      p_to_status IN ('in_progress', 'estimate_needed', 'estimate_pending_approval', 'completed', 'cancelled')
    WHEN 'estimate_needed' THEN 
      p_to_status IN ('estimate_pending_approval', 'assigned', 'cancelled')
    WHEN 'estimate_pending_approval' THEN 
      p_to_status IN ('estimate_approved', 'estimate_needed', 'cancelled')
    WHEN 'estimate_approved' THEN 
      p_to_status IN ('in_progress', 'assigned', 'estimate_needed', 'cancelled')
    WHEN 'in_progress' THEN 
      p_to_status IN ('completed', 'assigned', 'cancelled')
    WHEN 'completed' THEN 
      p_to_status IN ('in_progress')
    WHEN 'cancelled' THEN 
      p_to_status IN ('received')
    ELSE false
  END;
END;
$$;