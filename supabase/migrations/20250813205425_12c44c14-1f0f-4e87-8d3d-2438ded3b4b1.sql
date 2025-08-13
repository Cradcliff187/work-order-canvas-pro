-- Migration: Add Location Query Performance Indexes
-- Optimizes location filter queries for faster UI responsiveness

-- Composite index for organization-scoped location queries (most common)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_work_orders_store_location_org 
ON work_orders(organization_id, store_location) 
WHERE store_location IS NOT NULL AND store_location != '';

-- Single column index for global location queries  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_work_orders_store_location 
ON work_orders(store_location) 
WHERE store_location IS NOT NULL AND store_location != '';

-- Note: CONCURRENTLY prevents table locking but takes longer to build