-- Fix enum list usage in policies by using = ANY on arrays
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
