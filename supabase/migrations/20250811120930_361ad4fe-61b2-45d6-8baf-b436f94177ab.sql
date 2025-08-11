BEGIN;

-- Enable realtime for unified_messages
ALTER TABLE public.unified_messages REPLICA IDENTITY FULL;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'unified_messages'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.unified_messages';
  END IF;
END $$;

-- Enable RLS for unified_messages
ALTER TABLE public.unified_messages ENABLE ROW LEVEL SECURITY;

-- Recreate policies idempotently
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='unified_messages' AND policyname='participants_can_select_messages') THEN
   EXECUTE 'DROP POLICY "participants_can_select_messages" ON public.unified_messages';
 END IF;
 IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='unified_messages' AND policyname='participants_can_insert_messages') THEN
   EXECUTE 'DROP POLICY "participants_can_insert_messages" ON public.unified_messages';
 END IF;
 IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='unified_messages' AND policyname='owner_or_admin_update') THEN
   EXECUTE 'DROP POLICY "owner_or_admin_update" ON public.unified_messages';
 END IF;
 IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='unified_messages' AND policyname='owner_or_admin_delete') THEN
   EXECUTE 'DROP POLICY "owner_or_admin_delete" ON public.unified_messages';
 END IF;
END $$;

CREATE POLICY "participants_can_select_messages"
ON public.unified_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = unified_messages.conversation_id
      AND cp.user_id = public.auth_profile_id_safe()
  ) OR public.jwt_is_admin()
);

CREATE POLICY "participants_can_insert_messages"
ON public.unified_messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = unified_messages.conversation_id
      AND cp.user_id = public.auth_profile_id_safe()
  ) AND (sender_id = public.auth_profile_id_safe())
);

CREATE POLICY "owner_or_admin_update"
ON public.unified_messages
FOR UPDATE
USING (
  sender_id = public.auth_profile_id_safe() OR public.jwt_is_admin()
)
WITH CHECK (
  sender_id = public.auth_profile_id_safe() OR public.jwt_is_admin()
);

CREATE POLICY "owner_or_admin_delete"
ON public.unified_messages
FOR DELETE
USING (
  sender_id = public.auth_profile_id_safe() OR public.jwt_is_admin()
);

-- Trigger to set defaults (sender_id, timestamps)
CREATE OR REPLACE FUNCTION public.set_unified_message_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
BEGIN
  IF NEW.sender_id IS NULL THEN
    NEW.sender_id := public.auth_profile_id_safe();
  END IF;
  IF NEW.created_at IS NULL THEN
    NEW.created_at := now();
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS before_unified_messages_ins ON public.unified_messages;
CREATE TRIGGER before_unified_messages_ins
BEFORE INSERT ON public.unified_messages
FOR EACH ROW
EXECUTE FUNCTION public.set_unified_message_defaults();

DROP TRIGGER IF EXISTS before_unified_messages_upd ON public.unified_messages;
CREATE TRIGGER before_unified_messages_upd
BEFORE UPDATE ON public.unified_messages
FOR EACH ROW
EXECUTE FUNCTION public.set_unified_message_defaults();

-- RPC: get_conversation_messages
CREATE OR REPLACE FUNCTION public.get_conversation_messages(
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
  FROM public.unified_messages m
  WHERE m.conversation_id = p_conversation_id
    AND m.created_at < p_before
  ORDER BY m.created_at DESC
  LIMIT p_limit;
$$;

-- RPC: get_conversations_overview
CREATE OR REPLACE FUNCTION public.get_conversations_overview()
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
    FROM public.unified_messages m
    JOIN (
      SELECT conversation_id, MAX(created_at) AS max_created
      FROM public.unified_messages
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
      FROM public.unified_messages m
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

-- RPC: mark_conversation_read
CREATE OR REPLACE FUNCTION public.mark_conversation_read(p_conversation_id uuid)
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