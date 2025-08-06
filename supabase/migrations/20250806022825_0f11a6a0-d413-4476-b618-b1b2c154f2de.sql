-- Phase 2: Safe Database Performance Optimization (Final)
-- Note: In production, these indexes should be created with CONCURRENTLY 
-- during maintenance windows to prevent table locks

-- Create minimal required indexes for approval queue optimization

-- 1. Approval queue optimization for work_order_reports
-- This specifically targets the useApprovalQueue query pattern
CREATE INDEX IF NOT EXISTS idx_work_order_reports_approval_optimized 
ON work_order_reports (status, submitted_at DESC) 
WHERE status = 'submitted';

-- 2. Profile lookup optimization for approval queue  
-- Covers the subcontractor profile lookups in useApprovalQueue
CREATE INDEX IF NOT EXISTS idx_profiles_approval_lookup 
ON profiles (id) 
INCLUDE (first_name, last_name, is_active)
WHERE is_active = true;

-- Update table statistics for better query planning
ANALYZE work_order_reports;
ANALYZE profiles;
ANALYZE invoices;

-- Add comment for production deployment guidance
COMMENT ON INDEX idx_work_order_reports_approval_optimized IS 
'Optimizes approval queue queries. In production, recreate with CONCURRENTLY during maintenance window.';

COMMENT ON INDEX idx_profiles_approval_lookup IS 
'Optimizes profile lookups in approval queue. In production, recreate with CONCURRENTLY during maintenance window.';