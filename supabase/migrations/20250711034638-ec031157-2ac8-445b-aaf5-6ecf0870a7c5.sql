-- Migration: Update profiles table RLS policies to support employee user type
-- Drop existing broad policy and replace with granular user-type specific policies

-- Drop the existing broad "Authenticated users can view profiles" policy
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Create new granular SELECT policies for each user type

-- 1. Self-access policy (all users can view their own profile)
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (id = public.auth_profile_id());

-- 2. Employee policy (employees can view all profiles for operational needs)
CREATE POLICY "Employees can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.auth_user_type() = 'employee');

-- 3. Updated partner policy (view profiles in their organizations, excluding employees)
CREATE POLICY "Partners can view profiles in their organizations"
ON public.profiles FOR SELECT
TO authenticated
USING (
  public.auth_user_type() = 'partner'
  AND id IN (
    SELECT p.id 
    FROM public.profiles p
    JOIN public.user_organizations uo ON p.id = uo.user_id
    WHERE public.auth_user_belongs_to_organization(uo.organization_id)
    AND p.user_type != 'employee'
  )
);

-- 4. Subcontractor policy (view own profile + partner profiles from work order organizations)
CREATE POLICY "Subcontractors can view relevant profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  public.auth_user_type() = 'subcontractor'
  AND (
    id = public.auth_profile_id() -- Own profile
    OR id IN ( -- Partners in their work order organizations
      SELECT DISTINCT p.id 
      FROM public.profiles p
      JOIN public.user_organizations uo ON p.id = uo.user_id
      JOIN public.work_orders wo ON wo.organization_id = uo.organization_id
      WHERE wo.assigned_to = public.auth_profile_id()
      AND p.user_type = 'partner'
    )
  )
);

-- Add comments for clarity
COMMENT ON POLICY "Users can view their own profile" ON public.profiles IS 
'Allows all authenticated users to view their own profile information';

COMMENT ON POLICY "Employees can view all profiles" ON public.profiles IS 
'Allows employees to view all profiles for operational and administrative purposes';

COMMENT ON POLICY "Partners can view profiles in their organizations" ON public.profiles IS 
'Allows partners to view profiles of other users in their organizations, excluding employee profiles for data isolation';

COMMENT ON POLICY "Subcontractors can view relevant profiles" ON public.profiles IS 
'Allows subcontractors to view their own profile and partner profiles from organizations where they have work orders';