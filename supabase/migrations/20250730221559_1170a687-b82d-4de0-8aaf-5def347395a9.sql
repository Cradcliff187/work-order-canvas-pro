-- COMPLETE ORGANIZATION MIGRATION: Drop legacy user_type column
-- This completes the migration to organization-based auth

-- First verify we have data in organization_members
DO $$
DECLARE
  org_member_count INTEGER;
  legacy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO org_member_count FROM organization_members;
  SELECT COUNT(*) INTO legacy_count FROM user_organizations;
  
  RAISE NOTICE 'Organization members: %, Legacy records: %', org_member_count, legacy_count;
  
  IF org_member_count = 0 THEN
    RAISE EXCEPTION 'SAFETY CHECK FAILED: No data in organization_members table. Migration cannot proceed.';
  END IF;
END $$;

-- Drop the user_type column from profiles - we now use organization roles exclusively
ALTER TABLE profiles DROP COLUMN IF EXISTS user_type;

-- Drop the legacy user_organizations table after confirming data migration
-- Comment this out if you want to keep it as backup
-- DROP TABLE IF EXISTS user_organizations CASCADE;

-- Update any remaining policies that reference user_type
-- These should now use organization-based functions exclusively