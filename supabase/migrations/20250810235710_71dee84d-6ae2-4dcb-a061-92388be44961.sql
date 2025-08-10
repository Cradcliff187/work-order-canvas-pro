-- Phase A: DB guardrails and integrity for conversations and messages
-- 1) Helper: get all org IDs for a user by organization type
CREATE OR REPLACE FUNCTION public.get_user_org_ids_by_type(p_profile_id uuid, p_type public.organization_type)
RETURNS uuid[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  org_ids uuid[];
BEGIN
  SELECT array_agg(om.organization_id)
  INTO org_ids
  FROM public.organization_members om
  JOIN public.organizations o ON o.id = om.organization_id
  WHERE om.user_id = p_profile_id
    AND o.organization_type = p_type
    AND o.is_active = true;

  RETURN COALESCE(org_ids, ARRAY[]::uuid[]);
END;
$$;

-- 2) Robust participant validation for direct conversations with multi-membership support
CREATE OR REPLACE FUNCTION public.validate_direct_conversation_participants(user1_id uuid, user2_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  user1_is_internal boolean;
  user2_is_internal boolean;
  p1_partner uuid[];
  p2_partner uuid[];
  s1_sub uuid[];
  s2_sub uuid[];
  has_partner_overlap boolean := false;
  has_sub_overlap boolean := false;
BEGIN
  -- Quick allow: if either side is in an internal org, allow
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members om
    JOIN public.organizations o ON o.id = om.organization_id
    WHERE om.user_id = user1_id AND o.organization_type = 'internal'
  ) INTO user1_is_internal;

  SELECT EXISTS (
    SELECT 1 FROM public.organization_members om
    JOIN public.organizations o ON o.id = om.organization_id
    WHERE om.user_id = user2_id AND o.organization_type = 'internal'
  ) INTO user2_is_internal;

  IF COALESCE(user1_is_internal, false) OR COALESCE(user2_is_internal, false) THEN
    RETURN true;
  END IF;

  -- Collect memberships by type
  p1_partner := public.get_user_org_ids_by_type(user1_id, 'partner');
  p2_partner := public.get_user_org_ids_by_type(user2_id, 'partner');
  s1_sub := public.get_user_org_ids_by_type(user1_id, 'subcontractor');
  s2_sub := public.get_user_org_ids_by_type(user2_id, 'subcontractor');

  -- Check partner-partner overlap
  has_partner_overlap := EXISTS (
    SELECT 1 FROM unnest(p1_partner) a
    JOIN unnest(p2_partner) b ON a = b
  );

  -- Check subcontractor-subcontractor overlap
  has_sub_overlap := EXISTS (
    SELECT 1 FROM unnest(s1_sub) a
    JOIN unnest(s2_sub) b ON a = b
  );

  -- Partners and subcontractors should never DM each other; only allow if there's
  -- same-type overlap (partner-partner or sub-sub). Cross-type implies no overlap in same type.
  IF has_partner_overlap OR has_sub_overlap THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- 3) CHECK constraints to enforce context correctness
-- 3a) Conversations: organization_id rules per type
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'conv_ck_direct_org_null'
  ) THEN
    ALTER TABLE public.conversations
    ADD CONSTRAINT conv_ck_direct_org_null
    CHECK ((conversation_type != 'direct'::conversation_type) OR organization_id IS NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'conv_ck_org_required'
  ) THEN
    ALTER TABLE public.conversations
    ADD CONSTRAINT conv_ck_org_required
    CHECK ((conversation_type != ALL (ARRAY['organization'::conversation_type,'announcement'::conversation_type])) OR organization_id IS NOT NULL);
  END IF;
END $$;

-- 3b) Work order messages: single-context enforcement
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wom_ck_single_context'
  ) THEN
    ALTER TABLE public.work_order_messages
    ADD CONSTRAINT wom_ck_single_context
    CHECK (
      (work_order_id IS NOT NULL AND conversation_id IS NULL)
      OR (work_order_id IS NULL AND conversation_id IS NOT NULL)
    );
  END IF;
END $$;

-- 4) Participants uniqueness index
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'idx_conversation_participants_unique' AND n.nspname = 'public'
  ) THEN
    CREATE UNIQUE INDEX idx_conversation_participants_unique
      ON public.conversation_participants (conversation_id, user_id);
  END IF;
