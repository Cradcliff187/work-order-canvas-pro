-- Fix Critical Database Schema Issues for User Creation
-- This migration addresses missing tables and columns that are breaking user creation

-- Step 1: Create user_organizations table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_organizations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

-- Add RLS to user_organizations table
ALTER TABLE public.user_organizations ENABLE ROW LEVEL SECURITY;

-- Create policies for user_organizations
CREATE POLICY "Admins can manage all user organizations" ON public.user_organizations
FOR ALL TO authenticated
USING (jwt_is_admin())
WITH CHECK (jwt_is_admin());

CREATE POLICY "Users can view their own organization relationships" ON public.user_organizations
FOR SELECT TO authenticated
USING (user_id = jwt_profile_id());

-- Step 2: Fix audit_logs table - add missing 'operation' column
-- Check if column exists and add it if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_logs' 
    AND column_name = 'operation'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.audit_logs ADD COLUMN operation text;
  END IF;
END $$;

-- Step 3: Update audit_logs constraint to include 'operation' 
DROP CONSTRAINT IF EXISTS audit_logs_action_check ON public.audit_logs;
ALTER TABLE public.audit_logs 
ADD CONSTRAINT audit_logs_action_check 
CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'OPERATION'));

-- Step 4: Create missing JWT helper functions if they don't exist
CREATE OR REPLACE FUNCTION public.jwt_organization_ids()
RETURNS uuid[]
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  org_ids uuid[];
  jwt_org_ids uuid[];
BEGIN
  -- First try to get from JWT app_metadata
  SELECT (auth.jwt() -> 'app_metadata' -> 'organization_ids')::text::uuid[] INTO jwt_org_ids;
  
  -- If not in JWT or empty, query user_organizations table directly
  IF jwt_org_ids IS NULL OR array_length(jwt_org_ids, 1) IS NULL THEN
    SELECT array_agg(uo.organization_id) INTO org_ids
    FROM user_organizations uo
    WHERE uo.user_id = jwt_profile_id();
    
    -- Return empty array if no organizations found
    RETURN COALESCE(org_ids, '{}');
  END IF;
  
  RETURN jwt_org_ids;
END;
$$;

-- Step 5: Create auth_user_id helper function
CREATE OR REPLACE FUNCTION public.auth_user_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN auth.uid();
END;
$$;

-- Step 6: Fix sync functions for JWT metadata
CREATE OR REPLACE FUNCTION public.sync_auth_user_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_organization_ids uuid[];
BEGIN
  -- Get organization IDs for the user
  SELECT array_agg(uo.organization_id) INTO v_organization_ids
  FROM user_organizations uo
  WHERE uo.user_id = NEW.id;
  
  -- Handle case where no organizations exist
  IF v_organization_ids IS NULL THEN
    v_organization_ids := '{}';
  END IF;
  
  -- Update auth.users app_metadata
  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object(
      'user_type', NEW.user_type,
      'profile_id', NEW.id,
      'organization_ids', v_organization_ids,
      'is_active', NEW.is_active
    )
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- Step 7: Create trigger for profile metadata sync
DROP TRIGGER IF EXISTS sync_user_type_to_auth ON public.profiles;
CREATE TRIGGER sync_user_type_to_auth
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW 
  EXECUTE FUNCTION public.sync_auth_user_metadata();

-- Step 8: Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_organizations TO authenticated;
GRANT ALL ON public.user_organizations TO service_role;

GRANT EXECUTE ON FUNCTION public.jwt_organization_ids() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.auth_user_id() TO authenticated, service_role;