-- Add helper function to get work orders assigned to user's organizations
CREATE OR REPLACE FUNCTION public.auth_user_organization_assignments()
RETURNS TABLE(work_order_id uuid)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT woa.work_order_id 
  FROM work_order_assignments woa
  WHERE woa.assigned_organization_id IN (
    SELECT organization_id 
    FROM public.auth_user_organizations()
  );
END;
$$;

-- Function to auto-populate assigned_organization_id when assignments are created
CREATE OR REPLACE FUNCTION public.auto_populate_assignment_organization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  assignee_org_id uuid;
BEGIN
  -- Get the organization ID for the assigned user
  SELECT uo.organization_id INTO assignee_org_id
  FROM user_organizations uo
  WHERE uo.user_id = NEW.assigned_to
  LIMIT 1;
  
  -- Set the assigned_organization_id if found
  IF assignee_org_id IS NOT NULL THEN
    NEW.assigned_organization_id := assignee_org_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-populate assigned_organization_id
CREATE TRIGGER auto_populate_assignment_organization_trigger
  BEFORE INSERT ON public.work_order_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_populate_assignment_organization();

-- Add enhanced RLS policy for organization-based subcontractor access
CREATE POLICY "Subcontractors can view assignments for their organization work orders"
ON public.work_order_assignments
FOR SELECT
TO authenticated
USING (
  auth_user_type() = 'subcontractor' AND
  work_order_id IN (
    SELECT work_order_id 
    FROM public.auth_user_organization_assignments()
  )
);

-- Add performance indexes for organization-based queries
CREATE INDEX IF NOT EXISTS idx_work_order_assignments_org_type_combo 
ON public.work_order_assignments(assigned_organization_id, assignment_type);

CREATE INDEX IF NOT EXISTS idx_work_order_assignments_org_wo_combo 
ON public.work_order_assignments(assigned_organization_id, work_order_id);

-- Migrate existing assignments: populate assigned_organization_id for existing records
UPDATE public.work_order_assignments 
SET assigned_organization_id = (
  SELECT uo.organization_id
  FROM user_organizations uo
  WHERE uo.user_id = work_order_assignments.assigned_to
  LIMIT 1
)
WHERE assigned_organization_id IS NULL;