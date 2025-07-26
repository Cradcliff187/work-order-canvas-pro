-- Function to queue email notification for new messages
CREATE OR REPLACE FUNCTION queue_message_notifications() 
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_work_order RECORD;
  v_sender RECORD;
  v_message_preview TEXT;
  v_dashboard_url TEXT;
  v_context_data jsonb;
BEGIN
  -- Get dashboard URL from system settings using CORRECT columns
  SELECT COALESCE(
    (SELECT setting_value FROM system_settings WHERE setting_key = 'dashboard_url'),
    'https://workorderpro.lovable.app'
  ) INTO v_dashboard_url;

  -- Get work order details
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
  
  -- Get sender details with organization
  SELECT 
    p.id,
    p.first_name,
    p.last_name,
    p.email,
    p.user_type,
    COALESCE(o.name, 'Internal Team') as org_name
  INTO v_sender
  FROM profiles p
  LEFT JOIN user_organizations uo ON p.id = uo.user_id
  LEFT JOIN organizations o ON uo.organization_id = o.id
  WHERE p.id = NEW.sender_id;
  
  -- Create message preview (max 200 chars)
  v_message_preview := LEFT(NEW.message, 200);
  IF LENGTH(NEW.message) > 200 THEN
    v_message_preview := v_message_preview || '...';
  END IF;
  
  -- Build context data for email processing
  v_context_data := jsonb_build_object(
    -- Message details
    'message_id', NEW.id,
    'is_internal', NEW.is_internal,
    'sender_id', NEW.sender_id,
    
    -- Email template variables
    'sender_name', CONCAT(v_sender.first_name, ' ', v_sender.last_name),
    'sender_organization', v_sender.org_name,
    'sender_email', v_sender.email,
    'sender_type', v_sender.user_type,
    
    -- Work order details
    'work_order_id', v_work_order.id,
    'work_order_number', v_work_order.work_order_number,
    'work_order_title', v_work_order.title,
    'partner_organization_id', v_work_order.organization_id,
    'partner_organization_name', v_work_order.partner_org_name,
    
    -- Message content
    'message_preview', v_message_preview,
    'message_full_length', LENGTH(NEW.message),
    
    -- System
    'dashboard_url', v_dashboard_url
  );
  
  -- Queue ONE notification for this message
  -- The email processing system will determine recipients based on is_internal flag
  INSERT INTO email_queue (
    template_name,
    record_id,
    record_type,
    context_data,
    status,
    retry_count,
    created_at
  )
  VALUES (
    'work_order_new_message',
    NEW.id,  -- Message ID as record_id (UUID, not text)
    'work_order_message',
    v_context_data,
    'pending',
    0,
    NOW()
  );
  
  -- Log for debugging
  RAISE NOTICE 'Queued notification for message % (internal: %)', NEW.id, NEW.is_internal;
  
  RETURN NEW;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block message creation
    RAISE WARNING 'Failed to queue notification for message %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_message_notifications
AFTER INSERT ON work_order_messages
FOR EACH ROW
EXECUTE FUNCTION queue_message_notifications();

-- Add comment
COMMENT ON FUNCTION queue_message_notifications() IS 'Queues ONE notification per message; email processor determines recipients based on is_internal flag';