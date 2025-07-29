-- Phase 7: Legacy System Cleanup - Database Optimization
-- Add performance indexes for organization-based queries

-- Index for organization member lookups (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_organization_members_user_lookup 
ON organization_members (user_id, organization_id);

-- Index for organization member role queries
CREATE INDEX IF NOT EXISTS idx_organization_members_role_lookup 
ON organization_members (organization_id, role);

-- Index for work order organization queries  
CREATE INDEX IF NOT EXISTS idx_work_orders_organization 
ON work_orders (organization_id, status);

-- Index for work order assignments by organization
CREATE INDEX IF NOT EXISTS idx_work_orders_assigned_org 
ON work_orders (assigned_organization_id, status);

-- Index for organization lookups by type
CREATE INDEX IF NOT EXISTS idx_organizations_type_active 
ON organizations (organization_type, is_active);

-- Index for profile lookups (still used during migration)
CREATE INDEX IF NOT EXISTS idx_profiles_active_users 
ON profiles (user_id) WHERE is_active = true;

-- Index for message queries by work order
CREATE INDEX IF NOT EXISTS idx_work_order_messages_work_order 
ON work_order_messages (work_order_id, created_at DESC);

-- Performance improvement: Composite index for user organization access patterns
CREATE INDEX IF NOT EXISTS idx_user_orgs_composite 
ON user_organizations (user_id, organization_id, created_at);

-- Index for efficient organization member counting
CREATE INDEX IF NOT EXISTS idx_organization_members_org_count 
ON organization_members (organization_id) WHERE user_id IS NOT NULL;