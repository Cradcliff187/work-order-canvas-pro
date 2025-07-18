-- Migration: Safe Removal of Email Triggers
-- Date: 2025-01-19
-- Purpose: Remove email triggers and functions without affecting other triggers or business logic

-- =====================================================
-- SAFE REMOVAL OF EMAIL TRIGGERS
-- =====================================================

-- Remove email triggers - these will stop automatic email sending
DROP TRIGGER IF EXISTS trigger_user_welcome_email ON profiles;
DROP TRIGGER IF EXISTS trigger_report_reviewed_email ON work_order_reports;
DROP TRIGGER IF EXISTS trigger_report_submitted_email ON work_order_reports;
DROP TRIGGER IF EXISTS trigger_work_order_created_email ON work_orders;

-- =====================================================
-- SAFE REMOVAL OF EMAIL NOTIFICATION FUNCTIONS
-- =====================================================

-- Remove the email notification functions - no longer needed after triggers are removed
DROP FUNCTION IF EXISTS public.notify_user_welcome();
DROP FUNCTION IF EXISTS public.notify_report_reviewed();
DROP FUNCTION IF EXISTS public.notify_report_submitted();
DROP FUNCTION IF EXISTS public.notify_work_order_created();
DROP FUNCTION IF EXISTS public.trigger_completion_email();

-- =====================================================
-- VERIFICATION SECTION
-- =====================================================

-- Verify that all email triggers have been removed
-- This query will show remaining triggers (should not include any email triggers)
SELECT 
    trigger_name,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
    AND trigger_name LIKE '%email%'
ORDER BY event_object_table, trigger_name;

-- Verify that all email functions have been removed
-- This query will show remaining functions (should not include email notification functions)
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
    AND routine_name LIKE 'notify_%'
ORDER BY routine_name;

-- =====================================================
-- PRESERVED COMPONENTS
-- =====================================================

-- The following remain untouched and functional:
-- ✓ All audit triggers (handle_new_user_robust, sync_auth_user_metadata, etc.)
-- ✓ All status transition triggers (auto_update_assignment_status, auto_update_report_status)
-- ✓ All validation triggers (validate_user_organization_trigger, auto_populate_assignment_organization)
-- ✓ All email templates (available for manual sending)
-- ✓ All edge functions (available for manual testing)
-- ✓ All email logs and settings tables
-- ✓ All business logic and data integrity

-- =====================================================
-- WHAT THIS ACCOMPLISHES
-- =====================================================

-- ✓ Disables automatic email notifications that were causing issues
-- ✓ Preserves all business logic and audit trails
-- ✓ Keeps email infrastructure for potential manual use
-- ✓ Maintains complete rollback capability via backup migration
-- ✓ No impact on work order processing, assignments, or reporting

SELECT 'Email triggers and functions removed successfully - automatic emails are now disabled' as removal_status;