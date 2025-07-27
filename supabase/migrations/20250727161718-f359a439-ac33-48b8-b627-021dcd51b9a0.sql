-- Email System Health Check Migration
-- Purpose: Comprehensive health check of the email system infrastructure
-- This is a read-only migration that provides diagnostic information
-- Run this to verify email system status after any changes

-- =============================================================================
-- 1. EMAIL QUEUE HEALTH CHECK
-- Shows current state of the email processing queue
-- =============================================================================
SELECT 
    'EMAIL QUEUE STATUS' as check_type,
    status,
    COUNT(*) as count,
    MIN(created_at) as oldest_email,
    MAX(created_at) as newest_email,
    AVG(retry_count) as avg_retry_count
FROM email_queue 
GROUP BY status
ORDER BY status;

-- Check for stuck emails in retry loops (concerning if retry_count > 3)
SELECT 
    'STUCK EMAILS CHECK' as check_type,
    template_name,
    status,
    retry_count,
    error_message,
    created_at,
    next_retry_at
FROM email_queue 
WHERE retry_count > 3 OR (status = 'pending' AND created_at < NOW() - INTERVAL '1 hour')
ORDER BY retry_count DESC, created_at ASC;

-- =============================================================================
-- 2. EMAIL TEMPLATES STATUS
-- Verifies all email templates are properly configured
-- =============================================================================
SELECT 
    'EMAIL TEMPLATES STATUS' as check_type,
    template_name,
    is_active,
    created_at,
    updated_at,
    CASE 
        WHEN LENGTH(html_content) < 100 THEN 'MINIMAL_CONTENT'
        WHEN LENGTH(html_content) > 10000 THEN 'LARGE_CONTENT'
        ELSE 'NORMAL_CONTENT'
    END as content_size_status
FROM email_templates 
ORDER BY template_name;

-- Count active vs inactive templates
SELECT 
    'TEMPLATE SUMMARY' as check_type,
    is_active,
    COUNT(*) as template_count
FROM email_templates 
GROUP BY is_active;

