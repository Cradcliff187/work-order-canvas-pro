-- Phase B6b – Conversation notifications via existing work_order_messages trigger
-- Update the existing trigger function to also handle conversation messages (conversation_id)
CREATE OR REPLACE FUNCTION public.queue_work_order_message_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  -- Work order context
  v_partner_org_id uuid;
  v_work_order_number text;
  v_title text;
  v_store text;
  -- Conversation context
  v_conv_type conversation_type;
  v_conv_title text;
  v_conv_org_id uuid;
  v_sender_name text;
BEGIN
  -- Handle conversation messages (DMs / org / announcements) when present
  IF NEW.conversation_id IS NOT NULL THEN
    -- Get conversation details
    SELECT c.conversation_type, c.title, c.organization_id
    INTO v_conv_type, v_conv_title, v_conv_org_id
    FROM public.conversations c
    WHERE c.id = NEW.conversation_id;

    -- Resolve sender display name
    SELECT trim(coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,''))
    INTO v_sender_name
    FROM public.profiles p
    WHERE p.id = NEW.sender_id;

    -- Ensure template exists (idempotent)
    INSERT INTO public.email_templates (id, template_name, subject, html_content, text_content, is_active)
    SELECT gen_random_uuid(), 'conversation_new_message',
           'New message from {{sender_name}}: {{conversation_title}}',
           '<p><strong>{{sender_name}}</strong> wrote:</p><p>{{message_preview}}</p>',
           'New message from {{sender_name}}: {{message_preview}}',
           true
    WHERE NOT EXISTS (
      SELECT 1 FROM public.email_templates WHERE template_name = 'conversation_new_message'
    );

    -- Queue one email per participant except the sender
    INSERT INTO public.email_queue (
      template_name,
      record_id,
      record_type,
      context_data,
      status,
      created_at,
      retry_count
    )
    SELECT
      'conversation_new_message',
      NEW.conversation_id,
      'conversation',
      jsonb_build_object(
        'conversation_id', NEW.conversation_id,
        'conversation_type', v_conv_type,
        'conversation_title', v_conv_title,
        'organization_id', v_conv_org_id,
        'message', NEW.message,
        'message_preview', left(coalesce(NEW.message,''), 140),
        'sender_id', NEW.sender_id,
        'sender_name', v_sender_name,
        'created_at', NEW.created_at
      ),
      'pending',
      now(),
      0
    FROM public.conversation_participants cp
    WHERE cp.conversation_id = NEW.conversation_id
      AND cp.user_id IS NOT NULL
      AND cp.user_id <> NEW.sender_id;

    RETURN NEW;
  END IF;

  -- Handle work order messages (existing behavior)
  IF NEW.work_order_id IS NOT NULL THEN
    -- Fetch basic work order context
    SELECT wo.organization_id,
           wo.work_order_number,
           wo.title,
           COALESCE(wo.store_location, wo.city, '') 
    INTO v_partner_org_id, v_work_order_number, v_title, v_store
    FROM public.work_orders wo
    WHERE wo.id = NEW.work_order_id;

    -- Ensure template exists (idempotent)
    INSERT INTO public.email_templates (template_name, subject, html_content, text_content, is_active)
    VALUES (
      'work_order_new_message',
      'New message on Work Order {{work_order_number}}',
      '<h2>New message on Work Order {{work_order_number}}</h2>
       <p><strong>Title:</strong> {{work_order_title}}</p>
       <p><strong>Location:</strong> {{store_location}}</p>
       <p><strong>Internal:</strong> {{is_internal}}</p>
       <p><strong>Message preview:</strong> {{message_excerpt}}</p>
       <p>Open it in the portal to reply.</p>',
      'New message on work order {{work_order_number}}. Title: {{work_order_title}}. Internal: {{is_internal}}. Message preview: {{message_excerpt}}.',
      true
    )
    ON CONFLICT (template_name) DO NOTHING;

    -- Enqueue email with full context needed by the send-email Edge Function
    INSERT INTO public.email_queue (
      template_name,
      record_id,
      record_type,
      context_data,
      status,
      created_at,
      retry_count
    ) VALUES (
      'work_order_new_message',
      NEW.id,
      'work_order_message',
      jsonb_build_object(
        'work_order_id', NEW.work_order_id,
        'work_order_number', v_work_order_number,
        'work_order_title', v_title,
        'store_location', v_store,
        'is_internal', COALESCE(NEW.is_internal, false),
        'sender_id', NEW.sender_id,
        'partner_organization_id', v_partner_org_id,
        'mentioned_user_ids', COALESCE(NEW.mentioned_user_ids, '{}'::uuid[]),
        'message', COALESCE(NEW.message, ''),
        'message_excerpt', COALESCE(substring(NEW.message FROM 1 FOR 240), '')
      ),
      'pending',
      now(),
      0
    );

    RETURN NEW;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block the main transaction if queuing fails
  RAISE WARNING 'Failed to queue message email for message %, wo %, conv %: %', NEW.id, NEW.work_order_id, NEW.conversation_id, SQLERRM;
  RETURN NEW;
END;
$$;