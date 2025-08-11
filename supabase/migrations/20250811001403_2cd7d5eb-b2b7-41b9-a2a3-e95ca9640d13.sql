-- Phase B6b – Conversation notifications targeting
-- 1) Ensure conversation_new_message email template exists
INSERT INTO public.email_templates (id, template_name, subject, html_content, text_content, is_active)
SELECT gen_random_uuid(), 'conversation_new_message',
       'New message from {{sender_name}}: {{conversation_title}}',
       '<p><strong>{{sender_name}}</strong> wrote:</p><p>{{message_preview}}</p>',
       'New message from {{sender_name}}: {{message_preview}}',
       true
WHERE NOT EXISTS (
  SELECT 1 FROM public.email_templates WHERE template_name = 'conversation_new_message'
);

-- 2) Trigger function to queue emails for conversation messages
CREATE OR REPLACE FUNCTION public.trigger_conversation_message_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_conv_type conversation_type;
  v_title text;
  v_org_id uuid;
  v_sender_name text;
BEGIN
  -- Only for conversation messages
  IF NEW.conversation_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get conversation details
  SELECT conversation_type, title, organization_id
  INTO v_conv_type, v_title, v_org_id
  FROM public.conversations
  WHERE id = NEW.conversation_id;

  -- Resolve sender display name
  SELECT trim(coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,''))
  INTO v_sender_name
  FROM public.profiles p
  WHERE p.id = NEW.sender_id;

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
      'conversation_title', v_title,
      'organization_id', v_org_id,
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
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail main transaction
  RAISE WARNING 'Conversation message email queue insertion failed for conversation %: %', NEW.conversation_id, SQLERRM;
  RETURN NEW;
END;
$function$;

-- 3) Create trigger on unified_messages INSERTs with conversation_id
DROP TRIGGER IF EXISTS trg_conversation_message_email ON public.unified_messages;
CREATE TRIGGER trg_conversation_message_email
AFTER INSERT ON public.unified_messages
FOR EACH ROW
WHEN (NEW.conversation_id IS NOT NULL)
EXECUTE FUNCTION public.trigger_conversation_message_email();