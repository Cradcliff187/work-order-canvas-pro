-- Full migration retry: Hybrid Messaging Schema with restricted direct DMs
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'conversation_type') THEN
    CREATE TYPE public.conversation_type AS ENUM ('direct','organization','announcement');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_type public.conversation_type NOT NULL,
  title text,
  organization_id uuid REFERENCES public.organizations(id),
  is_internal boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_org ON public.conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversations_type ON public.conversations(conversation_type);
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.conversation_participants (
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_read_at timestamptz,
  PRIMARY KEY (conversation_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_conv_participants_user ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_participants_conv ON public.conversation_participants(conversation_id);
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='work_order_messages' AND column_name='conversation_id'
  ) THEN
    ALTER TABLE public.work_order_messages 
      ADD COLUMN conversation_id uuid REFERENCES public.conversations(id);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'work_order_messages_single_context'
  ) THEN
    ALTER TABLE public.work_order_messages
      ADD CONSTRAINT work_order_messages_single_context CHECK (
        (work_order_id IS NOT NULL AND conversation_id IS NULL) OR
        (work_order_id IS NULL AND conversation_id IS NOT NULL)
      );
  END IF;
END$$;

CREATE OR REPLACE FUNCTION public.validate_direct_conversation_participants(user1_id uuid, user2_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user1_org_type public.organization_type;
  user2_org_type public.organization_type;
  user1_org_id uuid;
  user2_org_id uuid;
BEGIN
  SELECT o.organization_type, o.id
  INTO user1_org_type, user1_org_id
  FROM public.organization_members om
  JOIN public.organizations o ON o.id = om.organization_id
  WHERE om.user_id = user1_id
  LIMIT 1;

  SELECT o.organization_type, o.id
  INTO user2_org_type, user2_org_id
  FROM public.organization_members om
  JOIN public.organizations o ON o.id = om.organization_id
  WHERE om.user_id = user2_id
  LIMIT 1;

  IF (user1_org_type = 'partner' AND user2_org_type = 'subcontractor') OR 
     (user1_org_type = 'subcontractor' AND user2_org_type = 'partner') THEN
    RETURN false;
  END IF;

  IF user1_org_type = 'partner' AND user2_org_type = 'partner' THEN
    RETURN user1_org_id = user2_org_id;
  END IF;

  IF user1_org_type = 'subcontractor' AND user2_org_type = 'subcontractor' THEN
    RETURN user1_org_id = user2_org_id;
  END IF;

  IF user1_org_type = 'internal' OR user2_org_type = 'internal' THEN
    RETURN true;
  END IF;

  RETURN false;
END; $$;

CREATE OR REPLACE FUNCTION public.validate_conversation_participants_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  existing_user_id uuid;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.conversations c 
    WHERE c.id = NEW.conversation_id AND c.conversation_type = 'direct'
  ) THEN
    FOR existing_user_id IN 
      SELECT user_id FROM public.conversation_participants 
      WHERE conversation_id = NEW.conversation_id
    LOOP
      IF NOT public.validate_direct_conversation_participants(NEW.user_id, existing_user_id) THEN
        RAISE EXCEPTION 'Invalid participant combination: Partners and subcontractors cannot communicate directly';
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS validate_conversation_participants ON public.conversation_participants;
CREATE TRIGGER validate_conversation_participants
BEFORE INSERT ON public.conversation_participants
FOR EACH ROW
EXECUTE FUNCTION public.validate_conversation_participants_trigger();

-- RLS policies for conversations
DROP POLICY IF EXISTS direct_conversations_visible_to_participants ON public.conversations;
CREATE POLICY direct_conversations_visible_to_participants
ON public.conversations
FOR SELECT
USING (
  conversation_type = 'direct'::public.conversation_type AND
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversations.id
      AND cp.user_id = public.auth_profile_id_safe()
  )
);

DROP POLICY IF EXISTS org_ann_conversations_visible_to_members_or_internal ON public.conversations;
CREATE POLICY org_ann_conversations_visible_to_members_or_internal
ON public.conversations
FOR SELECT
USING (
  conversation_type = ANY (ARRAY['organization'::public.conversation_type,'announcement'::public.conversation_type]) AND (
    public.has_internal_role(ARRAY['admin','manager','employee']::public.organization_role[])
    OR EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = public.auth_profile_id_safe()
        AND om.organization_id = conversations.organization_id
    )
  )
);

DROP POLICY IF EXISTS create_direct_conversations ON public.conversations;
CREATE POLICY create_direct_conversations
ON public.conversations
FOR INSERT
WITH CHECK (
  conversation_type = 'direct'::public.conversation_type AND
  created_by = public.auth_profile_id_safe()
);

