-- Add missing RLS policy to allow internal users to create work orders
CREATE POLICY "Internal users can create work orders" 
ON public.work_orders
FOR INSERT
WITH CHECK (can_manage_work_orders());