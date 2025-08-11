
-- 1) Robust RPC to create or reuse a direct conversation
CREATE OR REPLACE FUNCTION public.create_direct_conversation(p_other_user_id uuid)
RETURNS TABLE(conversation_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_me uuid;
  v_other uuid := p_other_user_id;
  v_conv_id uuid;
  v_existing uuid;
BEGIN
  -- Require auth
  SELECT public.auth_profile_id_safe() INTO v_me;
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate input
  IF v_other IS NULL OR v_other = v_me THEN
    RAISE EXCEPTION 'Invalid participant';
  END IF;

  -- Enforce org/participant rules
  IF NOT public.validate_direct_conversation_participants(v_me, v_other) THEN
    RAISE EXCEPTION 'Invalid participant combination for direct conversation';
  END IF;

  -- Prefer deterministic reuse if a prior direct conversation exists
  SELECT c.id
    INTO v_existing
  FROM public.conversations c
  JOIN public.conversation_participants a ON a.conversation_id = c.id AND a.user_id = v_me
  JOIN public.conversation_participants b ON b.conversation_id = c.id AND b.user_id = v_other
  WHERE c.conversation_type = 'direct'
  ORDER BY c.updated_at DESC
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    v_conv_id := v_existing;
  ELSE
    -- Create new direct conversation
    INSERT INTO public.conversations (conversation_type, created_by, title, is_internal, organization_id)
    VALUES ('direct', v_me, NULL, false, NULL)
    RETURNING id INTO v_conv_id;

    -- Add both participants (BEFORE/AFTER triggers will validate and maintain pairs)
    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES (v_conv_id, v_me);

    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES (v_conv_id, v_other);
  END IF;

  -- Touch updated_at for freshness
  UPDATE public.conversations
     SET updated_at = now()
   WHERE id = v_conv_id;

  RETURN QUERY SELECT v_conv_id;
END;
$function$;

-- 2) Ensure required triggers on conversation_participants exist

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_enforce_direct_participant_constraints'
  ) THEN
    CREATE TRIGGER trg_enforce_direct_participant_constraints
    BEFORE INSERT ON public.conversation_participants
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_direct_participant_constraints();
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_maintain_direct_pairs'
  ) THEN
    CREATE TRIGGER trg_maintain_direct_pairs
    AFTER INSERT ON public.conversation_participants
    FOR EACH ROW
    EXECUTE FUNCTION public.maintain_direct_pairs();
  END IF;
END$$;

-- 3) Ensure defaulting trigger for conversation messages exists (sender_id, timestamps)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_conversation_message_defaults'
  ) THEN
    CREATE TRIGGER trg_set_conversation_message_defaults
    BEFORE INSERT ON public.work_order_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.set_conversation_message_defaults();
  END IF;
END$$;

-- 4) Minimal, participant-scoped RLS for direct-conversation messages

-- Enable RLS (safe if already enabled)
ALTER TABLE public.work_order_messages ENABLE ROW LEVEL SECURITY;

-- Admins full control
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'work_order_messages' AND policyname = 'wom_admin_all'
  ) THEN
    CREATE POLICY wom_admin_all
      ON public.work_order_messages
      FOR ALL
      USING (public.jwt_is_admin())
      WITH CHECK (public.jwt_is_admin());
  END IF;
END$$;

-- Participants can read conversation messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'work_order_messages' AND policyname = 'wom_direct_select'
  ) THEN
    CREATE POLICY wom_direct_select
      ON public.work_order_messages
      FOR SELECT
      USING (
        conversation_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.conversation_participants cp
          WHERE cp.conversation_id = work_order_messages.conversation_id
            AND cp.user_id = public.auth_profile_id_safe()
        )
      );
  END IF;
END$$;

-- Participants can insert conversation messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'work_order_messages' AND policyname = 'wom_direct_insert'
  ) THEN
    CREATE POLICY wom_direct_insert
      ON public.work_order_messages
      FOR INSERT
      WITH CHECK (
        conversation_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.conversation_participants cp
          WHERE cp.conversation_id = work_order_messages.conversation_id
            AND cp.user_id = public.auth_profile_id_safe()
        )
      );
  END IF;
END$$;

-- 5) Helpful index for conversation pagination
CREATE INDEX IF NOT EXISTS idx_wom_conversation_id_created_at
  ON public.work_order_messages (conversation_id, created_at DESC);
