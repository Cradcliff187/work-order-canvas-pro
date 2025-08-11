
-- Fix ambiguous variable names in trigger function to prevent 42702 errors
CREATE OR REPLACE FUNCTION public.enforce_direct_participant_constraints()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_type conversation_type;
  v_count integer;
  v_existing_user uuid;
  v_user_a uuid;
  v_user_b uuid;
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
      -- Deterministically get the existing participant
      SELECT user_id INTO v_existing_user
      FROM public.conversation_participants
      WHERE conversation_id = NEW.conversation_id
      ORDER BY joined_at ASC
      LIMIT 1;

      IF NEW.user_id = v_existing_user THEN
        RAISE EXCEPTION 'Self-DM is not allowed';
      END IF;

      -- Prevent duplicate direct conversations for the same pair
      v_user_a := LEAST(NEW.user_id, v_existing_user);
      v_user_b := GREATEST(NEW.user_id, v_existing_user);

      IF EXISTS (
        SELECT 1 FROM public.direct_pairs dp
        WHERE dp.user_a = v_user_a AND dp.user_b = v_user_b
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
$function$;

-- Optional hardening: make maintain_direct_pairs deterministic by ordering array_agg
CREATE OR REPLACE FUNCTION public.maintain_direct_pairs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_type conversation_type;
  v_users uuid[];
  v_count integer;
  ua uuid;
  ub uuid;
BEGIN
  SELECT conversation_type INTO v_type
  FROM public.conversations
  WHERE id = NEW.conversation_id;

  IF v_type = 'direct'::conversation_type THEN
    SELECT array_agg(user_id ORDER BY joined_at ASC), COUNT(*) INTO v_users, v_count
    FROM public.conversation_participants
    WHERE conversation_id = NEW.conversation_id;

    IF v_count = 2 THEN
      ua := LEAST(v_users[1], v_users[2]);
      ub := GREATEST(v_users[1], v_users[2]);
      INSERT INTO public.direct_pairs (conversation_id, user_a, user_b)
      VALUES (NEW.conversation_id, ua, ub)
      ON CONFLICT (user_a, user_b) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
