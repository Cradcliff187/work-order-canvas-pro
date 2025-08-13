-- Fix the get_conversations_overview function to properly show participant names for direct conversations
CREATE OR REPLACE FUNCTION public.get_conversations_overview()
RETURNS TABLE(
  conversation_id uuid, 
  title text, 
  conversation_type conversation_type, 
  last_message text, 
  last_message_at timestamp with time zone, 
  unread_count integer, 
  updated_at timestamp with time zone, 
  other_user_id uuid, 
  organization_id uuid
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
WITH my_cp AS (
  SELECT cp.*
  FROM public.conversation_participants cp
  WHERE cp.user_id = public.auth_profile_id_safe()
),
base AS (
  SELECT 
    c.id,
    c.title,
    c.conversation_type,
    c.organization_id,
    c.updated_at,
    cp.last_read_at
  FROM public.conversations c
  JOIN my_cp cp ON cp.conversation_id = c.id
),
lm AS (
  SELECT m.conversation_id, m.message, m.created_at
  FROM public.work_order_messages m
  JOIN (
    SELECT conversation_id, MAX(created_at) AS max_created
    FROM public.work_order_messages
    WHERE conversation_id IS NOT NULL
    GROUP BY conversation_id
  ) mx ON mx.conversation_id = m.conversation_id AND mx.max_created = m.created_at
),
other_participant AS (
  SELECT 
    cp2.conversation_id, 
    cp2.user_id,
    p.first_name,
    p.last_name
  FROM public.conversation_participants cp2
  JOIN public.profiles p ON p.id = cp2.user_id
  WHERE cp2.user_id <> public.auth_profile_id_safe()
)
SELECT 
  b.id AS conversation_id,
  CASE 
    WHEN b.conversation_type = 'direct'::conversation_type AND op.first_name IS NOT NULL
      THEN COALESCE(op.first_name || ' ' || op.last_name, b.title)
    ELSE b.title
  END AS title,
  b.conversation_type,
  l.message AS last_message,
  l.created_at AS last_message_at,
  COALESCE((
    SELECT COUNT(*)::int
    FROM public.work_order_messages m
    WHERE m.conversation_id = b.id
      AND (b.last_read_at IS NULL OR m.created_at > b.last_read_at)
      AND COALESCE(m.sender_id, '00000000-0000-0000-0000-000000000000') <> public.auth_profile_id_safe()
  ), 0) AS unread_count,
  COALESCE(l.created_at, b.updated_at) AS updated_at,
  op.user_id AS other_user_id,
  b.organization_id
FROM base b
LEFT JOIN lm l ON l.conversation_id = b.id
LEFT JOIN other_participant op ON op.conversation_id = b.id
ORDER BY COALESCE(l.created_at, b.updated_at) DESC NULLS LAST;
$function$;