-- Populate company_name in profiles table based on user organization relationships
-- This migration will:
-- 1. Only update profiles where company_name is NULL or empty string
-- 2. Use the organization name from user_organizations relationship
-- 3. Handle multiple organizations by taking the first one (LIMIT 1)
-- 4. Add logging to track changes

DO $$
DECLARE
  updated_count INTEGER := 0;
BEGIN
  -- Update profiles with missing company_name
  UPDATE profiles 
  SET 
    company_name = (
      SELECT o.name 
      FROM organizations o
      JOIN user_organizations uo ON o.id = uo.organization_id
      WHERE uo.user_id = profiles.id
      ORDER BY uo.created_at ASC -- Use oldest organization relationship
      LIMIT 1
    ),
    updated_at = now()
  WHERE (company_name IS NULL OR company_name = '')
    AND EXISTS (
      SELECT 1 
      FROM user_organizations uo 
      WHERE uo.user_id = profiles.id
    );
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- Log the migration results
  RAISE NOTICE 'Company name population migration completed. Updated % profiles.', updated_count;
  
  -- Verify results
  RAISE NOTICE 'Profiles still missing company_name: %', (
    SELECT COUNT(*) 
    FROM profiles 
    WHERE company_name IS NULL OR company_name = ''
  );
END $$;

-- Add a comment to track this migration
COMMENT ON TABLE profiles IS 'Company names populated from organization relationships on 2025-07-15';