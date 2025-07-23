-- Fix auth_user_organization_assignments function to handle missing JWT metadata during user creation
-- This resolves 400 errors when creating new users who don't have JWT metadata populated yet

CREATE OR REPLACE FUNCTION public.auth_user_organization_assignments()
RETURNS TABLE(work_order_id uuid)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  org_ids uuid[];
BEGIN
  -- Try to get organization IDs from JWT first
  BEGIN
    SELECT ARRAY(
      SELECT jsonb_array_elements_text(auth.jwt() -> 'app_metadata' -> 'organization_ids')::uuid
    ) INTO org_ids;
  EXCEPTION WHEN OTHERS THEN
    org_ids := NULL;
  END;
  
  -- If not in JWT or empty, query directly from database
  IF org_ids IS NULL OR array_length(org_ids, 1) IS NULL THEN
    SELECT array_agg(uo.organization_id) INTO org_ids
    FROM user_organizations uo
    JOIN profiles p ON p.id = uo.user_id
    WHERE p.user_id = auth.uid();
  END IF;
  
  -- If still no organizations, return empty result
  IF org_ids IS NULL OR array_length(org_ids, 1) IS NULL THEN
    RETURN;
  END IF;
  
  -- Return work orders assigned to user's organizations
  RETURN QUERY
  SELECT DISTINCT woa.work_order_id 
  FROM work_order_assignments woa
  WHERE woa.assigned_organization_id = ANY(org_ids);
END;
$$;

-- Also ensure jwt_organization_ids function handles missing metadata gracefully
CREATE OR REPLACE FUNCTION public.jwt_organization_ids()
RETURNS uuid[]
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  org_ids uuid[];
BEGIN
  -- First try to get from JWT app_metadata
  BEGIN
    SELECT ARRAY(
      SELECT jsonb_array_elements_text(auth.jwt() -> 'app_metadata' -> 'organization_ids')::uuid
    ) INTO org_ids;
  EXCEPTION WHEN OTHERS THEN
    org_ids := NULL;
  END;
  
  -- If not in JWT or empty, query directly
  IF org_ids IS NULL OR array_length(org_ids, 1) IS NULL THEN
    SELECT array_agg(uo.organization_id) INTO org_ids
    FROM user_organizations uo
    JOIN profiles p ON p.id = uo.user_id
    WHERE p.user_id = auth.uid();
  END IF;
  
  -- Return empty array if still null
  RETURN COALESCE(org_ids, '{}');
END;
$$;