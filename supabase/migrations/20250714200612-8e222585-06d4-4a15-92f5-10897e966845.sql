-- Create function to validate user organization assignments
CREATE OR REPLACE FUNCTION public.validate_user_organization_assignment(
  p_user_id uuid,
  p_organization_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_user_type public.user_type;
  v_org_type public.organization_type;
BEGIN
  -- Get user type from profiles table
  SELECT user_type INTO v_user_type
  FROM public.profiles
  WHERE id = p_user_id;
  
  -- Get organization type
  SELECT organization_type INTO v_org_type
  FROM public.organizations
  WHERE id = p_organization_id;
  
  -- If either user or organization doesn't exist, return false
  IF v_user_type IS NULL OR v_org_type IS NULL THEN
    RETURN false;
  END IF;
  
  -- Business logic rules:
  -- 1. Admin users can belong to any organization type
  -- 2. Employee users can only belong to internal organizations
  -- 3. Partner users can only belong to partner organizations
  -- 4. Subcontractor users can only belong to subcontractor organizations
  
  CASE v_user_type
    WHEN 'admin' THEN
      -- Admins can belong to any organization
      RETURN true;
    WHEN 'employee' THEN
      -- Employees can only belong to internal organizations
      RETURN v_org_type = 'internal';
    WHEN 'partner' THEN
      -- Partners can only belong to partner organizations
      RETURN v_org_type = 'partner';
    WHEN 'subcontractor' THEN
      -- Subcontractors can only belong to subcontractor organizations
      RETURN v_org_type = 'subcontractor';
    ELSE
      -- Unknown user type, deny by default
      RETURN false;
  END CASE;
END;
$$;

-- Create trigger function to validate user organization assignments
CREATE OR REPLACE FUNCTION public.validate_user_organization_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate the assignment
  IF NOT public.validate_user_organization_assignment(NEW.user_id, NEW.organization_id) THEN
    -- Get user and organization details for error message
    DECLARE
      v_user_type public.user_type;
      v_org_type public.organization_type;
      v_user_name text;
      v_org_name text;
    BEGIN
      SELECT p.user_type, p.first_name || ' ' || p.last_name
      INTO v_user_type, v_user_name
      FROM public.profiles p
      WHERE p.id = NEW.user_id;
      
      SELECT o.organization_type, o.name
      INTO v_org_type, v_org_name
      FROM public.organizations o
      WHERE o.id = NEW.organization_id;
      
      RAISE EXCEPTION 'User organization assignment validation failed: % user "%" cannot be assigned to % organization "%". Valid assignments: admin→any, employee→internal, partner→partner, subcontractor→subcontractor.',
        COALESCE(v_user_type::text, 'unknown'),
        COALESCE(v_user_name, 'unknown'),
        COALESCE(v_org_type::text, 'unknown'),
        COALESCE(v_org_name, 'unknown');
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add trigger to user_organizations table
DROP TRIGGER IF EXISTS validate_user_organization_assignment_trigger ON public.user_organizations;
CREATE TRIGGER validate_user_organization_assignment_trigger
  BEFORE INSERT OR UPDATE ON public.user_organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_user_organization_trigger();

-- Add helpful comment
COMMENT ON FUNCTION public.validate_user_organization_assignment(uuid, uuid) IS 
'Validates that user types match organization types: admin→any, employee→internal, partner→partner, subcontractor→subcontractor';

COMMENT ON FUNCTION public.validate_user_organization_trigger() IS 
'Trigger function that validates user organization assignments before INSERT/UPDATE operations';

-- Test the validation with a simple query (this will show existing violations if any)
DO $$
DECLARE
  violation_count integer;
BEGIN
  SELECT COUNT(*) INTO violation_count
  FROM public.user_organizations uo
  JOIN public.profiles p ON p.id = uo.user_id
  JOIN public.organizations o ON o.id = uo.organization_id
  WHERE NOT public.validate_user_organization_assignment(uo.user_id, uo.organization_id);
  
  IF violation_count > 0 THEN
    RAISE WARNING 'Found % existing user organization assignment violations that should be reviewed', violation_count;
  ELSE
    RAISE NOTICE 'All existing user organization assignments are valid';
  END IF;
END;
$$;