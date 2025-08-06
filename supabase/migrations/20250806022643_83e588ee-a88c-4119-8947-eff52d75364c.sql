-- Phase 2: Safe Database Performance Optimization (CORRECTED)
-- Uses CONCURRENTLY to prevent production table locks

-- First, check existing indexes to avoid redundancy
DO $$
BEGIN
  RAISE NOTICE 'Checking existing indexes...';
  
  -- Display existing indexes for analysis
  FOR rec IN 
    SELECT schemaname, tablename, indexname, indexdef 
    FROM pg_indexes 
    WHERE tablename IN ('work_order_reports', 'invoices', 'profiles', 'organizations', 'work_orders')
    AND schemaname = 'public'
    ORDER BY tablename, indexname
  LOOP
    RAISE NOTICE 'Existing: %.% - %', rec.tablename, rec.indexname, rec.indexdef;
  END LOOP;
END $$;

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

-- Verify indexes were created successfully and check sizes
DO $$
DECLARE
  rec RECORD;
  total_size bigint := 0;
BEGIN
  RAISE NOTICE 'Verifying new indexes...';
  
  FOR rec IN 
    SELECT 
      indexname,
      pg_size_pretty(pg_relation_size(indexname::regclass)) as size,
      pg_relation_size(indexname::regclass) as size_bytes
    FROM pg_indexes 
    WHERE indexname IN ('idx_work_order_reports_approval_optimized', 'idx_profiles_approval_lookup')
    AND schemaname = 'public'
  LOOP
    RAISE NOTICE 'Created: % (Size: %)', rec.indexname, rec.size;
    total_size := total_size + rec.size_bytes;
  END LOOP;
  
  RAISE NOTICE 'Total new index size: %', pg_size_pretty(total_size);
END $$;

-- Performance validation query for useApprovalQueue
-- This should now use the new optimized index
EXPLAIN (ANALYZE, BUFFERS) 
SELECT id, work_order_id, subcontractor_user_id, submitted_at
FROM work_order_reports 
WHERE status = 'submitted' 
ORDER BY submitted_at DESC 
LIMIT 50;