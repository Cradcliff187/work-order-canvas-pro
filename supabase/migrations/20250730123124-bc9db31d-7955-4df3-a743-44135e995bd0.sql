-- Phase 1 Completion: Migrate data from user_organizations to organization_members
-- This migration ensures organization_members table has all user-organization relationships

-- First, ensure organization_members table exists with correct structure
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  role organization_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, organization_id)
);

-- Enable RLS if not already enabled
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Migrate data from user_organizations to organization_members
-- Only insert records that don't already exist
INSERT INTO organization_members (user_id, organization_id, role, created_at)
SELECT 
  uo.user_id,
  uo.organization_id,
  -- Determine role based on profile user_type and organization type
  CASE 
    WHEN p.user_type = 'admin' AND o.organization_type = 'internal' THEN 'admin'::organization_role
    WHEN p.user_type = 'employee' AND o.organization_type = 'internal' THEN 'employee'::organization_role
    WHEN o.organization_type = 'partner' THEN 'member'::organization_role
    WHEN o.organization_type = 'subcontractor' THEN 'member'::organization_role
    ELSE 'member'::organization_role
  END as role,
  uo.created_at
FROM user_organizations uo
JOIN profiles p ON p.id = uo.user_id
JOIN organizations o ON o.id = uo.organization_id
WHERE NOT EXISTS (
  SELECT 1 FROM organization_members om 
  WHERE om.user_id = uo.user_id AND om.organization_id = uo.organization_id
);