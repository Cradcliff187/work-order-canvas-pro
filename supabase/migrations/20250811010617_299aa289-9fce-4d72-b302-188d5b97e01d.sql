-- Re-run without indexing the view

-- 1) Efficient pagination RPC for conversation messages
CREATE OR REPLACE FUNCTION public.get_conversation_messages(
  p_conversation_id uuid,
  p_limit integer DEFAULT 50,
  p_before timestamptz DEFAULT now()
)
RETURNS TABLE (
  id uuid,
  message text,
  sender_id uuid,
  created_at timestamptz,
  attachment_ids uuid[]
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT m.id,
         m.message,
         m.sender_id,
         m.created_at,
         m.attachment_ids
  FROM public.unified_messages m
  WHERE m.conversation_id = p_conversation_id
    AND m.created_at < p_before
  ORDER BY m.created_at DESC
  LIMIT LEAST(p_limit, 200);
$$;

-- 2) Conversations overview RPC (fix bigint -> integer mismatch for unread_count)
CREATE OR REPLACE FUNCTION public.get_conversations_overview()
RETURNS TABLE (
  conversation_id uuid,
  title text,
  conversation_type conversation_type,
  last_message text,
  last_message_at timestamptz,
  unread_count integer,
  updated_at timestamptz,
  other_user_id uuid,
  organization_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_profile uuid;
BEGIN
  SELECT auth_profile_id_safe() INTO v_profile;

  RETURN QUERY
  WITH base AS (
    SELECT c.id AS conversation_id,
           c.title,
           c.conversation_type,
           c.organization_id,
           c.updated_at
    FROM conversations c
    WHERE 
      -- Direct: current user participates
      (c.conversation_type = 'direct' AND EXISTS (
        SELECT 1 FROM conversation_participants cp
        WHERE cp.conversation_id = c.id AND cp.user_id = v_profile
      ))
      OR
      -- Organization/announcement: user is member of org or has internal role
      (c.conversation_type IN ('organization','announcement') AND (
        has_internal_role(ARRAY['admin','manager','employee']::organization_role[]) OR
        EXISTS (
          SELECT 1 FROM organization_members om 
          WHERE om.organization_id = c.organization_id AND om.user_id = v_profile
        )
      ))
  ),
  latest AS (
    SELECT m.conversation_id,
           m.message AS last_message,
           m.created_at AS last_message_at
    FROM (
      SELECT conversation_id, max(created_at) AS max_created
      FROM unified_messages
      GROUP BY conversation_id
    ) lm
    JOIN unified_messages m
      ON m.conversation_id = lm.conversation_id AND m.created_at = lm.max_created
  ),
  other AS (
    SELECT cp.conversation_id,
           MAX(CASE WHEN cp.user_id <> v_profile THEN cp.user_id END) AS other_user_id
    FROM conversation_participants cp
    GROUP BY cp.conversation_id
  )
  SELECT b.conversation_id,
         b.title,
         b.conversation_type,
         l.last_message,
         l.last_message_at,
         0::integer AS unread_count,
         COALESCE(l.last_message_at, b.updated_at) AS updated_at,
         o.other_user_id,
         b.organization_id
  FROM base b
  LEFT JOIN latest l ON l.conversation_id = b.conversation_id
  LEFT JOIN other o ON o.conversation_id = b.conversation_id
  ORDER BY updated_at DESC NULLS LAST;
END;
$$;