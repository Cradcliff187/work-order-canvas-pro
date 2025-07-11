-- Add RLS policy to allow admins to update employee profiles
CREATE POLICY "Admins can update employee profiles" 
ON public.profiles 
FOR UPDATE 
USING (
  auth_is_admin() AND is_employee = true
)
WITH CHECK (
  auth_is_admin() AND is_employee = true
);