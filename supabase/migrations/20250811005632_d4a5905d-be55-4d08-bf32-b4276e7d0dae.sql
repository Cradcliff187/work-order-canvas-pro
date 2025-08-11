
-- ================================================
-- A1–A4: Guardrails for unified_messages
-- ================================================

-- Ensure basic defaults and realtime support
ALTER TABLE public.unified_messages
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

UPDATE public.unified_messages SET id = gen_random_uuid() WHERE id IS NULL;

-- Timestamps defaults
ALTER TABLE public.unified_messages
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

UPDATE public.unified_messages SET created_at = COALESCE(created_at, now());
UPDATE public.unified_messages SET updated_at = COALESCE(updated_at, now());

-- Optional stricter nullability (safe if no nulls present)
-- Commented out sender_id to avoid blocking rare edge deletions of profiles
-- ALTER TABLE public.unified_messages
--   ALTER COLUMN sender_id SET NOT NULL;

-- Conversations FK for referential integrity (if not already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'unified_messages_conversation_id_fkey'
      AND conrelid = 'public.unified_messages'::regclass
  ) THEN
    ALTER TABLE public.unified_messages
      ADD CONSTRAINT unified_messages_conversation_id_fkey
      FOREIGN KEY (conversation_id)
      REFERENCES public.conversations(id)
      ON DELETE CASCADE;
  END IF;
END$$;

-- Touch conversation.updated_at when a new message arrives
CREATE OR REPLACE FUNCTION public.touch_conversation_on_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
    SET updated_at = COALESCE(NEW.created_at, now())
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_conversation_on_message ON public.unified_messages;
CREATE TRIGGER trg_touch_conversation_on_message
AFTER INSERT ON public.unified_messages
FOR EACH ROW EXECUTE PROCEDURE public.touch_conversation_on_message();

-- BEFORE trigger to set safe defaults on insert/update
CREATE OR REPLACE FUNCTION public.set_unified_message_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.id IS NULL THEN
    NEW.id := gen_random_uuid();
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.created_at IS NULL THEN
      NEW.created_at := now();
    END IF;
  END IF;

  -- Always bump updated_at
  NEW.updated_at := now();

  -- Auto-assign sender to current profile if missing
  IF NEW.sender_id IS NULL THEN
    NEW.sender_id := auth_profile_id_safe();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_unified_message_defaults ON public.unified_messages;
CREATE TRIGGER trg_set_unified_message_defaults
BEFORE INSERT OR UPDATE ON public.unified_messages
FOR EACH ROW EXECUTE PROCEDURE public.set_unified_message_defaults();

-- Realtime (safe if already added)
ALTER TABLE public.unified_messages REPLICA IDENTITY FULL;
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.unified_messages;
  EXCEPTION WHEN duplicate_object THEN
    -- already added, ignore
    NULL;
  END;
END$$;

-- Indexes for pagination and filters
CREATE INDEX IF NOT EXISTS idx_unified_messages_conversation_created_at
  ON public.unified_messages (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_unified_messages_sender
  ON public.unified_messages (sender_id);

-- RLS and policies
ALTER TABLE public.unified_messages ENABLE ROW LEVEL SECURITY;

-- Read: participants only
DROP POLICY IF EXISTS unified_messages_select_participants ON public.unified_messages;
CREATE POLICY unified_messages_select_participants
  ON public.unified_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.conversation_participants cp
      WHERE cp.conversation_id = unified_messages.conversation_id
        AND cp.user_id = auth_profile_id_safe()
    )
  );

-- Insert: must be a participant and the sender
DROP POLICY IF EXISTS unified_messages_insert_participants ON public.unified_messages;
CREATE POLICY unified_messages_insert_participants
  ON public.unified_messages
  FOR INSERT
  WITH CHECK (
    auth_profile_id_safe() IS NOT NULL
    AND sender_id = auth_profile_id_safe()
    AND EXISTS (
      SELECT 1
      FROM public.conversation_participants cp
      WHERE cp.conversation_id = unified_messages.conversation_id
        AND cp.user_id = auth_profile_id_safe()
    )
  );

-- Update: only own messages
DROP POLICY IF EXISTS unified_messages_update_own ON public.unified_messages;
CREATE POLICY unified_messages_update_own
  ON public.unified_messages
  FOR UPDATE
  USING (sender_id = auth_profile_id_safe())
  WITH CHECK (sender_id = auth_profile_id_safe());

-- Delete: own or admin
DROP POLICY IF EXISTS unified_messages_delete_own_or_admin ON public.unified_messages;
CREATE POLICY unified_messages_delete_own_or_admin
  ON public.unified_messages
  FOR DELETE
  USING (sender_id = auth_profile_id_safe() OR jwt_is_admin());



-- ================================================
-- B5–B6: RPCs + notification targeting
-- ================================================

