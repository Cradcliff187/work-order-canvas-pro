-- Fix unread message counts to respect message visibility rules
CREATE OR REPLACE FUNCTION public.get_unread_message_counts()
RETURNS TABLE(work_order_id uuid, unread_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_profile_id uuid;
  user_org_type organization_type;
BEGIN
  -- Get current user's profile ID
  SELECT auth_profile_id() INTO current_profile_id;
  
  -- If no authenticated user, return empty
  IF current_profile_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Get user's organization type to determine message visibility rules
  SELECT o.organization_type INTO user_org_type
  FROM organization_members om
  JOIN organizations o ON o.id = om.organization_id
  WHERE om.user_id = current_profile_id
  LIMIT 1;
  
  -- Return query based on user role and message visibility
  IF user_org_type = 'internal' THEN
    -- Admins/employees can see all messages (both public and internal)
    RETURN QUERY
    SELECT 
      wom.work_order_id,
      COUNT(*) as unread_count
    FROM work_order_messages wom
    LEFT JOIN message_read_receipts mrr ON mrr.message_id = wom.id AND mrr.user_id = current_profile_id
    WHERE mrr.message_id IS NULL
    GROUP BY wom.work_order_id;
    
  ELSIF user_org_type = 'partner' THEN
    -- Partners can only see public messages (is_internal = false) on their work orders
    RETURN QUERY
    SELECT 
      wom.work_order_id,
      COUNT(*) as unread_count
    FROM work_order_messages wom
    LEFT JOIN message_read_receipts mrr ON mrr.message_id = wom.id AND mrr.user_id = current_profile_id
    WHERE mrr.message_id IS NULL
    AND wom.is_internal = false
    AND wom.work_order_id IN (
      SELECT wo.id 
      FROM work_orders wo
      WHERE wo.organization_id IN (
        SELECT om.organization_id
        FROM organization_members om
        WHERE om.user_id = current_profile_id
      )
    )
    GROUP BY wom.work_order_id;
    
  ELSIF user_org_type = 'subcontractor' THEN
    -- Subcontractors can only see internal messages (is_internal = true) on assigned work orders
    RETURN QUERY
    SELECT 
      wom.work_order_id,
      COUNT(*) as unread_count
    FROM work_order_messages wom
    LEFT JOIN message_read_receipts mrr ON mrr.message_id = wom.id AND mrr.user_id = current_profile_id
    WHERE mrr.message_id IS NULL
    AND wom.is_internal = true
    AND wom.work_order_id IN (
      SELECT wo.id 
      FROM work_orders wo
      WHERE wo.assigned_organization_id IN (
        SELECT om.organization_id
        FROM organization_members om
        WHERE om.user_id = current_profile_id
      )
    )
    GROUP BY wom.work_order_id;
    
  ELSE
    -- Unknown organization type, return empty
    RETURN;
  END IF;
END;
$function$