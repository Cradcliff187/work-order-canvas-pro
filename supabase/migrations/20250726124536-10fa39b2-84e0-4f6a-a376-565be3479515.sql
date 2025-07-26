-- Create optimized function to get unread message counts for multiple work orders
CREATE OR REPLACE FUNCTION public.get_unread_message_counts(
  p_work_order_ids uuid[],
  p_user_id uuid,
  p_user_type user_type
)
RETURNS TABLE(work_order_id uuid, unread_count bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Return aggregated unread message counts per work order
  -- Uses role-based filtering and efficient joins with indexes
  RETURN QUERY
  SELECT 
    m.work_order_id,
    COUNT(m.id) as unread_count
  FROM work_order_messages m
  LEFT JOIN message_read_receipts mrr ON (
    mrr.message_id = m.id 
    AND mrr.user_id = p_user_id
  )
  WHERE 
    m.work_order_id = ANY(p_work_order_ids)
    AND mrr.message_id IS NULL  -- Message not read by user
    AND (
      -- Role-based message visibility
      CASE 
        WHEN p_user_type = 'partner' THEN m.is_internal = false
        WHEN p_user_type = 'subcontractor' THEN m.is_internal = true
        ELSE true  -- admin/employee see all messages
      END
    )
  GROUP BY m.work_order_id;
END;
$$;