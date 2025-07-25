-- Add RLS policy for subcontractors to view work order attachments for assigned work orders
CREATE POLICY "subcontractors_can_select_work_order_attachments" 
ON work_order_attachments 
FOR SELECT 
USING (
  (jwt_user_type() = 'subcontractor'::user_type) AND 
  (work_order_id IS NOT NULL) AND 
  (work_order_id IN (
    SELECT auth_user_organization_assignments.work_order_id
    FROM auth_user_organization_assignments() auth_user_organization_assignments(work_order_id)
  ))
);