-- Create a view that combines profiles with organization data
CREATE OR REPLACE VIEW public.user_profiles_with_organization AS
SELECT 
  p.id,
  p.user_id,
  p.email,
  p.first_name,
  p.last_name,
  p.user_type,
  p.phone,
  p.avatar_url,
  p.is_active,
  p.is_employee,
  p.hourly_cost_rate,
  p.hourly_billable_rate,
  p.created_at,
  p.updated_at,
  -- Get organization name through user_organizations relationship
  o.name as company_name,
  o.id as organization_id,
  o.organization_type
FROM profiles p
LEFT JOIN user_organizations uo ON uo.user_id = p.id
LEFT JOIN organizations o ON o.id = uo.organization_id;

-- Grant necessary permissions on the view
GRANT SELECT ON public.user_profiles_with_organization TO authenticated;
GRANT SELECT ON public.user_profiles_with_organization TO anon;

-- Drop the company_name column from profiles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS company_name;