-- Conversations overview RPC used by frontend (hooks)
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
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT auth_profile_id_safe() AS uid
  ),
  my_participations AS (
    SELECT c.*
    FROM public.conversations c
    JOIN public.conversation_participants cp
      ON cp.conversation_id = c.id
    JOIN me ON cp.user_id = me.uid
  ),
  last_msg AS (
    SELECT um.conversation_id,
           um.message AS last_message,
           um.created_at AS last_message_at
    FROM (
      SELECT um.*,
             ROW_NUMBER() OVER (PARTITION BY um.conversation_id ORDER BY um.created_at DESC, um.id DESC) AS rn
      FROM public.unified_messages um
    ) um
    WHERE um.rn = 1
  ),
  unread AS (
    SELECT cp.conversation_id,
           COUNT(*)::int AS unread_count
    FROM me
    JOIN public.conversation_participants cp
      ON cp.user_id = me.uid
    JOIN public.unified_messages um
      ON um.conversation_id = cp.conversation_id
    WHERE um.sender_id IS DISTINCT FROM me.uid
      AND um.created_at > COALESCE(cp.last_read_at, 'epoch'::timestamptz)
    GROUP BY cp.conversation_id
  ),
  direct_other AS (
    SELECT cp.conversation_id,
           MAX(CASE WHEN cp.user_id <> (SELECT uid FROM me) THEN cp.user_id END) AS other_user_id
    FROM public.conversation_participants cp
    GROUP BY cp.conversation_id
  )
  SELECT
    mp.id AS conversation_id,
    mp.title,
    mp.conversation_type,
    lm.last_message,
    lm.last_message_at,
    COALESCE(u.unread_count, 0) AS unread_count,
    mp.updated_at,
    CASE WHEN mp.conversation_type = 'direct'::conversation_type THEN do.other_user_id ELSE NULL END AS other_user_id,
    mp.organization_id
  FROM my_participations mp
  LEFT JOIN last_msg lm ON lm.conversation_id = mp.id
  LEFT JOIN unread u     ON u.conversation_id  = mp.id
  LEFT JOIN direct_other do ON do.conversation_id = mp.id
  ORDER BY COALESCE(lm.last_message_at, mp.updated_at) DESC, mp.created_at DESC
$$;

