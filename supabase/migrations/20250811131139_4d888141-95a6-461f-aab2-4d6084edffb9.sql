
-- Fix: enforce_direct_participant_constraints should not use max(uuid)
CREATE OR REPLACE FUNCTION public.enforce_direct_participant_constraints()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_type conversation_type;
  v_count integer;
  v_existing_user uuid;
  user_a uuid;
  user_b uuid;
BEGIN
  SELECT conversation_type INTO v_type
  FROM public.conversations
  WHERE id = NEW.conversation_id;

  IF v_type = 'direct'::conversation_type THEN
    -- No duplicate participant allowed
    IF EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = NEW.conversation_id AND user_id = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'User already a participant in this direct conversation';
    END IF;

    -- Current participant count
    SELECT COUNT(*) INTO v_count
    FROM public.conversation_participants
    WHERE conversation_id = NEW.conversation_id;

    -- Max 2 participants
    IF v_count >= 2 THEN
      RAISE EXCEPTION 'Direct conversations can only have two participants';
    END IF;

    -- On second participant, block self-DM and validate pair
    IF v_count = 1 THEN
      -- Get the existing participant without using max(uuid)
      SELECT user_id INTO v_existing_user
      FROM public.conversation_participants
      WHERE conversation_id = NEW.conversation_id
      ORDER BY joined_at ASC
      LIMIT 1;

      IF NEW.user_id = v_existing_user THEN
        RAISE EXCEPTION 'Self-DM is not allowed';
      END IF;

      -- Prevent duplicate direct conversations for the same pair
      user_a := LEAST(NEW.user_id, v_existing_user);
      user_b := GREATEST(NEW.user_id, v_existing_user);

      IF EXISTS (
        SELECT 1 FROM public.direct_pairs dp
        WHERE dp.user_a = user_a AND dp.user_b = user_b
      ) THEN
        RAISE EXCEPTION 'A direct conversation between these users already exists';
      END IF;

      -- Validate cross-org rules
      IF NOT public.validate_direct_conversation_participants(NEW.user_id, v_existing_user) THEN
        RAISE EXCEPTION 'Invalid participant combination for direct conversation';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure realtime events flow for DMs and unread counters
DO $$
BEGIN
  -- Capture full row images on updates (harmless if already set)
  BEGIN
    EXECUTE 'ALTER TABLE public.work_order_messages REPLICA IDENTITY FULL';
  EXCEPTION WHEN others THEN
    NULL;
  END;

  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    -- Add work_order_messages to realtime publication
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='work_order_messages'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.work_order_messages';
    END IF;

    -- Add message_read_receipts (useful for unread updates)
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='message_read_receipts'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.message_read_receipts';
    END IF;
  END IF;
END$$;
