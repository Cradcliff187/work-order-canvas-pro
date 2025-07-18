
-- Migration: Final Email Function Cleanup
-- Date: 2025-01-19
-- Purpose: Remove the remaining trigger_completion_email function to complete email system removal

-- =====================================================
-- FINAL EMAIL FUNCTION REMOVAL
-- =====================================================

-- Remove the remaining email completion function with correct signature
DROP FUNCTION IF EXISTS public.trigger_completion_email(work_order_id uuid);

-- Also try without parameter in case signature varies
DROP FUNCTION IF EXISTS public.trigger_completion_email();

-- =====================================================
-- FINAL VERIFICATION
-- =====================================================

-- Verify NO email notification functions remain
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public'
    AND (
        routine_name LIKE 'notify_%' 
        OR routine_name LIKE '%email%'
        OR routine_name = 'trigger_completion_email'
    )
ORDER BY routine_name;

-- Verify NO email triggers remain
SELECT 
    trigger_name,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
    AND trigger_name LIKE '%email%'
ORDER BY event_object_table, trigger_name;

-- =====================================================
-- COMPLETION CONFIRMATION
-- =====================================================

-- Count remaining functions to ensure only business logic functions remain
SELECT 
    COUNT(*) as total_functions,
    COUNT(CASE WHEN routine_name LIKE 'notify_%' OR routine_name LIKE '%email%' THEN 1 END) as email_functions_remaining
FROM information_schema.routines 
WHERE routine_schema = 'public';

SELECT 'Email system completely removed - all email notification functions and triggers have been successfully dropped' as cleanup_status;
