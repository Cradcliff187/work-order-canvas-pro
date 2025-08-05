-- Clear broken email queue entries with invalid UUID record_ids
DELETE FROM email_queue 
WHERE record_id::text ~ '^[0-9]+$';

-- Add constraint to ensure record_ids are valid UUIDs
ALTER TABLE email_queue 
ADD CONSTRAINT email_queue_record_id_uuid_check 
CHECK (record_id IS NULL OR record_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

-- Update process_email_queue function to handle UUID validation better
CREATE OR REPLACE FUNCTION process_email_queue()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  queue_item RECORD;
  processed_count INTEGER := 0;
  failed_count INTEGER := 0;
  start_time TIMESTAMP := NOW();
  processing_duration INTEGER;
BEGIN
  -- Process pending emails with valid UUIDs only
  FOR queue_item IN 
    SELECT * FROM email_queue 
    WHERE status = 'pending' 
    AND retry_count < 3
    AND (next_retry_at IS NULL OR next_retry_at <= NOW())
    AND record_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    ORDER BY created_at ASC
    LIMIT 50
  LOOP
    BEGIN
      -- Call the send-email edge function
      PERFORM net.http_post(
        url := 'https://inudoymofztrvxhrlrek.supabase.co/functions/v1/send-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        ),
        body := jsonb_build_object(
          'template_name', queue_item.template_name,
          'record_id', queue_item.record_id,
          'record_type', queue_item.record_type,
          'custom_data', queue_item.context_data
        )
      );
      
      -- Mark as processed
      UPDATE email_queue 
      SET status = 'sent', 
          processed_at = NOW()
      WHERE id = queue_item.id;
      
      processed_count := processed_count + 1;
      
    EXCEPTION WHEN OTHERS THEN
      -- Mark as failed and increment retry count
      UPDATE email_queue 
      SET status = 'failed',
          retry_count = retry_count + 1,
          next_retry_at = CASE 
            WHEN retry_count < 2 THEN NOW() + INTERVAL '5 minutes'
            ELSE NULL
          END,
          error_message = SQLERRM,
          processed_at = NOW()
      WHERE id = queue_item.id;
      
      failed_count := failed_count + 1;
    END;
  END LOOP;
  
  -- Calculate processing duration
  processing_duration := EXTRACT(EPOCH FROM (NOW() - start_time)) * 1000;
  
  -- Log processing results
  INSERT INTO email_queue_processing_log (
    processed_at,
    processed_count,
    failed_count,
    duration_ms
  ) VALUES (
    NOW(),
    processed_count,
    failed_count,
    processing_duration
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Email queue processing completed',
    'processed_count', processed_count,
    'failed_count', failed_count,
    'duration_ms', processing_duration
  );
END;
$$;