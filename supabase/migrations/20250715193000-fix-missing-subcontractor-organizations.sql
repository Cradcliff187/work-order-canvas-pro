-- Fix missing user_organizations for subcontractors
DO $$
DECLARE
  fixed_count INTEGER := 0;
  sub_record RECORD;
  org_id UUID;
BEGIN
  -- Find subcontractors without organizations
  FOR sub_record IN 
    SELECT p.id as profile_id, p.first_name, p.last_name, p.email
    FROM profiles p
    WHERE p.user_type = 'subcontractor'
    AND NOT EXISTS (
      SELECT 1 FROM user_organizations uo 
      WHERE uo.user_id = p.id
    )
  LOOP
    -- Try to find their organization from work order assignments
    SELECT DISTINCT woa.assigned_organization_id INTO org_id
    FROM work_order_assignments woa
    WHERE woa.assigned_to = sub_record.profile_id
    AND woa.assigned_organization_id IS NOT NULL
    LIMIT 1;
    
    -- If we found an organization, create the link
    IF org_id IS NOT NULL THEN
      INSERT INTO user_organizations (user_id, organization_id)
      VALUES (sub_record.profile_id, org_id)
      ON CONFLICT (user_id, organization_id) DO NOTHING;
      
      fixed_count := fixed_count + 1;
      RAISE NOTICE 'Fixed organization for %: % %', 
        sub_record.email, sub_record.first_name, sub_record.last_name;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Fixed % subcontractor organization assignments', fixed_count;
END $$;