-- =============================================================================
-- 3. EMAIL LOGS ANALYSIS
-- Shows recent email delivery success/failure rates
-- =============================================================================
SELECT 
    'EMAIL DELIVERY STATUS' as check_type,
    status,
    COUNT(*) as total_count,
    COUNT(CASE WHEN sent_at > NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h_count,
    COUNT(CASE WHEN sent_at > NOW() - INTERVAL '7 days' THEN 1 END) as last_7d_count
FROM email_logs 
GROUP BY status
ORDER BY status;

-- Recent email activity by template
SELECT 
    'RECENT EMAIL ACTIVITY' as check_type,
    template_used,
    status,
    COUNT(*) as count,
    MAX(sent_at) as most_recent
FROM email_logs 
WHERE sent_at > NOW() - INTERVAL '7 days'
GROUP BY template_used, status
ORDER BY template_used, status;

-- =============================================================================
-- 4. SYSTEM INFRASTRUCTURE CHECK
-- Verifies email-related database infrastructure
-- =============================================================================

-- Check if pg_cron extension exists (needed for scheduled email processing)
SELECT 
    'PG_CRON EXTENSION' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') 
        THEN 'INSTALLED' 
        ELSE 'NOT_INSTALLED'
    END as status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') 
        THEN 'Email queue can be processed automatically via cron jobs'
        ELSE 'Manual email processing only - consider enabling pg_cron for automation'
    END as recommendation;

-- List all database triggers with 'email' in the name
SELECT 
    'EMAIL TRIGGERS' as check_type,
    schemaname,
    tablename,
    triggername,
    CASE 
        WHEN triggername LIKE '%email%' THEN 'EMAIL_RELATED'
        WHEN triggername LIKE '%message%' THEN 'MESSAGE_RELATED'
        ELSE 'OTHER'
    END as trigger_category
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE triggername ILIKE '%email%' 
   OR triggername ILIKE '%message%'
   OR triggername ILIKE '%notification%'
ORDER BY schemaname, tablename, triggername;

-- =============================================================================
-- 5. EMAIL PROCESSING FUNCTIONS
-- Verifies existence of critical email processing functions
-- =============================================================================
SELECT 
    'EMAIL FUNCTIONS' as check_type,
    proname as function_name,
    pronargs as arg_count,
    CASE prosecdef 
        WHEN true THEN 'SECURITY_DEFINER' 
        ELSE 'INVOKER_RIGHTS' 
    END as security_type,
    CASE 
        WHEN proname ILIKE '%email%' THEN 'EMAIL_PROCESSING'
        WHEN proname ILIKE '%queue%' THEN 'QUEUE_MANAGEMENT'
        WHEN proname ILIKE '%notification%' THEN 'NOTIFICATION'
        ELSE 'OTHER'
    END as function_category
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND (proname ILIKE '%email%' 
       OR proname ILIKE '%queue%' 
       OR proname ILIKE '%notification%'
       OR proname ILIKE '%message%')
ORDER BY function_category, proname;

-- =============================================================================
-- 6. QUEUE HEALTH METRICS
-- Advanced metrics for email queue performance monitoring
-- =============================================================================

-- Processing lag analysis (emails taking too long to process)
SELECT 
    'PROCESSING LAG ANALYSIS' as check_type,
    template_name,
    status,
    COUNT(*) as email_count,
    AVG(EXTRACT(EPOCH FROM (COALESCE(processed_at, NOW()) - created_at))/60) as avg_processing_minutes,
    MAX(EXTRACT(EPOCH FROM (COALESCE(processed_at, NOW()) - created_at))/60) as max_processing_minutes
FROM email_queue 
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY template_name, status
HAVING COUNT(*) > 0
ORDER BY avg_processing_minutes DESC;

-- Error pattern analysis
SELECT 
    'ERROR PATTERN ANALYSIS' as check_type,
    LEFT(COALESCE(error_message, 'No error'), 100) as error_pattern,
    COUNT(*) as occurrence_count,
    MIN(created_at) as first_occurrence,
    MAX(created_at) as last_occurrence
FROM email_queue 
WHERE status = 'failed' 
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY LEFT(COALESCE(error_message, 'No error'), 100)
ORDER BY occurrence_count DESC
LIMIT 10;

-- =============================================================================
-- 7. SYSTEM RECOMMENDATIONS
-- Actionable insights based on current system state
-- =============================================================================
WITH queue_stats AS (
    SELECT 
        COUNT(*) as total_emails,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
        COUNT(CASE WHEN retry_count > 3 THEN 1 END) as stuck_count
    FROM email_queue
),
template_stats AS (
    SELECT 
        COUNT(*) as total_templates,
        COUNT(CASE WHEN is_active THEN 1 END) as active_templates
    FROM email_templates
)
SELECT 
    'SYSTEM HEALTH SUMMARY' as check_type,
    CASE 
        WHEN qs.pending_count = 0 AND qs.failed_count = 0 THEN 'HEALTHY'
        WHEN qs.pending_count < 10 AND qs.failed_count < 5 THEN 'GOOD'
        WHEN qs.stuck_count > 0 THEN 'NEEDS_ATTENTION'
        ELSE 'DEGRADED'
    END as overall_health,
    CONCAT(
        'Total emails: ', qs.total_emails, 
        ', Pending: ', qs.pending_count,
        ', Failed: ', qs.failed_count,
        ', Stuck: ', qs.stuck_count,
        ', Active templates: ', ts.active_templates, '/', ts.total_templates
    ) as summary,
    CASE 
        WHEN qs.stuck_count > 0 THEN 'PRIORITY: Clear stuck emails with high retry counts'
        WHEN qs.failed_count > 10 THEN 'WARNING: High number of failed emails - check error patterns'
        WHEN qs.pending_count > 50 THEN 'INFO: Large queue - consider processing frequency'
        WHEN ts.active_templates < ts.total_templates THEN 'INFO: Some email templates are inactive'
        ELSE 'System operating normally'
    END as recommendation
FROM queue_stats qs, template_stats ts;

-- =============================================================================
-- END OF EMAIL SYSTEM HEALTH CHECK
-- =============================================================================