END $$;

-- 5) Enforce direct conversation participant limits and validate on insert
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

    -- Current participant count and the existing participant (if any)
    SELECT COUNT(*), max(user_id) INTO v_count, v_existing_user
    FROM public.conversation_participants
    WHERE conversation_id = NEW.conversation_id;

    -- Max 2 participants
    IF v_count >= 2 THEN
      RAISE EXCEPTION 'Direct conversations can only have two participants';
    END IF;

    -- On second participant, block self-DM and validate pair
    IF v_count = 1 THEN
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

      IF NOT public.validate_direct_conversation_participants(NEW.user_id, v_existing_user) THEN
        RAISE EXCEPTION 'Invalid participant combination for direct conversation';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_before_insert_enforce_direct_constraints'
  ) THEN
    CREATE TRIGGER trg_before_insert_enforce_direct_constraints
    BEFORE INSERT ON public.conversation_participants
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_direct_participant_constraints();
  END IF;
END $$;

-- 6) Direct pairs mapping to enforce uniqueness across conversations
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'direct_pairs'
  ) THEN
    CREATE TABLE public.direct_pairs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
      user_a uuid NOT NULL,
      user_b uuid NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT direct_pairs_user_order CHECK (user_a < user_b),
      CONSTRAINT direct_pairs_conversation_unique UNIQUE (conversation_id),
      CONSTRAINT direct_pairs_user_pair_unique UNIQUE (user_a, user_b)
    );
  END IF;
END $$;

-- Enable RLS and policies for direct_pairs (admins manage; system can insert)
DO $$ BEGIN
  PERFORM 1 FROM pg_tables WHERE schemaname='public' AND tablename='direct_pairs';
  IF FOUND THEN
    EXECUTE 'ALTER TABLE public.direct_pairs ENABLE ROW LEVEL SECURITY';
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='direct_pairs' AND policyname='admins_can_manage_direct_pairs'
    ) THEN
      CREATE POLICY "admins_can_manage_direct_pairs" ON public.direct_pairs
      FOR ALL USING (jwt_is_admin()) WITH CHECK (jwt_is_admin());
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='direct_pairs' AND policyname='system_can_insert_direct_pairs'
    ) THEN
      CREATE POLICY "system_can_insert_direct_pairs" ON public.direct_pairs
      FOR INSERT WITH CHECK (true);
    END IF;
  END IF;
END $$;

-- 7) Maintain direct_pairs after participants are added (once a pair is complete)
CREATE OR REPLACE FUNCTION public.maintain_direct_pairs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
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
    SELECT array_agg(user_id), COUNT(*) INTO v_users, v_count
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
$$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_after_insert_maintain_direct_pairs'
  ) THEN
    CREATE TRIGGER trg_after_insert_maintain_direct_pairs
    AFTER INSERT ON public.conversation_participants
    FOR EACH ROW
    EXECUTE FUNCTION public.maintain_direct_pairs();
  END IF;
END $$;

-- 8) Performance indexes
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'idx_conversations_type' AND n.nspname = 'public'
  ) THEN
    CREATE INDEX idx_conversations_type ON public.conversations (conversation_type);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'idx_conversations_org' AND n.nspname = 'public'
  ) THEN
    CREATE INDEX idx_conversations_org ON public.conversations (organization_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'idx_conversations_updated_at' AND n.nspname = 'public'
  ) THEN
    CREATE INDEX idx_conversations_updated_at ON public.conversations (updated_at DESC);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'idx_conv_participants_user' AND n.nspname = 'public'
  ) THEN
    CREATE INDEX idx_conv_participants_user ON public.conversation_participants (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'idx_wom_conversation_created' AND n.nspname = 'public'
  ) THEN
    CREATE INDEX idx_wom_conversation_created ON public.work_order_messages (conversation_id, created_at DESC);
  END IF;
END $$;

-- 9) Realtime setup
DO $$ BEGIN
  -- Ensure full row data for updates on work_order_messages
  BEGIN
    EXECUTE 'ALTER TABLE public.work_order_messages REPLICA IDENTITY FULL';
  EXCEPTION WHEN others THEN
    -- ignore
    NULL;
  END;

  -- Ensure conversations and conversation_participants are in supabase_realtime publication
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='conversations'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='conversation_participants'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants';
    END IF;
  END IF;
END $$;