DROP POLICY IF EXISTS create_org_conversations ON public.conversations;
CREATE POLICY create_org_conversations
ON public.conversations
FOR INSERT
WITH CHECK (
  conversation_type = 'organization'::public.conversation_type AND
  created_by = public.auth_profile_id_safe() AND (
    public.has_internal_role(ARRAY['admin','manager','employee']::public.organization_role[]) OR
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = public.auth_profile_id_safe()
        AND om.organization_id = conversations.organization_id
    )
  )
);

DROP POLICY IF EXISTS create_announcement_conversations ON public.conversations;
CREATE POLICY create_announcement_conversations
ON public.conversations
FOR INSERT
WITH CHECK (
  conversation_type = 'announcement'::public.conversation_type AND
  created_by = public.auth_profile_id_safe() AND
  public.has_internal_role(ARRAY['admin','manager','employee']::public.organization_role[])
);

DROP POLICY IF EXISTS update_conversations_by_creator_or_admin ON public.conversations;
CREATE POLICY update_conversations_by_creator_or_admin
ON public.conversations
FOR UPDATE
USING (created_by = public.auth_profile_id_safe() OR public.jwt_is_admin())
WITH CHECK (created_by = public.auth_profile_id_safe() OR public.jwt_is_admin());

DROP POLICY IF EXISTS delete_conversations_by_creator_or_admin ON public.conversations;
CREATE POLICY delete_conversations_by_creator_or_admin
ON public.conversations
FOR DELETE
USING (created_by = public.auth_profile_id_safe() OR public.jwt_is_admin());

-- RLS for participants
DROP POLICY IF EXISTS participants_can_view_own ON public.conversation_participants;
CREATE POLICY participants_can_view_own
ON public.conversation_participants
FOR SELECT
USING (user_id = public.auth_profile_id_safe() OR public.jwt_is_admin());

DROP POLICY IF EXISTS creator_adds_participants_with_validation ON public.conversation_participants;
CREATE POLICY creator_adds_participants_with_validation
ON public.conversation_participants
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_participants.conversation_id
      AND c.conversation_type = 'direct'::public.conversation_type
      AND c.created_by = public.auth_profile_id_safe()
  )
  AND public.validate_direct_conversation_participants(public.auth_profile_id_safe(), conversation_participants.user_id)
);

DROP POLICY IF EXISTS participant_updates_self ON public.conversation_participants;
CREATE POLICY participant_updates_self
ON public.conversation_participants
FOR UPDATE
USING (user_id = public.auth_profile_id_safe())
WITH CHECK (user_id = public.auth_profile_id_safe());

DROP POLICY IF EXISTS remove_participant_self_creator_or_admin ON public.conversation_participants;
CREATE POLICY remove_participant_self_creator_or_admin
ON public.conversation_participants
FOR DELETE
USING (
  public.jwt_is_admin() OR
  user_id = public.auth_profile_id_safe() OR
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_participants.conversation_id
      AND c.created_by = public.auth_profile_id_safe()
  )
);

-- Policies on work_order_messages for conversation context
DROP POLICY IF EXISTS select_conversation_messages ON public.work_order_messages;
CREATE POLICY select_conversation_messages
ON public.work_order_messages
FOR SELECT
USING (
  conversation_id IS NOT NULL AND (
    EXISTS (
      SELECT 1
      FROM public.conversations c
      JOIN public.conversation_participants cp ON cp.conversation_id = c.id
      WHERE c.id = work_order_messages.conversation_id
        AND c.conversation_type = 'direct'::public.conversation_type
        AND cp.user_id = public.auth_profile_id_safe()
    )
    OR
    EXISTS (
      SELECT 1
      FROM public.conversations c
      WHERE c.id = work_order_messages.conversation_id
        AND c.conversation_type = ANY (ARRAY['organization'::public.conversation_type,'announcement'::public.conversation_type])
        AND (
          public.has_internal_role(ARRAY['admin','manager','employee']::public.organization_role[]) OR
          EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.user_id = public.auth_profile_id_safe()
              AND om.organization_id = c.organization_id
          )
        )
    )
  )
);

DROP POLICY IF EXISTS insert_conversation_messages ON public.work_order_messages;
CREATE POLICY insert_conversation_messages
ON public.work_order_messages
FOR INSERT
WITH CHECK (
  conversation_id IS NOT NULL AND sender_id = public.auth_profile_id_safe() AND (
    EXISTS (
      SELECT 1
      FROM public.conversations c
      JOIN public.conversation_participants cp ON cp.conversation_id = c.id
      WHERE c.id = work_order_messages.conversation_id
        AND c.conversation_type = 'direct'::public.conversation_type
        AND cp.user_id = public.auth_profile_id_safe()
    )
    OR
    EXISTS (
      SELECT 1
      FROM public.conversations c
      WHERE c.id = work_order_messages.conversation_id
        AND c.conversation_type = 'organization'::public.conversation_type
        AND (
          public.has_internal_role(ARRAY['admin','manager','employee']::public.organization_role[]) OR
          EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.user_id = public.auth_profile_id_safe()
              AND om.organization_id = c.organization_id
          )
        )
    )
    OR
    EXISTS (
      SELECT 1
      FROM public.conversations c
      WHERE c.id = work_order_messages.conversation_id
        AND c.conversation_type = 'announcement'::public.conversation_type
        AND public.has_internal_role(ARRAY['admin','manager','employee']::public.organization_role[])
    )
  )
);

