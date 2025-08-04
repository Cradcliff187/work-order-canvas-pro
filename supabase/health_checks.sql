-- ============================================================================
-- DATABASE HEALTH CHECK QUERIES
-- Work Order Portal - System Integrity Monitoring
-- ============================================================================
-- These queries help monitor the health and integrity of the Work Order Portal
-- database. Run these regularly to identify potential data consistency issues.

-- ============================================================================
-- 1. USERS WITHOUT ORGANIZATION MEMBERSHIPS
-- ============================================================================
-- Purpose: Identify active users who are not members of any organization
-- Expected healthy result: 0 users (every active user should have at least one organization)
-- Impact: Users without organizations cannot access the system properly due to RLS policies

SELECT 
    'Users Without Organization Memberships' as health_check,
    COUNT(*) as issue_count,
    CASE 
        WHEN COUNT(*) = 0 THEN 'HEALTHY'
        WHEN COUNT(*) <= 5 THEN 'WARNING'
        ELSE 'CRITICAL'
    END as status
FROM profiles p
WHERE p.is_active = true
AND NOT EXISTS (
    SELECT 1 
    FROM organization_members om 
    WHERE om.user_id = p.id
);

-- Detailed view of orphaned users (if any exist):
SELECT 
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    p.created_at,
    'No organization membership found' as issue
FROM profiles p
WHERE p.is_active = true
AND NOT EXISTS (
    SELECT 1 
    FROM organization_members om 
    WHERE om.user_id = p.id
)
ORDER BY p.created_at DESC;

-- ============================================================================
-- 2. WORK ORDERS WITHOUT VALID ASSIGNMENTS
-- ============================================================================
-- Purpose: Identify work orders that should have assignments but don't, or have invalid assignments
-- Expected healthy result: 0 orphaned work orders
-- Impact: Work orders without valid assignments cannot be processed properly

SELECT 
    'Work Orders Without Valid Assignments' as health_check,
    COUNT(*) as issue_count,
    CASE 
        WHEN COUNT(*) = 0 THEN 'HEALTHY'
        WHEN COUNT(*) <= 3 THEN 'WARNING'
        ELSE 'CRITICAL'
    END as status
FROM work_orders wo
WHERE wo.status IN ('assigned', 'in_progress')
AND (
    -- Work order marked as assigned but has no assignment record
    NOT EXISTS (
        SELECT 1 
        FROM work_order_assignments woa 
        WHERE woa.work_order_id = wo.id
    )
    OR
    -- Work order has assignment but organization doesn't exist
    wo.assigned_organization_id IS NOT NULL 
    AND NOT EXISTS (
        SELECT 1 
        FROM organizations o 
        WHERE o.id = wo.assigned_organization_id 
        AND o.is_active = true
    )
);

-- Detailed view of assignment issues:
SELECT 
    wo.work_order_number,
    wo.title,
    wo.status,
    wo.assigned_organization_id,
    wo.date_assigned,
    CASE 
        WHEN NOT EXISTS (SELECT 1 FROM work_order_assignments woa WHERE woa.work_order_id = wo.id) 
            THEN 'Missing assignment record'
        WHEN wo.assigned_organization_id IS NOT NULL 
            AND NOT EXISTS (SELECT 1 FROM organizations o WHERE o.id = wo.assigned_organization_id AND o.is_active = true)
            THEN 'Invalid assigned organization'
        ELSE 'Unknown assignment issue'
    END as issue_type
FROM work_orders wo
WHERE wo.status IN ('assigned', 'in_progress')
AND (
    NOT EXISTS (SELECT 1 FROM work_order_assignments woa WHERE woa.work_order_id = wo.id)
    OR (wo.assigned_organization_id IS NOT NULL 
        AND NOT EXISTS (SELECT 1 FROM organizations o WHERE o.id = wo.assigned_organization_id AND o.is_active = true))
)
ORDER BY wo.date_assigned DESC NULLS LAST;

-- ============================================================================
-- 3. EMAIL QUEUE HEALTH BY STATUS
-- ============================================================================
-- Purpose: Monitor email queue performance and identify processing bottlenecks
-- Expected healthy result: Low pending count (<10), minimal failed emails (<5%)
-- Impact: High pending or failed counts indicate email delivery issues

SELECT 
    'Email Queue Health' as health_check,
    eq.status,
    COUNT(*) as email_count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage,
    CASE 
        WHEN eq.status = 'pending' AND COUNT(*) > 10 THEN 'WARNING'
        WHEN eq.status = 'failed' AND COUNT(*) > (SELECT COUNT(*) * 0.05 FROM email_queue) THEN 'WARNING'
        ELSE 'HEALTHY'
    END as status_health
FROM email_queue eq
GROUP BY eq.status
ORDER BY 
    CASE eq.status 
        WHEN 'pending' THEN 1 
        WHEN 'processing' THEN 2 
        WHEN 'sent' THEN 3 
        WHEN 'failed' THEN 4 
        ELSE 5 
    END;

-- Email queue summary with retry analysis:
SELECT 
    'Email Queue Summary' as health_check,
    COUNT(*) as total_emails,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
    COUNT(*) FILTER (WHERE retry_count >= 3) as permanently_failed,
    AVG(retry_count) FILTER (WHERE status = 'failed') as avg_retry_count,
    MAX(created_at) FILTER (WHERE status = 'pending') as latest_pending_email
