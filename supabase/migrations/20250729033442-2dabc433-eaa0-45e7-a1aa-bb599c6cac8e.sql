-- Add missing assigned_to column to work_order_assignments table
-- This column is needed for individual user assignments in addition to organization assignments

ALTER TABLE public.work_order_assignments 
ADD COLUMN assigned_to uuid REFERENCES public.profiles(id);

-- Update RLS policies for work_order_assignments table
CREATE POLICY "Internal admin manage work order assignments" ON public.work_order_assignments
FOR ALL USING (can_manage_work_orders())
WITH CHECK (can_manage_work_orders());

CREATE POLICY "Users view their own assignments" ON public.work_order_assignments
FOR SELECT USING (
  assigned_to = auth_profile_id() OR
  assigned_organization_id IN (
    SELECT organization_id FROM organization_members 
    WHERE user_id = auth_profile_id()
  )
);

-- Enable RLS on the table
ALTER TABLE public.work_order_assignments ENABLE ROW LEVEL SECURITY;