-- Fix auth_user_organization_assignments function to use correct organization lookup
-- This resolves runtime errors caused by calling non-existent auth_user_organizations()

CREATE OR REPLACE FUNCTION public.auth_user_organization_assignments()
RETURNS TABLE(work_order_id uuid)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT woa.work_order_id 
  FROM work_order_assignments woa
  WHERE woa.assigned_organization_id = ANY(jwt_organization_ids());
END;
$$;