-- Unified view
DROP VIEW IF EXISTS public.unified_messages;
CREATE VIEW public.unified_messages AS
SELECT 
  m.*,
  COALESCE(wo.organization_id, c.organization_id) AS context_organization_id,
  CASE 
    WHEN m.work_order_id IS NOT NULL THEN 'work_order'
    WHEN m.conversation_id IS NOT NULL THEN 'conversation'
  END AS message_context,
  CASE
    WHEN c.conversation_type IS NOT NULL THEN c.conversation_type::text
    WHEN m.work_order_id IS NOT NULL THEN 'work_order'
  END AS context_type
FROM public.work_order_messages m
LEFT JOIN public.work_orders wo ON wo.id = m.work_order_id
LEFT JOIN public.conversations c ON c.id = m.conversation_id;

-- Extend notification function
CREATE OR REPLACE FUNCTION public.queue_message_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_work_order RECORD;
  v_sender RECORD;
  v_message_preview TEXT;
  v_dashboard_url TEXT;
  v_context_data jsonb;
  v_conversation RECORD;
BEGIN
  SELECT COALESCE(
    (SELECT setting_value FROM system_settings WHERE setting_key = 'dashboard_url'),
    'https://workorderportal.lovable.app'
  ) INTO v_dashboard_url;

  SELECT 
    p.id,
    p.first_name,
    p.last_name,
    p.email,
    COALESCE(o.name, 'Internal Team') as org_name
  INTO v_sender
  FROM profiles p
  LEFT JOIN organization_members om ON p.id = om.user_id
  LEFT JOIN organizations o ON om.organization_id = o.id
  WHERE p.id = NEW.sender_id
  LIMIT 1;

  v_message_preview := LEFT(NEW.message, 200);
  IF LENGTH(NEW.message) > 200 THEN
    v_message_preview := v_message_preview || '...';
  END IF;

  IF NEW.work_order_id IS NOT NULL THEN
    SELECT 
      wo.id,
      wo.work_order_number,
      wo.title,
      wo.organization_id,
      o.name as partner_org_name
    INTO v_work_order
    FROM work_orders wo
    JOIN organizations o ON wo.organization_id = o.id
    WHERE wo.id = NEW.work_order_id;

    v_context_data := jsonb_build_object(
      'message_id', NEW.id,
      'is_internal', NEW.is_internal,
      'sender_id', NEW.sender_id,
      'sender_name', CONCAT(v_sender.first_name, ' ', v_sender.last_name),
      'sender_organization', v_sender.org_name,
      'sender_email', v_sender.email,
      'work_order_id', v_work_order.id,
      'work_order_number', v_work_order.work_order_number,
      'work_order_title', v_work_order.title,
      'partner_organization_id', v_work_order.organization_id,
      'partner_organization_name', v_work_order.partner_org_name,
      'message_preview', v_message_preview,
      'message_full_length', LENGTH(NEW.message),
      'dashboard_url', v_dashboard_url
    );
  ELSIF NEW.conversation_id IS NOT NULL THEN
    SELECT 
      c.id,
      c.conversation_type,
      c.title,
      c.organization_id
    INTO v_conversation
    FROM conversations c
    WHERE c.id = NEW.conversation_id;

    v_context_data := jsonb_build_object(
      'message_id', NEW.id,
      'sender_id', NEW.sender_id,
      'sender_name', CONCAT(v_sender.first_name, ' ', v_sender.last_name),
      'sender_organization', v_sender.org_name,
      'sender_email', v_sender.email,
      'conversation_id', v_conversation.id,
      'conversation_type', v_conversation.conversation_type,
      'conversation_title', v_conversation.title,
      'organization_id', v_conversation.organization_id,
      'message_preview', v_message_preview,
      'message_full_length', LENGTH(NEW.message),
      'dashboard_url', v_dashboard_url
    );
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO email_queue (
    template_name,
    record_id,
    record_type,
    context_data,
    status,
    retry_count,
    created_at
  ) VALUES (
    'work_order_new_message',
    NEW.id,
    'work_order_message',
    v_context_data,
    'pending',
    0,
    NOW()
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to queue notification for message %: %', NEW.id, SQLERRM;
    RETURN NEW;
END; $$;
