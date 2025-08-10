-- Harden functions created in this migration by setting search_path
CREATE OR REPLACE FUNCTION public.validate_direct_conversation_participants(user1_id uuid, user2_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
SET search_path TO 'public'
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
