-- Phase 1: Hybrid Messaging Schema with Restricted Direct Messaging Rules
-- Create enum for conversation types if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'conversation_type') THEN
    CREATE TYPE public.conversation_type AS ENUM ('direct','organization','announcement');
  END IF;
END$$;

-- 1) Conversations table
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

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_conversations_org ON public.conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversations_type ON public.conversations(conversation_type);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- 2) Conversation participants table
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

-- 3) Extend work_order_messages to support conversation context
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

-- Add check constraint to ensure single context
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

-- 4) Helper to validate direct DM rules
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
  -- Get org info for user1
  SELECT o.organization_type, o.id
  INTO user1_org_type, user1_org_id
  FROM public.organization_members om
  JOIN public.organizations o ON o.id = om.organization_id
  WHERE om.user_id = user1_id
  LIMIT 1;

  -- Get org info for user2
  SELECT o.organization_type, o.id
  INTO user2_org_type, user2_org_id
  FROM public.organization_members om
  JOIN public.organizations o ON o.id = om.organization_id
  WHERE om.user_id = user2_id
  LIMIT 1;

  -- RULE 1: Partners and subcontractors can NEVER talk to each other
  IF (user1_org_type = 'partner' AND user2_org_type = 'subcontractor') OR 
     (user1_org_type = 'subcontractor' AND user2_org_type = 'partner') THEN
    RETURN false;
  END IF;

  -- RULE 2: Partners can only talk to partners in SAME organization or internal users
  IF user1_org_type = 'partner' AND user2_org_type = 'partner' THEN
    RETURN user1_org_id = user2_org_id;
  END IF;

  -- RULE 3: Subcontractors can only talk to subcontractors in SAME organization or internal users
  IF user1_org_type = 'subcontractor' AND user2_org_type = 'subcontractor' THEN
    RETURN user1_org_id = user2_org_id;
  END IF;

  -- RULE 4: Internal users can talk to anyone
  IF user1_org_type = 'internal' OR user2_org_type = 'internal' THEN
    RETURN true;
  END IF;

  -- Default deny
  RETURN false;
END; $$;

-- 5) Trigger to validate participants on insert
CREATE OR REPLACE FUNCTION public.validate_conversation_participants_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  existing_user_id uuid;
BEGIN
  -- Only for direct conversations
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

-- 6) RLS policies for conversations
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
  conversation_type IN ('organization','announcement')::public.conversation_type[] AND (
    public.has_internal_role(ARRAY['admin','manager','employee']::public.organization_role[])
    OR EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = public.auth_profile_id_safe()
        AND om.organization_id = conversations.organization_id
    )
  )
);

-- Create policies to allow creating conversations according to role
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

-- Allow updates/deletes by creator or admin
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

-- 7) RLS policies for conversation_participants
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

-- 8) Policies to expose conversation messages from work_order_messages
-- Allow selecting conversation messages if user can access the conversation
DROP POLICY IF EXISTS select_conversation_messages ON public.work_order_messages;
CREATE POLICY select_conversation_messages
ON public.work_order_messages
FOR SELECT
USING (
  conversation_id IS NOT NULL AND (
    -- Direct: must be a participant
    EXISTS (
      SELECT 1
      FROM public.conversations c
      JOIN public.conversation_participants cp ON cp.conversation_id = c.id
      WHERE c.id = work_order_messages.conversation_id
        AND c.conversation_type = 'direct'::public.conversation_type
        AND cp.user_id = public.auth_profile_id_safe()
    )
    OR
    -- Organization / announcement: internal users OR members of the org
    EXISTS (
      SELECT 1
      FROM public.conversations c
      WHERE c.id = work_order_messages.conversation_id
        AND c.conversation_type IN ('organization','announcement')::public.conversation_type[]
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

-- Allow inserting conversation messages for authorized users
DROP POLICY IF EXISTS insert_conversation_messages ON public.work_order_messages;
CREATE POLICY insert_conversation_messages
ON public.work_order_messages
FOR INSERT
WITH CHECK (
  conversation_id IS NOT NULL AND sender_id = public.auth_profile_id_safe() AND (
    -- Direct: must be a participant
    EXISTS (
      SELECT 1
      FROM public.conversations c
      JOIN public.conversation_participants cp ON cp.conversation_id = c.id
      WHERE c.id = work_order_messages.conversation_id
        AND c.conversation_type = 'direct'::public.conversation_type
        AND cp.user_id = public.auth_profile_id_safe()
    )
    OR
    -- Organization: creator is internal or member of that org
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
    -- Announcements: only internal users may post
    EXISTS (
      SELECT 1
      FROM public.conversations c
      WHERE c.id = work_order_messages.conversation_id
        AND c.conversation_type = 'announcement'::public.conversation_type
        AND public.has_internal_role(ARRAY['admin','manager','employee']::public.organization_role[])
    )
  )
);

-- 9) Unified messages view for simpler querying
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

-- 10) Extend notification trigger function to include conversation messages
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
  -- Get dashboard URL from system settings
  SELECT COALESCE(
    (SELECT setting_value FROM system_settings WHERE setting_key = 'dashboard_url'),
    'https://workorderportal.lovable.app'
  ) INTO v_dashboard_url;

  -- Get sender details with organization
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

  -- Create message preview (max 200 chars)
  v_message_preview := LEFT(NEW.message, 200);
  IF LENGTH(NEW.message) > 200 THEN
    v_message_preview := v_message_preview || '...';
  END IF;

  IF NEW.work_order_id IS NOT NULL THEN
    -- Work order context (existing behavior)
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
    -- Conversation context
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
    -- No valid context; do nothing
    RETURN NEW;
  END IF;

  -- Queue notification for this message
  INSERT INTO email_queue (
    template_name,
    record_id,
    record_type,
    context_data,
    status,
    retry_count,
    created_at
  ) VALUES (
    'work_order_new_message', -- reuse existing template key; template can branch on context
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
    -- Log error but don't block message creation
    RAISE WARNING 'Failed to queue notification for message %: %', NEW.id, SQLERRM;
    RETURN NEW;
END; $$;
