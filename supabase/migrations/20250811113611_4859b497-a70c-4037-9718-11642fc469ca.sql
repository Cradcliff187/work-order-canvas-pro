-- Update RPC to set an explicit search_path and keep invoker security
CREATE OR REPLACE FUNCTION public.get_work_order_threads_overview(p_limit int DEFAULT 100)
RETURNS TABLE (
  work_order_id uuid,
  title text,
  last_message text,
  last_message_at timestamptz,
  unread_count integer,
  updated_at timestamptz,
  organization_id uuid
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
WITH visible_messages AS (
  SELECT m.*
  FROM public.work_order_messages m
  -- RLS on work_order_messages should restrict visibility per user/role
),
latest_per_wo AS (
  SELECT m.work_order_id, MAX(m.created_at) AS last_message_at
  FROM visible_messages m
  GROUP BY m.work_order_id
),
last_message_rows AS (
  SELECT m.work_order_id, m.message, m.created_at
  FROM visible_messages m
  JOIN latest_per_wo l 
    ON l.work_order_id = m.work_order_id 
   AND l.last_message_at = m.created_at
),
unread_counts AS (
  SELECT m.work_order_id, COUNT(*)::int AS unread_count
  FROM visible_messages m
  LEFT JOIN public.message_read_receipts r 
    ON r.message_id = m.id 
   AND r.user_id = public.auth_profile_id_safe()
  WHERE r.message_id IS NULL
    AND COALESCE(m.sender_id, '00000000-0000-0000-0000-000000000000') <> public.auth_profile_id_safe()
  GROUP BY m.work_order_id
)
SELECT
  w.id AS work_order_id,
  COALESCE(w.work_order_number || ' — ' || w.title, w.work_order_number) AS title,
  lmr.message AS last_message,
  lmr.created_at AS last_message_at,
  COALESCE(uc.unread_count, 0) AS unread_count,
  lmr.created_at AS updated_at,
  w.organization_id
FROM latest_per_wo lp
JOIN public.work_orders w ON w.id = lp.work_order_id
LEFT JOIN last_message_rows lmr ON lmr.work_order_id = w.id
LEFT JOIN unread_counts uc ON uc.work_order_id = w.id
ORDER BY lmr.created_at DESC NULLS LAST
LIMIT p_limit;
$$;