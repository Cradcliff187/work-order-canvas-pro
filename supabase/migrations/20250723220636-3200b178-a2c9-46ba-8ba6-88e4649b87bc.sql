-- Fix User Creation Errors
-- This migration fixes the missing auth_user_id() function and related issues

-- 1. Create the missing auth_user_id() function
CREATE OR REPLACE FUNCTION public.auth_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid()
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.auth_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_id() TO service_role;

-- 2. Ensure user_organizations table has proper permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_organizations TO authenticated;
GRANT ALL ON public.user_organizations TO service_role;

-- 3. Fix the auth_user_organization_assignments function to use jwt_organization_ids
CREATE OR REPLACE FUNCTION public.auth_user_organization_assignments()
RETURNS TABLE(work_order_id uuid)
LANGUAGE plpgsql
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT woa.work_order_id 
  FROM work_order_assignments woa
  WHERE woa.assigned_organization_id = ANY(jwt_organization_ids());
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.auth_user_organization_assignments() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_organization_assignments() TO service_role;

-- 4. Ensure handle_new_user trigger function has proper error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_profile_id uuid;
  internal_org_id uuid;
BEGIN
  -- Generate UUID for the new profile
  new_profile_id := gen_random_uuid();
  
  -- Insert profile with explicit ID
  INSERT INTO public.profiles (id, user_id, email, created_at, updated_at)
  VALUES (
    new_profile_id,
    NEW.id,
    NEW.email,
    NOW(),
    NOW()
  );
  
  -- For employees, auto-assign to internal organization
  IF NEW.raw_user_meta_data->>'user_type' = 'employee' THEN
    -- Get the internal organization
    SELECT id INTO internal_org_id
    FROM public.organizations
    WHERE organization_type = 'internal'
    AND is_active = true
    ORDER BY created_at ASC
    LIMIT 1;
    
    -- Only assign if we found an internal organization
    IF internal_org_id IS NOT NULL THEN
      BEGIN
        INSERT INTO public.user_organizations (user_id, organization_id, is_primary)
        VALUES (new_profile_id, internal_org_id, true);
      EXCEPTION WHEN OTHERS THEN
        -- Log the error but don't fail user creation
        RAISE WARNING 'Failed to assign user to internal organization: %', SQLERRM;
      END;
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log the error but allow user creation to continue
  RAISE WARNING 'Failed to complete user setup for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- 5. Ensure email_logs table doesn't depend on auth_user_id in triggers
-- Check if audit_log_changes trigger exists on email_logs
DO $$
BEGIN
  -- Drop the trigger if it exists
  DROP TRIGGER IF EXISTS audit_log_changes ON public.email_logs;
END $$;

-- 6. Add a simple audit trigger for email_logs that doesn't use auth_user_id
CREATE OR REPLACE FUNCTION public.log_email_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (
      table_name,
      operation,
      record_id,
      new_values,
      created_by
    ) VALUES (
      'email_logs',
      'INSERT',
      NEW.id,
      to_jsonb(NEW),
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER email_log_audit_trigger
AFTER INSERT ON public.email_logs
FOR EACH ROW
EXECUTE FUNCTION public.log_email_audit();

-- 7. Verify all required functions exist
DO $$
BEGIN
  -- Check for jwt_organization_ids
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'jwt_organization_ids'
  ) THEN
    RAISE EXCEPTION 'jwt_organization_ids function is missing - please run the JWT metadata fix migration first';
  END IF;
END $$;

-- 8. Grant necessary permissions on profiles table
GRANT SELECT, INSERT, UPDATE ON public.profiles TO service_role;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'User creation error fixes applied successfully';
END $$;