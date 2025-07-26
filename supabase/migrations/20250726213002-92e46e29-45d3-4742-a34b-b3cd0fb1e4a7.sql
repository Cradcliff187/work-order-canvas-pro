
-- Enable RLS on email_queue table and add security policies
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

-- Allow admins full access to email_queue
CREATE POLICY "admins_can_manage_email_queue" 
ON public.email_queue 
FOR ALL 
TO authenticated 
USING (jwt_is_admin()) 
WITH CHECK (jwt_is_admin());

-- Allow employees to view email_queue for monitoring purposes
CREATE POLICY "employees_can_select_email_queue" 
ON public.email_queue 
FOR SELECT 
TO authenticated 
USING (jwt_user_type() = 'employee'::user_type);

-- Enable RLS on trigger_debug_log table and add security policies
ALTER TABLE public.trigger_debug_log ENABLE ROW LEVEL SECURITY;

-- Allow only admins to access trigger_debug_log (debug/system info)
CREATE POLICY "admins_can_manage_trigger_debug_log" 
ON public.trigger_debug_log 
FOR ALL 
TO authenticated 
USING (jwt_is_admin()) 
WITH CHECK (jwt_is_admin());
