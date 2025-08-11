
-- Phase B6a: Queue notifications for new work order messages

-- 1) Ensure a basic template exists for work_order_new_message (idempotent)
--    We use ON CONFLICT on template_name; assumes a unique index exists.
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

-- 2) Create trigger function to enqueue notifications on message insert
CREATE OR REPLACE FUNCTION public.queue_work_order_message_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_partner_org_id uuid;
  v_work_order_number text;
  v_title text;
  v_store text;
BEGIN
  -- Only handle messages tied to a work order; DMs/conversations will be addressed separately.
  IF NEW.work_order_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Fetch basic work order context
  SELECT wo.organization_id,
         wo.work_order_number,
         wo.title,
         COALESCE(wo.store_location, wo.city, '') 
  INTO v_partner_org_id, v_work_order_number, v_title, v_store
  FROM public.work_orders wo
  WHERE wo.id = NEW.work_order_id;

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
EXCEPTION WHEN OTHERS THEN
  -- Never block the main transaction if queuing fails
  RAISE WARNING 'Failed to queue message email for message %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- 3) Bind the trigger on insert
DROP TRIGGER IF EXISTS trg_after_insert_queue_wom_email ON public.work_order_messages;

CREATE TRIGGER trg_after_insert_queue_wom_email
AFTER INSERT ON public.work_order_messages
FOR EACH ROW
EXECUTE FUNCTION public.queue_work_order_message_email();
