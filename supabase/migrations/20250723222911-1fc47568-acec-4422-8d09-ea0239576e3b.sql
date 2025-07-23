-- Email Trigger Cleanup: Remove duplicate triggers and deprecated functions
-- This migration eliminates duplicate email notifications and improves performance

-- Step 1: Remove duplicate status trigger (keep the enhanced one)
DROP TRIGGER IF EXISTS trigger_auto_report_status ON work_order_reports;

-- Step 2: Remove old email notification triggers from work_orders table
DROP TRIGGER IF EXISTS trigger_work_order_created ON work_orders;
DROP TRIGGER IF EXISTS trigger_work_order_assigned ON work_orders;

-- Step 3: Remove old email notification triggers from work_order_reports table  
DROP TRIGGER IF EXISTS trigger_report_submitted ON work_order_reports;
DROP TRIGGER IF EXISTS trigger_report_reviewed ON work_order_reports;

-- Step 4: Remove deprecated trigger functions (no longer needed)
DROP FUNCTION IF EXISTS public.notify_work_order_created();
DROP FUNCTION IF EXISTS public.notify_work_order_assigned(); 
DROP FUNCTION IF EXISTS public.notify_report_submitted();
DROP FUNCTION IF EXISTS public.notify_report_reviewed();

-- Step 5: Also remove the legacy user welcome trigger function that's been replaced
DROP FUNCTION IF EXISTS public.notify_user_welcome();

-- Verification: The following triggers should remain active (unified email system):
-- - send_work_order_created → trigger_work_order_created_email()
-- - send_report_submitted → trigger_report_submitted_email()
-- - send_report_reviewed → trigger_report_reviewed_email() 
-- - send_assignment_email → trigger_work_order_assignment_email()
-- - send_work_order_completed → trigger_work_order_completed_email()
-- - trigger_auto_report_status_enhanced → auto_update_report_status()

-- Add documentation comment
COMMENT ON FUNCTION public.call_send_email_trigger IS 'Unified email system - all email notifications route through this function to the send-email Edge Function. Duplicate triggers and functions removed for performance.';

-- Performance improvement: Each email event now triggers exactly once instead of 2-3 times