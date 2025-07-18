
-- Migration: Clean Email Tables Data
-- Date: 2025-01-18
-- Purpose: Clear email logs and recipient settings while preserving table structures and email templates

-- =====================================================
-- CLEAR EMAIL LOGS
-- =====================================================

-- Clear all historical email sending logs (35 rows) but keep table structure
TRUNCATE TABLE public.email_logs;

-- =====================================================
-- CLEAR EMAIL RECIPIENT SETTINGS
-- =====================================================

-- Clear all recipient configuration records (28 rows) but keep table structure
TRUNCATE TABLE public.email_recipient_settings;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify email_logs is now empty
SELECT COUNT(*) as email_logs_count FROM public.email_logs;

-- Verify email_recipient_settings is now empty  
SELECT COUNT(*) as email_recipient_settings_count FROM public.email_recipient_settings;

-- Verify email_templates is unchanged (should still have 7 rows)
SELECT COUNT(*) as email_templates_count FROM public.email_templates;

-- Verify email_settings remains empty
SELECT COUNT(*) as email_settings_count FROM public.email_settings;

-- Show table structures are preserved
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name IN ('email_logs', 'email_recipient_settings', 'email_templates', 'email_settings')
ORDER BY table_name, ordinal_position;

SELECT 'Email table cleanup completed - logs and recipient settings cleared, templates preserved, structures intact' as cleanup_status;
