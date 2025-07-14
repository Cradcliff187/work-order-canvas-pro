-- Add RLS policy to allow subcontractors to view their own organizations
CREATE POLICY "Subcontractors can view their own organizations" 
ON public.organizations 
FOR SELECT 
TO authenticated
USING (
  auth_user_type() = 'subcontractor' 
  AND auth_user_belongs_to_organization(id)
);