FROM email_queue;

-- ============================================================================
-- 4. STALE EMAILS (PENDING > 1 HOUR)
-- ============================================================================
-- Purpose: Identify emails stuck in pending status for over 1 hour
-- Expected healthy result: 0 stale emails (emails should process within minutes)
-- Impact: Stale emails indicate processing bottlenecks or system issues

SELECT 
    'Stale Emails (Pending > 1 Hour)' as health_check,
    COUNT(*) as stale_email_count,
    CASE 
        WHEN COUNT(*) = 0 THEN 'HEALTHY'
        WHEN COUNT(*) <= 5 THEN 'WARNING'
        ELSE 'CRITICAL'
    END as status
FROM email_queue eq
WHERE eq.status = 'pending'
AND eq.created_at < NOW() - INTERVAL '1 hour';

-- Detailed view of stale emails:
SELECT 
    eq.id,
    eq.template_name,
    eq.record_type,
    eq.created_at,
    EXTRACT(EPOCH FROM (NOW() - eq.created_at))/3600 as hours_pending,
    eq.retry_count,
    eq.error_message,
    eq.next_retry_at
FROM email_queue eq
WHERE eq.status = 'pending'
AND eq.created_at < NOW() - INTERVAL '1 hour'
ORDER BY eq.created_at ASC;

-- ============================================================================
-- BONUS: OVERALL SYSTEM HEALTH SUMMARY
-- ============================================================================
-- Purpose: Quick overview of all health metrics in one query
-- Expected result: All metrics showing 'HEALTHY' status

WITH health_metrics AS (
    -- Users without organizations
    SELECT 
        'Users Without Organizations' as metric,
        COUNT(*) as issue_count,
        CASE WHEN COUNT(*) = 0 THEN 'HEALTHY' WHEN COUNT(*) <= 5 THEN 'WARNING' ELSE 'CRITICAL' END as status
    FROM profiles p
    WHERE p.is_active = true
    AND NOT EXISTS (SELECT 1 FROM organization_members om WHERE om.user_id = p.id)
    
    UNION ALL
    
    -- Work orders without assignments
    SELECT 
        'Work Orders Without Valid Assignments' as metric,
        COUNT(*) as issue_count,
        CASE WHEN COUNT(*) = 0 THEN 'HEALTHY' WHEN COUNT(*) <= 3 THEN 'WARNING' ELSE 'CRITICAL' END as status
    FROM work_orders wo
    WHERE wo.status IN ('assigned', 'in_progress')
    AND (
        NOT EXISTS (SELECT 1 FROM work_order_assignments woa WHERE woa.work_order_id = wo.id)
        OR (wo.assigned_organization_id IS NOT NULL 
            AND NOT EXISTS (SELECT 1 FROM organizations o WHERE o.id = wo.assigned_organization_id AND o.is_active = true))
    )
    
    UNION ALL
    
    -- Stale emails
    SELECT 
        'Stale Emails (>1 Hour)' as metric,
        COUNT(*) as issue_count,
        CASE WHEN COUNT(*) = 0 THEN 'HEALTHY' WHEN COUNT(*) <= 5 THEN 'WARNING' ELSE 'CRITICAL' END as status
    FROM email_queue eq
    WHERE eq.status = 'pending'
    AND eq.created_at < NOW() - INTERVAL '1 hour'
    
    UNION ALL
    
    -- High retry emails
    SELECT 
        'High Retry Emails (>=3 retries)' as metric,
        COUNT(*) as issue_count,
        CASE WHEN COUNT(*) = 0 THEN 'HEALTHY' WHEN COUNT(*) <= 2 THEN 'WARNING' ELSE 'CRITICAL' END as status
    FROM email_queue eq
    WHERE eq.retry_count >= 3
)
SELECT 
    'SYSTEM HEALTH SUMMARY' as report_title,
    NOW() as check_timestamp,
    COUNT(*) as total_metrics,
    COUNT(*) FILTER (WHERE status = 'HEALTHY') as healthy_count,
    COUNT(*) FILTER (WHERE status = 'WARNING') as warning_count,
    COUNT(*) FILTER (WHERE status = 'CRITICAL') as critical_count,
    CASE 
        WHEN COUNT(*) FILTER (WHERE status = 'CRITICAL') > 0 THEN 'SYSTEM CRITICAL'
        WHEN COUNT(*) FILTER (WHERE status = 'WARNING') > 0 THEN 'SYSTEM WARNING'
        ELSE 'SYSTEM HEALTHY'
    END as overall_status
FROM health_metrics

UNION ALL

SELECT 
    metric as report_title,
    NULL as check_timestamp,
    NULL as total_metrics,
    issue_count as healthy_count,
    NULL as warning_count,
    NULL as critical_count,
    status as overall_status
FROM health_metrics
ORDER BY report_title;

-- ============================================================================
-- USAGE INSTRUCTIONS:
-- ============================================================================
-- 1. Run individual sections for specific health checks
-- 2. Run the entire file for comprehensive health monitoring
-- 3. Set up automated monitoring by running these queries periodically
-- 4. Alert on any non-HEALTHY status results
-- 5. Use the detailed views to investigate specific issues
-- ============================================================================