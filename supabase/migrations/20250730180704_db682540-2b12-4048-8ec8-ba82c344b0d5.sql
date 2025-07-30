-- Fix profiles table RLS policies to work with organization-based auth system

-- Drop existing problematic policies that may be causing conflicts
DROP POLICY IF EXISTS "emergency_admin_bypass_temp" ON public.profiles;
DROP POLICY IF EXISTS "fixed_profile_create_jwt_only" ON public.profiles;
DROP POLICY IF EXISTS "fixed_profile_read_jwt_only" ON public.profiles;
DROP POLICY IF EXISTS "fixed_profile_update_jwt_only" ON public.profiles;

-- Create clean, working RLS policies for profiles
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
  FOR SELECT 
  USING (
    user_id = auth.uid() OR 
    id = auth_profile_id_safe() OR
    has_internal_role(ARRAY['admin']::organization_role[])
  );

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "profiles_update_own_or_admin" ON public.profiles
  FOR UPDATE 
  USING (
    user_id = auth.uid() OR 
    id = auth_profile_id_safe() OR
    has_internal_role(ARRAY['admin']::organization_role[])
  )
  WITH CHECK (
    user_id = auth.uid() OR 
    has_internal_role(ARRAY['admin']::organization_role[])
  );