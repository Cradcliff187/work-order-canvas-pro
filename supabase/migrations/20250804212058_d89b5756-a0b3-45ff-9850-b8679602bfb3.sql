-- Step 1: Update process_email_queue() function to remove auth headers
CREATE OR REPLACE FUNCTION process_email_queue()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  queue_item RECORD;
  processed_count INTEGER := 0;
  failed_count INTEGER := 0;
  start_time TIMESTAMP := NOW();
  function_url TEXT;
  payload JSONB;
  http_request_id UUID;
  response_status INTEGER;
  response_body TEXT;
  error_msg TEXT;
  headers JSONB;
BEGIN
  -- Get function URL
  function_url := 'https://inudoymofztrvxhrlrek.supabase.co/functions/v1/send-email';
  
  -- Build headers (ONLY Content-Type, no auth headers)
  headers := jsonb_build_object(
    'Content-Type', 'application/json'
  );
  
  -- Process pending emails with retry logic
  FOR queue_item IN 
    SELECT *
    FROM email_queue
    WHERE status = 'pending'
    AND (next_retry_at IS NULL OR next_retry_at <= NOW())
    ORDER BY created_at ASC
    LIMIT 10 -- Process in batches
  LOOP
    BEGIN
      -- Build payload
      payload := jsonb_build_object(
        'template_name', queue_item.template_name,
        'record_id', queue_item.record_id,
        'record_type', queue_item.record_type,
        'context_data', COALESCE(queue_item.context_data, '{}')
      );
      
      -- Make HTTP request
      SELECT net.http_post(
        url := function_url,
        headers := headers,
        body := payload
      ) INTO http_request_id;
      
      -- Wait briefly for response
      PERFORM pg_sleep(0.1);
      
      -- Get response
      SELECT status_code, content 
      INTO response_status, response_body
      FROM net._http_response
      WHERE id = http_request_id;
      
      -- Handle response
      IF response_status = 200 THEN
        -- Success
        UPDATE email_queue
        SET 
          status = 'sent',
          processed_at = NOW(),
          error_message = NULL
        WHERE id = queue_item.id;
        
        processed_count := processed_count + 1;
        
      ELSE
        -- Failure - increment retry count
        UPDATE email_queue
        SET 
          retry_count = retry_count + 1,
          next_retry_at = NOW() + (INTERVAL '5 minutes' * POWER(2, retry_count)),
          error_message = CASE 
            WHEN response_status IS NOT NULL THEN 
              'HTTP ' || response_status::text || ': ' || COALESCE(response_body, 'No response body')
            ELSE 
              'No response received'
          END,
          status = CASE 
            WHEN retry_count + 1 >= 3 THEN 'failed'
            ELSE 'pending'
          END
        WHERE id = queue_item.id;
        
        failed_count := failed_count + 1;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      -- Handle exceptions
      error_msg := SQLERRM;
      
      UPDATE email_queue
      SET 
        retry_count = retry_count + 1,
        next_retry_at = NOW() + (INTERVAL '5 minutes' * POWER(2, retry_count)),
        error_message = 'Exception: ' || error_msg,
        status = CASE 
          WHEN retry_count + 1 >= 3 THEN 'failed'
          ELSE 'pending'
        END
      WHERE id = queue_item.id;
      
      failed_count := failed_count + 1;
    END;
  END LOOP;
  
  -- Log processing results
  INSERT INTO email_queue_processing_log (
    processed_at,
    processed_count,
    failed_count,
    duration_ms
  ) VALUES (
    start_time,
    processed_count,
    failed_count,
    EXTRACT(EPOCH FROM (NOW() - start_time)) * 1000
  );
  
  -- Return results
  RETURN jsonb_build_object(
    'success', true,
    'processed_count', processed_count,
    'failed_count', failed_count,
    'duration_ms', EXTRACT(EPOCH FROM (NOW() - start_time)) * 1000,
    'message', 'Email queue processing completed'
  );
END;
$$;

-- Step 2: Reset all failed emails to pending for a fresh start
UPDATE email_queue
SET 
  retry_count = 0,
  next_retry_at = NULL,
  status = 'pending',
  error_message = NULL
WHERE status = 'failed';

-- Step 3: Test the fix immediately
SELECT process_email_queue();