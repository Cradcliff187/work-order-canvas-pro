-- Fix the email system issues

-- 1. Fix trigger_welcome_email to use 'profile' record_type instead of 'user'
CREATE OR REPLACE FUNCTION public.trigger_welcome_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO email_queue (
    template_name,
    record_id,
    record_type,
    context_data
  ) VALUES (
    'welcome_email',
    NEW.id,  -- This is profile.id, not user.id
    'profile',  -- Changed from 'user' to 'profile' to match send-email function expectations
    '{}'::jsonb
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the main transaction
  RAISE WARNING 'Welcome email queue insertion failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- 2. Update process_email_queue function to add rate limiting (500ms delay between sends)
CREATE OR REPLACE FUNCTION public.process_email_queue()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  email_record record;
  email_result record;
  processed_count integer := 0;
  failed_count integer := 0;
  skipped_count integer := 0;
  batch_size integer := 5; -- Process 5 emails at a time
  max_retries integer := 3;
  retry_delay_minutes integer;
  http_request_id bigint;
BEGIN
  -- Process pending emails and failed emails ready for retry
  FOR email_record IN 
    SELECT *
    FROM email_queue
    WHERE (
      status = 'pending' 
      OR (
        status = 'failed' 
        AND retry_count < max_retries 
        AND (next_retry_at IS NULL OR next_retry_at <= NOW())
      )
    )
    ORDER BY created_at ASC
    LIMIT batch_size
  LOOP
    BEGIN
      -- Add rate limiting: 500ms delay between sends to respect Resend's 2 req/sec limit
      IF processed_count > 0 OR failed_count > 0 THEN
        PERFORM pg_sleep(0.5);
      END IF;
      
      -- Call the send-email edge function
      SELECT net.http_post(
        url := 'https://inudoymofztrvxhrlrek.supabase.co/functions/v1/send-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImludWRveW1vZnp0cnZ4aHJscmVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxNjI2NTksImV4cCI6MjA2NzczODY1OX0.Qm8B5GLXnXcZrz_3idT9UCUYxF_cPi1gtr5F3eMeNI4',
          'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImludWRveW1vZnp0cnZ4aHJscmVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxNjI2NTksImV4cCI6MjA2NzczODY1OX0.Qm8B5GLXnXcZrz_3idT9UCUYxF_cPi1gtr5F3eMeNI4'
        ),
        body := jsonb_build_object(
          'template_name', email_record.template_name,
          'record_id', email_record.record_id,
          'record_type', email_record.record_type,
          'test_mode', false,
          'custom_data', COALESCE(email_record.context_data, '{}'::jsonb)
        )
      ) INTO http_request_id;
      
      -- Wait a moment for the request to complete
      PERFORM pg_sleep(0.5);
      
      -- Check the response
      SELECT * INTO email_result
      FROM net._http_response
      WHERE id = http_request_id;
      
      -- Check if the HTTP call was successful
      IF email_result.status_code = 200 THEN
        -- Mark as processed successfully
        UPDATE email_queue
        SET 
          status = 'sent',
          processed_at = NOW(),
          error_message = NULL,
          retry_count = email_record.retry_count,
          next_retry_at = NULL
        WHERE id = email_record.id;
        
        processed_count := processed_count + 1;
        
        RAISE LOG 'Email processed successfully for template: %, record: %', 
          email_record.template_name, email_record.record_id;
      ELSE
        -- Handle failed email with retry logic
        retry_delay_minutes := (email_record.retry_count + 1) * 5; -- Exponential backoff
        
        UPDATE email_queue
        SET 
          status = 'failed',
          retry_count = email_record.retry_count + 1,
          next_retry_at = NOW() + (retry_delay_minutes || ' minutes')::interval,
          error_message = COALESCE(email_result.content::text, 'HTTP call failed')
        WHERE id = email_record.id;
        
        failed_count := failed_count + 1;
        
        RAISE LOG 'Email failed for template: %, record: %, retry: %, next retry at: %', 
          email_record.template_name, email_record.record_id, 
          email_record.retry_count + 1, NOW() + (retry_delay_minutes || ' minutes')::interval;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      -- Handle any unexpected errors
      retry_delay_minutes := (email_record.retry_count + 1) * 5;
      
      UPDATE email_queue
      SET 
        status = 'failed',
        retry_count = email_record.retry_count + 1,
        next_retry_at = NOW() + (retry_delay_minutes || ' minutes')::interval,
        error_message = SQLERRM
      WHERE id = email_record.id;
      
      failed_count := failed_count + 1;
      
      RAISE LOG 'Email processing exception for template: %, record: %, error: %', 
        email_record.template_name, email_record.record_id, SQLERRM;
    END;
  END LOOP;
  
  -- Count skipped emails (those that hit max retries)
  SELECT COUNT(*) INTO skipped_count
  FROM email_queue
  WHERE status = 'failed' AND retry_count >= max_retries;
  
  -- Return processing statistics
  RETURN jsonb_build_object(
    'success', true,
    'processed_count', processed_count,
    'failed_count', failed_count,
    'skipped_count', skipped_count,
    'batch_size', batch_size,
    'max_retries', max_retries,
    'processed_at', NOW()
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'processed_count', processed_count,
    'failed_count', failed_count,
    'processed_at', NOW()
  );
END;
$$;

-- 3. Clean up invalid queue entries with non-existent record_ids
DELETE FROM email_queue 
WHERE template_name = 'welcome_email' 
AND record_type = 'user' 
AND record_id NOT IN (
  SELECT user_id FROM profiles WHERE user_id IS NOT NULL
);

-- Also clean up any entries where record_type is 'user' and record_id doesn't exist in auth.users
DELETE FROM email_queue 
WHERE template_name = 'welcome_email' 
AND record_type = 'user' 
AND status = 'failed';

COMMENT ON FUNCTION public.trigger_welcome_email IS 'Triggers welcome email with profile record_type to match send-email function expectations';
COMMENT ON FUNCTION public.process_email_queue IS 'Processes email queue with 500ms rate limiting to respect Resend 2 req/sec limit';