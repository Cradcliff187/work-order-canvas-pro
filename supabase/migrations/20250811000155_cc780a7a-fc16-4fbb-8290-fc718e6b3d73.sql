
-- 1) Allow conversation messages by relaxing NOT NULL
ALTER TABLE public.work_order_messages
  ALTER COLUMN work_order_id DROP NOT NULL;

-- 2) RPC: Create or reuse a direct conversation with another user
CREATE OR REPLACE FUNCTION public.create_direct_conversation(p_other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_me uuid;
  v_user_a uuid;
  v_user_b uuid;
  v_existing_conv uuid;
  v_conv_id uuid;
BEGIN
  SELECT auth_profile_id_safe() INTO v_me;
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_other_user_id IS NULL OR p_other_user_id = v_me THEN
    RAISE EXCEPTION 'Invalid other user';
  END IF;

  -- Validate participants by org rules
  IF NOT public.validate_direct_conversation_participants(v_me, p_other_user_id) THEN
    RAISE EXCEPTION 'Invalid participant combination for direct conversation';
  END IF;

  -- Canonical pair ordering
  v_user_a := LEAST(v_me, p_other_user_id);
  v_user_b := GREATEST(v_me, p_other_user_id);

  -- Reuse existing pair if present
  SELECT conversation_id
  INTO v_existing_conv
  FROM public.direct_pairs
  WHERE user_a = v_user_a AND user_b = v_user_b;

  IF v_existing_conv IS NOT NULL THEN
    RETURN v_existing_conv;
  END IF;

  -- Create conversation
  INSERT INTO public.conversations (conversation_type, title, organization_id, is_internal, created_by)
  VALUES ('direct', NULL, NULL, false, v_me)
  RETURNING id INTO v_conv_id;

  -- Add both participants (triggers will validate + maintain direct_pairs)
  INSERT INTO public.conversation_participants (conversation_id, user_id) VALUES
    (v_conv_id, v_me),
    (v_conv_id, p_other_user_id);

  RETURN v_conv_id;
END;
$$;

-- 3) RPC: List permissible DM candidates for current user
CREATE OR REPLACE FUNCTION public.list_dm_candidates()
RETURNS TABLE (
  id uuid,
  email text,
  first_name text,
  last_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_me uuid;
  has_internal boolean;
  has_partner boolean;
  has_sub boolean;
BEGIN
  SELECT auth_profile_id_safe() INTO v_me;
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = v_me AND o.organization_type = 'internal'
  ) INTO has_internal;

  SELECT EXISTS (
    SELECT 1 FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = v_me AND o.organization_type = 'partner'
  ) INTO has_partner;

  SELECT EXISTS (
    SELECT 1 FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = v_me AND o.organization_type = 'subcontractor'
  ) INTO has_sub;

  -- Internal: all active except self
  IF has_internal THEN
    RETURN QUERY
    SELECT p.id, p.email, p.first_name, p.last_name
    FROM profiles p
    WHERE p.is_active = true
      AND p.id <> v_me
    ORDER BY p.first_name, p.last_name
    LIMIT 500;
    RETURN;
  END IF;

  -- Non-internal: union of allowed sets
  RETURN QUERY
  WITH
  my_partner_orgs AS (
    SELECT organization_id
    FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = v_me AND o.organization_type = 'partner'
  ),
  my_sub_orgs AS (
    SELECT organization_id
    FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = v_me AND o.organization_type = 'subcontractor'
  ),
  internal_users AS (
    SELECT p.id, p.email, p.first_name, p.last_name
    FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    JOIN profiles p ON p.id = om.user_id
    WHERE o.organization_type = 'internal' AND p.is_active = true AND p.id <> v_me
  ),
  partner_same_org AS (
    SELECT DISTINCT p.id, p.email, p.first_name, p.last_name
    FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    JOIN profiles p ON p.id = om.user_id
    WHERE o.organization_type = 'partner'
      AND om.organization_id IN (SELECT organization_id FROM my_partner_orgs)
      AND p.is_active = true AND p.id <> v_me
  ),
  sub_same_org AS (
    SELECT DISTINCT p.id, p.email, p.first_name, p.last_name
    FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    JOIN profiles p ON p.id = om.user_id
    WHERE o.organization_type = 'subcontractor'
      AND om.organization_id IN (SELECT organization_id FROM my_sub_orgs)
      AND p.is_active = true AND p.id <> v_me
  )
  SELECT * FROM internal_users
  UNION
  SELECT * FROM partner_same_org
  UNION
  SELECT * FROM sub_same_org
  ORDER BY first_name, last_name
  LIMIT 500;
END;
$$;

-- 4) RPC: Conversations overview for current user with unread counts
CREATE OR REPLACE FUNCTION public.get_conversations_overview()
RETURNS TABLE (
  conversation_id uuid,
  conversation_type conversation_type,
  title text,
  last_message_at timestamptz,
  unread_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_me uuid;
BEGIN
  SELECT auth_profile_id_safe() INTO v_me;
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT c.id AS cid, c.conversation_type, c.title, cp.last_read_at
    FROM conversations c
    JOIN conversation_participants cp ON cp.conversation_id = c.id
    WHERE cp.user_id = v_me
  ),
  last_msg AS (
    SELECT wom.conversation_id, MAX(wom.created_at) AS lm_at
    FROM work_order_messages wom
    WHERE wom.conversation_id IS NOT NULL
    GROUP BY wom.conversation_id
  ),
  unread AS (
    SELECT wom.conversation_id, COUNT(*) AS cnt
    FROM work_order_messages wom
    JOIN conversation_participants cp ON cp.conversation_id = wom.conversation_id
    WHERE cp.user_id = v_me
      AND wom.conversation_id IS NOT NULL
      AND (cp.last_read_at IS NULL OR wom.created_at > cp.last_read_at)
    GROUP BY wom.conversation_id
  )
  SELECT
    b.cid AS conversation_id,
    b.conversation_type,
    b.title,
    COALESCE(lm.lm_at, b.last_read_at) AS last_message_at,
    COALESCE(u.cnt, 0) AS unread_count
  FROM base b
  LEFT JOIN last_msg lm ON lm.conversation_id = b.cid
  LEFT JOIN unread u ON u.conversation_id = b.cid
  ORDER BY COALESCE(lm.lm_at, b.last_read_at) DESC NULLS LAST;
END;
$$;

-- 5) RPC: Mark a conversation as read for the current user
CREATE OR REPLACE FUNCTION public.mark_conversation_read(p_conversation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_me uuid;
  updated integer;
BEGIN
  SELECT auth_profile_id_safe() INTO v_me;
  IF v_me IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  UPDATE conversation_participants
  SET last_read_at = NOW()
  WHERE conversation_id = p_conversation_id
    AND user_id = v_me;

  GET DIAGNOSTICS updated = ROW_COUNT;

  IF updated = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not a participant');
  END IF;

  RETURN jsonb_build_object('success', true, 'conversation_id', p_conversation_id);
END;
$$;

-- 6) Update queue_message_notifications to handle conversation messages distinctly
CREATE OR REPLACE FUNCTION public.queue_message_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_work_order RECORD;
  v_sender RECORD;
  v_message_preview TEXT;
  v_dashboard_url TEXT;
  v_context_data jsonb;
  v_conversation RECORD;
  v_template text;
  v_record_type text;
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

    v_template := 'work_order_new_message';
    v_record_type := 'work_order_message';

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

    v_template := 'conversation_new_message';
    v_record_type := 'conversation_message';
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
    v_template,
    NEW.id,
    v_record_type,
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
END; 
$function$;

