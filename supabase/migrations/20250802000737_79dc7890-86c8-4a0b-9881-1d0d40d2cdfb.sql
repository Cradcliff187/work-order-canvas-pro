-- Drop existing functions first
DROP FUNCTION IF EXISTS public.auth_user_belongs_to_organization(uuid);
DROP FUNCTION IF EXISTS public.jwt_organization_ids();
DROP FUNCTION IF EXISTS public.auto_populate_assignment_organization();

-- Recreate auth_user_belongs_to_organization() to use organization_members
CREATE OR REPLACE FUNCTION public.auth_user_belongs_to_organization(org_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  profile_id uuid;
BEGIN
  -- Get current user's profile ID
  SELECT auth_profile_id_safe() INTO profile_id;
  
  IF profile_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user belongs to the organization using organization_members
  RETURN EXISTS (
    SELECT 1 
    FROM organization_members om
    WHERE om.user_id = profile_id 
    AND om.organization_id = org_id
  );
END;
$function$;

-- Recreate jwt_organization_ids() to use organization_members  
CREATE OR REPLACE FUNCTION public.jwt_organization_ids()
 RETURNS uuid[]
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  org_ids uuid[];
BEGIN
  -- First try to get from JWT app_metadata
  SELECT 
    ARRAY(
      SELECT jsonb_array_elements_text(auth.jwt() -> 'app_metadata' -> 'organization_ids')::uuid
    ) INTO org_ids;
  
  -- If not in JWT or empty, query organization_members table directly
  IF org_ids IS NULL OR array_length(org_ids, 1) = 0 THEN
    SELECT array_agg(om.organization_id) INTO org_ids
    FROM organization_members om
    WHERE om.user_id = auth_profile_id_safe();
  END IF;
  
  RETURN COALESCE(org_ids, ARRAY[]::uuid[]);
END;
$function$;

-- Recreate auto_populate_assignment_organization() to use organization_members
CREATE OR REPLACE FUNCTION public.auto_populate_assignment_organization()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- If assigned_organization_id is not provided, try to infer it
  IF NEW.assigned_organization_id IS NULL AND NEW.assigned_to IS NOT NULL THEN
    SELECT om.organization_id INTO NEW.assigned_organization_id
    FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = NEW.assigned_to
    LIMIT 1;
  END IF;
  
  RETURN NEW;
END;
$function$;