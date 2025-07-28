-- Enable RLS on email_queue_processing_log table
ALTER TABLE public.email_queue_processing_log ENABLE ROW LEVEL SECURITY;

-- Create admin access policy
CREATE POLICY "admins_can_manage_email_queue_processing_log" 
ON public.email_queue_processing_log
FOR ALL 
USING (jwt_is_admin()) 
WITH CHECK (jwt_is_admin());

-- Create employee read access policy
CREATE POLICY "employees_can_select_email_queue_processing_log" 
ON public.email_queue_processing_log
FOR SELECT 
USING (jwt_user_type() = 'employee'::user_type);