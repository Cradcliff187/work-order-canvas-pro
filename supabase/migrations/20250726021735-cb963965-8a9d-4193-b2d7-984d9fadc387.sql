-- Email System Cleanup Migration
-- Date: 2025-01-26
-- Purpose: Remove obsolete email functions that have been replaced by the queue-based system

-- DOCUMENTATION: Queue-Based Email System Architecture
-- =================================================
-- The email system now uses a queue-based approach with the following components:
-- 1. email_queue table - stores pending emails
-- 2. Email triggers - add items to queue when events occur
-- 3. process_email_queue() function - processes queued emails
-- 4. send-email Edge Function - handles actual email delivery via Resend API
--
-- This migration removes two obsolete functions:
-- 1. call_send_email_trigger() - Old direct HTTP call approach
-- 2. trigger_work_order_created_email_v2() - Duplicate/obsolete version

-- SAFETY CHECK: Verify no active triggers depend on these functions
DO $$
DECLARE
    trigger_count INTEGER;
BEGIN
    -- Check for triggers using call_send_email_trigger
    SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers 
    WHERE trigger_name LIKE '%call_send_email_trigger%';
    
    IF trigger_count > 0 THEN
        RAISE EXCEPTION 'Found active triggers using call_send_email_trigger. Cannot proceed with cleanup.';
    END IF;
    
    -- Check for triggers using trigger_work_order_created_email_v2
    SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers 
    WHERE trigger_name LIKE '%trigger_work_order_created_email_v2%';
    
    IF trigger_count > 0 THEN
        RAISE EXCEPTION 'Found active triggers using trigger_work_order_created_email_v2. Cannot proceed with cleanup.';
    END IF;
    
    RAISE NOTICE 'Safety check passed. No active triggers depend on obsolete functions.';
END
$$;

-- Remove obsolete function: call_send_email_trigger
-- This function made direct HTTP calls to the send-email Edge Function
-- Replaced by: Queue-based system using email_queue table
DROP FUNCTION IF EXISTS public.call_send_email_trigger(text, uuid, text);

-- Remove obsolete function: trigger_work_order_created_email_v2
-- This is a duplicate/obsolete version of the work order created trigger
-- Current system uses: trigger_work_order_created() (without v2 suffix)
DROP FUNCTION IF EXISTS public.trigger_work_order_created_email_v2();

-- VERIFICATION QUERIES
-- ===================

-- Verify email queue system is functional
DO $$
DECLARE
    queue_function_exists BOOLEAN;
    queue_table_exists BOOLEAN;
    trigger_count INTEGER;
BEGIN
    -- Check if process_email_queue function exists
    SELECT EXISTS(
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'process_email_queue' 
        AND routine_schema = 'public'
    ) INTO queue_function_exists;
    
    -- Check if email_queue table exists
    SELECT EXISTS(
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'email_queue' 
        AND table_schema = 'public'
    ) INTO queue_table_exists;
    
    -- Count active email triggers (should be 6)
    SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers 
    WHERE trigger_name IN (
        'trigger_work_order_created',
        'trigger_work_order_assigned', 
        'trigger_work_order_completed',
        'trigger_report_submitted',
        'trigger_report_reviewed',
        'trigger_invoice_submitted'
    );
    
    -- Report status
    RAISE NOTICE 'Email System Status:';
    RAISE NOTICE '- Queue function exists: %', queue_function_exists;
    RAISE NOTICE '- Queue table exists: %', queue_table_exists;
    RAISE NOTICE '- Active email triggers: %', trigger_count;
    
    -- Verify system integrity
    IF NOT queue_function_exists THEN
        RAISE WARNING 'process_email_queue function not found!';
    END IF;
    
    IF NOT queue_table_exists THEN
        RAISE WARNING 'email_queue table not found!';
    END IF;
    
    IF trigger_count != 6 THEN
        RAISE WARNING 'Expected 6 email triggers, found %', trigger_count;
    END IF;
    
    IF queue_function_exists AND queue_table_exists AND trigger_count = 6 THEN
        RAISE NOTICE 'Email system cleanup completed successfully. Queue-based system is operational.';
    END IF;
END
$$;

-- ROLLBACK INSTRUCTIONS (for reference)
-- ====================================
-- If rollback is needed, the functions can be recreated from previous migrations
-- or from the git history. However, these functions are obsolete and should not
-- be needed in the current queue-based email system.

-- POST-CLEANUP NOTES
-- ==================
-- 1. All email functionality now goes through the email_queue table
-- 2. The process_email_queue() function handles queue processing
-- 3. Edge Function 'send-email' handles actual delivery via Resend API
-- 4. Email triggers automatically queue emails for processing
-- 5. Email logs table tracks delivery status and history