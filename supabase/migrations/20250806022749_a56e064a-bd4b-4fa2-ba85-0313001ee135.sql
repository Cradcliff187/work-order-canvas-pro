-- Phase 2: Safe Database Performance Optimization (CORRECTED v2)
-- Uses CONCURRENTLY to prevent production table locks

-- Create only minimal required indexes with CONCURRENTLY for zero-downtime deployment

-- 1. Approval queue optimization for work_order_reports
-- This specifically targets the useApprovalQueue query pattern
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_work_order_reports_approval_optimized 
ON work_order_reports (status, submitted_at DESC) 
WHERE status = 'submitted';

-- 2. Profile lookup optimization for approval queue  
-- Covers the subcontractor profile lookups in useApprovalQueue
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_approval_lookup 
ON profiles (id) 
INCLUDE (first_name, last_name, is_active)
WHERE is_active = true;

-- Update table statistics for better query planning
ANALYZE work_order_reports;
ANALYZE profiles;
ANALYZE invoices;