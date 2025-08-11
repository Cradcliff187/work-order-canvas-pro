BEGIN;

-- Ensure fresh RPC signatures
DROP FUNCTION IF EXISTS public.mark_conversation_read(uuid);
DROP FUNCTION IF EXISTS public.get_conversation_messages(uuid, integer, timestamptz);
DROP FUNCTION IF EXISTS public.get_conversations_overview();

-- 1) Helper trigger to auto-fill sender and timestamps for conversation messages on base table
CREATE OR REPLACE FUNCTION public.set_conversation_message_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
BEGIN
  IF NEW.conversation_id IS NOT NULL THEN
    IF NEW.sender_id IS NULL THEN
      NEW.sender_id := public.auth_profile_id_safe();
    END IF;
    IF NEW.created_at IS NULL THEN
      NEW.created_at := now();
    END IF;
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_set_conversation_defaults ON public.work_order_messages;
CREATE TRIGGER trg_set_conversation_defaults
BEFORE INSERT OR UPDATE ON public.work_order_messages
FOR EACH ROW
EXECUTE FUNCTION public.set_conversation_message_defaults();

-- 2) RPC: get_conversation_messages (reads from base table)
CREATE FUNCTION public.get_conversation_messages(
  p_conversation_id uuid,
  p_limit integer DEFAULT 50,
  p_before timestamptz DEFAULT now()
)
RETURNS TABLE (
  id uuid,
  message text,
  sender_id uuid,
  created_at timestamptz,
  attachment_ids uuid[]
)
LANGUAGE sql
STABLE
AS $$
  SELECT m.id, m.message, m.sender_id, m.created_at, m.attachment_ids
  FROM public.work_order_messages m
  WHERE m.conversation_id = p_conversation_id
    AND m.created_at < p_before
  ORDER BY m.created_at DESC
  LIMIT p_limit;
$$;

-- 3) RPC: get_conversations_overview (compute from base table + participants)
CREATE FUNCTION public.get_conversations_overview()
RETURNS TABLE(
  conversation_id uuid,
  title text,
  conversation_type conversation_type,
  last_message text,
  last_message_at timestamptz,
  unread_count integer,
  updated_at timestamptz,
  other_user_id uuid,
  organization_id uuid
)
LANGUAGE sql
STABLE
AS $$
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
    SELECT cp2.conversation_id, cp2.user_id
    FROM public.conversation_participants cp2
    WHERE cp2.user_id <> public.auth_profile_id_safe()
  )
  SELECT 
    b.id AS conversation_id,
    CASE 
      WHEN b.conversation_type = 'direct'::conversation_type 
        THEN COALESCE(p.first_name || ' ' || p.last_name, b.title)
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
  LEFT JOIN public.profiles p ON p.id = op.user_id
  ORDER BY COALESCE(l.created_at, b.updated_at) DESC NULLS LAST;
$$;

-- 4) RPC: mark_conversation_read (update participant checkpoint)
CREATE FUNCTION public.mark_conversation_read(p_conversation_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE public.conversation_participants
  SET last_read_at = now()
  WHERE conversation_id = p_conversation_id
    AND user_id = public.auth_profile_id_safe();
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count > 0;
END;
$$;

COMMIT;