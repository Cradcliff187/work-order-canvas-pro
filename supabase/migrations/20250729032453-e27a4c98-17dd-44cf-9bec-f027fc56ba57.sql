-- Create user_organizations table to bridge the migration gap
CREATE TABLE IF NOT EXISTS public.user_organizations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

-- Enable RLS
ALTER TABLE public.user_organizations ENABLE ROW LEVEL SECURITY;

-- Create policies for user_organizations table
CREATE POLICY "Users can view their own organization memberships" 
ON public.user_organizations 
FOR SELECT 
USING (user_id = auth_profile_id());

CREATE POLICY "Admins can manage all organization memberships" 
ON public.user_organizations 
FOR ALL 
USING (jwt_is_admin()) 
WITH CHECK (jwt_is_admin());

-- Migrate existing organization_members data to user_organizations
INSERT INTO public.user_organizations (user_id, organization_id, created_at)
SELECT DISTINCT user_id, organization_id, created_at 
FROM public.organization_members 
ON CONFLICT (user_id, organization_id) DO NOTHING;

-- Fix infinite recursion in organization_members policies by simplifying them
DROP POLICY IF EXISTS "View own organization memberships" ON public.organization_members;
DROP POLICY IF EXISTS "Internal admin manage organization members" ON public.organization_members;

-- Create simpler, non-recursive policies for organization_members
CREATE POLICY "organization_members_select_policy" 
ON public.organization_members 
FOR SELECT 
USING (
  user_id = auth_profile_id() OR 
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND raw_app_meta_data->>'user_type' = 'admin'
  )
);

CREATE POLICY "organization_members_admin_manage_policy" 
ON public.organization_members 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND raw_app_meta_data->>'user_type' = 'admin'
  )
) 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND raw_app_meta_data->>'user_type' = 'admin'
  )
);