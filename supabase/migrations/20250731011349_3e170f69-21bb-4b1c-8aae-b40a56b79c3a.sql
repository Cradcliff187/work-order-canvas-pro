-- Create a function that fetches user profile
CREATE OR REPLACE FUNCTION get_user_profile(user_uuid UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN,
  is_employee BOOLEAN,
  hourly_cost_rate NUMERIC,
  hourly_billable_rate NUMERIC,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.email,
    p.first_name,
    p.last_name,
    p.phone,
    p.avatar_url,
    p.is_active,
    p.is_employee,
    p.hourly_cost_rate,
    p.hourly_billable_rate,
    p.created_at,
    p.updated_at
  FROM profiles p
  WHERE p.user_id = user_uuid;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_profile(UUID) TO authenticated;

-- Create similar function for organization members
CREATE OR REPLACE FUNCTION get_user_organizations(profile_uuid UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  organization_id UUID,
  role TEXT,
  created_at TIMESTAMPTZ,
  org_name TEXT,
  org_type TEXT,
  org_initials TEXT,
  org_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    om.id,
    om.user_id,
    om.organization_id,
    om.role::TEXT,
    om.created_at,
    o.name,
    o.organization_type::TEXT,
    o.initials,
    o.is_active
  FROM organization_members om
  JOIN organizations o ON om.organization_id = o.id
  WHERE om.user_id = profile_uuid;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_organizations(UUID) TO authenticated;