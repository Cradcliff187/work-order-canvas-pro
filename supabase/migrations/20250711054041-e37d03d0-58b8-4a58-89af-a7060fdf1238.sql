-- Add RLS policies for employee_reports table

-- Enable RLS on employee_reports table
ALTER TABLE public.employee_reports ENABLE ROW LEVEL SECURITY;

-- Employees can view their own reports
CREATE POLICY "Employees can view their own reports" 
ON public.employee_reports 
FOR SELECT 
USING (employee_user_id = auth_profile_id());

-- Employees can create their own reports
CREATE POLICY "Employees can create their own reports" 
ON public.employee_reports 
FOR INSERT 
WITH CHECK (employee_user_id = auth_profile_id());

-- Employees can update their own reports (if needed for drafts)
CREATE POLICY "Employees can update their own reports" 
ON public.employee_reports 
FOR UPDATE 
USING (employee_user_id = auth_profile_id());

-- Admins can view all employee reports
CREATE POLICY "Admins can view all employee reports" 
ON public.employee_reports 
FOR SELECT 
USING (auth_is_admin());

-- Admins can manage all employee reports
CREATE POLICY "Admins can manage all employee reports" 
ON public.employee_reports 
FOR ALL 
USING (auth_is_admin())
WITH CHECK (auth_is_admin());

-- Add RLS policies for receipts table if they don't exist

-- Enable RLS on receipts table
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

-- Employees can view their own receipts
CREATE POLICY "Employees can view their own receipts" 
ON public.receipts 
FOR SELECT 
USING (employee_user_id = auth_profile_id());

-- Employees can create their own receipts
CREATE POLICY "Employees can create their own receipts" 
ON public.receipts 
FOR INSERT 
WITH CHECK (employee_user_id = auth_profile_id());

-- Employees can update their own receipts
CREATE POLICY "Employees can update their own receipts" 
ON public.receipts 
FOR UPDATE 
USING (employee_user_id = auth_profile_id());

-- Admins can view all receipts
CREATE POLICY "Admins can view all receipts" 
ON public.receipts 
FOR SELECT 
USING (auth_is_admin());

-- Admins can manage all receipts
CREATE POLICY "Admins can manage all receipts" 
ON public.receipts 
FOR ALL 
USING (auth_is_admin())
WITH CHECK (auth_is_admin());

-- Add RLS policies for receipt_work_orders table

-- Enable RLS on receipt_work_orders table
ALTER TABLE public.receipt_work_orders ENABLE ROW LEVEL SECURITY;

-- Employees can view receipt allocations for their receipts
CREATE POLICY "Employees can view their receipt allocations" 
ON public.receipt_work_orders 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.receipts r 
  WHERE r.id = receipt_work_orders.receipt_id 
  AND r.employee_user_id = auth_profile_id()
));

-- Employees can create receipt allocations for their receipts
CREATE POLICY "Employees can create their receipt allocations" 
ON public.receipt_work_orders 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.receipts r 
  WHERE r.id = receipt_work_orders.receipt_id 
  AND r.employee_user_id = auth_profile_id()
));

-- Admins can view all receipt allocations
CREATE POLICY "Admins can view all receipt allocations" 
ON public.receipt_work_orders 
FOR SELECT 
USING (auth_is_admin());

-- Admins can manage all receipt allocations
CREATE POLICY "Admins can manage all receipt allocations" 
ON public.receipt_work_orders 
FOR ALL 
USING (auth_is_admin())
WITH CHECK (auth_is_admin());