-- Mark conversation read RPC used by frontend (hooks)
CREATE OR REPLACE FUNCTION public.mark_conversation_read(p_conversation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid;
  updated_count int := 0;
BEGIN
  SELECT auth_profile_id_safe() INTO me;
  IF me IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  UPDATE public.conversation_participants
  SET last_read_at = now()
  WHERE conversation_id = p_conversation_id
    AND user_id = me;

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  RETURN jsonb_build_object('success', true, 'updated', updated_count);
END;
$$;

-- Create (or reuse) a direct conversation between current user and another profile
CREATE OR REPLACE FUNCTION public.create_direct_conversation(p_other_user_id uuid)
RETURNS TABLE(conversation_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid;
  ua uuid;
  ub uuid;
  existing uuid;
  conv_id uuid;
BEGIN
  SELECT auth_profile_id_safe() INTO me;
  IF me IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF p_other_user_id IS NULL OR p_other_user_id = me THEN
    RAISE EXCEPTION 'invalid_other_user';
  END IF;

  IF NOT public.validate_direct_conversation_participants(me, p_other_user_id) THEN
    RAISE EXCEPTION 'Invalid participant combination for direct conversation';
  END IF;

  ua := LEAST(me, p_other_user_id);
  ub := GREATEST(me, p_other_user_id);

  SELECT dp.conversation_id INTO existing
  FROM public.direct_pairs dp
  WHERE dp.user_a = ua AND dp.user_b = ub
  LIMIT 1;

  IF existing IS NOT NULL THEN
    conversation_id := existing;
    RETURN NEXT;
    RETURN;
  END IF;

  conv_id := gen_random_uuid();
  INSERT INTO public.conversations (id, conversation_type, created_by, title, is_internal, updated_at)
  VALUES (conv_id, 'direct'::conversation_type, me, NULL, false, now());

  INSERT INTO public.conversation_participants (conversation_id, user_id, joined_at)
  VALUES (conv_id, me, now()), (conv_id, p_other_user_id, now());

  INSERT INTO public.direct_pairs (conversation_id, user_a, user_b)
  VALUES (conv_id, ua, ub);

  conversation_id := conv_id;
  RETURN NEXT;
END;
$$;



-- ================================================
-- C7: Narrow selects + pagination (RPC)
-- ================================================
CREATE OR REPLACE FUNCTION public.get_conversation_messages(
  p_conversation_id uuid,
  p_limit int DEFAULT 50,
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
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT um.id, um.message, um.sender_id, um.created_at, um.attachment_ids
  FROM public.unified_messages um
  WHERE um.conversation_id = p_conversation_id
    AND um.created_at < p_before
    AND EXISTS (
      SELECT 1
      FROM public.conversation_participants cp
      WHERE cp.conversation_id = p_conversation_id
        AND cp.user_id = auth_profile_id_safe()
    )
  ORDER BY um.created_at DESC, um.id DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 200)
$$;



-- ================================================
-- E10: Attachments v2 (DB scaffolding + Storage policies)
-- ================================================

-- Message attachments table
CREATE TABLE IF NOT EXISTS public.message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.unified_messages(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text,
  file_type text,
  file_size integer,
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;

-- Participants can read attachments of conversations they are in
DROP POLICY IF EXISTS msg_att_select ON public.message_attachments;
CREATE POLICY msg_att_select
  ON public.message_attachments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.unified_messages um
      JOIN public.conversation_participants cp
        ON cp.conversation_id = um.conversation_id
      WHERE um.id = message_attachments.message_id
        AND cp.user_id = auth_profile_id_safe()
    )
  );

-- Only participants can insert; restrict to uploader = current user
DROP POLICY IF EXISTS msg_att_insert ON public.message_attachments;
CREATE POLICY msg_att_insert
  ON public.message_attachments
  FOR INSERT
  WITH CHECK (
    uploaded_by = auth_profile_id_safe()
    AND EXISTS (
      SELECT 1
      FROM public.unified_messages um
      JOIN public.conversation_participants cp
        ON cp.conversation_id = um.conversation_id
      WHERE um.id = message_attachments.message_id
        AND cp.user_id = auth_profile_id_safe()
    )
  );

-- Sender/uploader can update/delete; admins also allowed
DROP POLICY IF EXISTS msg_att_update ON public.message_attachments;
CREATE POLICY msg_att_update
  ON public.message_attachments
  FOR UPDATE
  USING (uploaded_by = auth_profile_id_safe() OR jwt_is_admin())
  WITH CHECK (uploaded_by = auth_profile_id_safe() OR jwt_is_admin());

DROP POLICY IF EXISTS msg_att_delete ON public.message_attachments;
CREATE POLICY msg_att_delete
  ON public.message_attachments
  FOR DELETE
  USING (uploaded_by = auth_profile_id_safe() OR jwt_is_admin());

CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id
  ON public.message_attachments (message_id);

-- Private Storage bucket for message attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-attachments', 'message-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Helper functions to authorize storage object access by path:
-- Expected path convention: messages/{conversation_id}/{message_id}/{filename.ext}
CREATE OR REPLACE FUNCTION public.can_access_message_object(object_path text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parts text[];
  conv_text text;
  msg_text text;
  ok boolean := false;
BEGIN
  parts := string_to_array(object_path, '/');
  IF array_length(parts, 1) >= 4 AND parts[1] = 'messages' THEN
    conv_text := parts[2];
    msg_text  := parts[3];
    IF conv_text ~ '^[0-9a-fA-F-]{36}$' AND msg_text ~ '^[0-9a-fA-F-]{36}$' THEN
      SELECT EXISTS (
        SELECT 1
        FROM public.unified_messages um
        JOIN public.conversation_participants cp
          ON cp.conversation_id = um.conversation_id
        WHERE um.id = msg_text::uuid
          AND um.conversation_id = conv_text::uuid
          AND cp.user_id = auth_profile_id_safe()
      ) INTO ok;
      RETURN COALESCE(ok, false);
    END IF;
  END IF;
  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_upload_message_object(object_path text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parts text[];
  conv_text text;
  msg_text text;
  ok boolean := false;
BEGIN
  parts := string_to_array(object_path, '/');
  IF array_length(parts, 1) >= 4 AND parts[1] = 'messages' THEN
    conv_text := parts[2];
    msg_text  := parts[3];
    IF conv_text ~ '^[0-9a-fA-F-]{36}$' AND msg_text ~ '^[0-9a-fA-F-]{36}$' THEN
      SELECT EXISTS (
        SELECT 1
        FROM public.unified_messages um
        WHERE um.id = msg_text::uuid
          AND um.conversation_id = conv_text::uuid
          AND um.sender_id = auth_profile_id_safe()
      ) INTO ok;
      RETURN COALESCE(ok, false);
    END IF;
  END IF;
  RETURN false;
END;
$$;

-- Storage RLS for the message-attachments bucket
-- Allow participants to read, senders to write/delete, admins override
DROP POLICY IF EXISTS msg_storage_select ON storage.objects;
CREATE POLICY msg_storage_select
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'message-attachments'
    AND public.can_access_message_object(name)
  );

DROP POLICY IF EXISTS msg_storage_insert ON storage.objects;
CREATE POLICY msg_storage_insert
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'message-attachments'
    AND public.can_upload_message_object(name)
  );

DROP POLICY IF EXISTS msg_storage_update ON storage.objects;
CREATE POLICY msg_storage_update
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'message-attachments'
    AND (public.can_upload_message_object(name) OR jwt_is_admin())
  )
  WITH CHECK (
    bucket_id = 'message-attachments'
    AND (public.can_upload_message_object(name) OR jwt_is_admin())
  );

DROP POLICY IF EXISTS msg_storage_delete ON storage.objects;
CREATE POLICY msg_storage_delete
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'message-attachments'
    AND (public.can_upload_message_object(name) OR jwt_is_admin())
  );
