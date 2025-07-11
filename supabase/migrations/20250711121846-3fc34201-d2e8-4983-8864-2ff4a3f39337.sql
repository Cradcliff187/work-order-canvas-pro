-- Add RLS policies for work_order_assignments table

-- Admins can manage all work order assignments
CREATE POLICY "Admins can manage all work order assignments"
ON public.work_order_assignments
FOR ALL
TO authenticated
USING (auth_is_admin())
WITH CHECK (auth_is_admin());

-- Partners can view assignments for work orders from their organizations
CREATE POLICY "Partners can view assignments for their organization work orders"
ON public.work_order_assignments
FOR SELECT
TO authenticated
USING (
  auth_user_type() = 'partner' AND
  work_order_id IN (
    SELECT wo.id 
    FROM work_orders wo 
    WHERE auth_user_belongs_to_organization(wo.organization_id)
  )
);

-- Subcontractors can view assignments for work orders they're assigned to
CREATE POLICY "Subcontractors can view their own assignments"
ON public.work_order_assignments
FOR SELECT
TO authenticated
USING (
  auth_user_type() = 'subcontractor' AND
  assigned_to = auth_profile_id()
);

-- Employees can view assignments for work orders they're assigned to
CREATE POLICY "Employees can view their own assignments"
ON public.work_order_assignments
FOR SELECT
TO authenticated
USING (
  auth_user_type() = 'employee' AND
  assigned_to = auth_profile_id()
);

-- Add additional performance indexes for common query patterns (non-concurrent)
CREATE INDEX IF NOT EXISTS idx_work_order_assignments_assignee_type_combo 
ON public.work_order_assignments(assigned_to, assignment_type);

CREATE INDEX IF NOT EXISTS idx_work_order_assignments_wo_assignee_combo 
ON public.work_order_assignments(work_order_id, assigned_to);

-- Add helper function to check if user can view assignment
CREATE OR REPLACE FUNCTION public.auth_user_can_view_assignment(assignment_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  -- Admins can view all assignments
  IF auth_is_admin() THEN
    RETURN true;
  END IF;
  
  -- Check if user is assigned to this assignment
  IF EXISTS (
    SELECT 1 
    FROM work_order_assignments woa
    WHERE woa.id = assignment_id 
    AND woa.assigned_to = auth_profile_id()
  ) THEN
    RETURN true;
  END IF;
  
  -- Check if user is a partner of the organization that owns the work order
  IF auth_user_type() = 'partner' AND EXISTS (
    SELECT 1 
    FROM work_order_assignments woa
    JOIN work_orders wo ON wo.id = woa.work_order_id
    WHERE woa.id = assignment_id 
    AND auth_user_belongs_to_organization(wo.organization_id)
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;