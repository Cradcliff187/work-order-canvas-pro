-- Fix RLS policies for work_order_attachments to handle missing JWT metadata
-- This will allow admin/employee users to upload attachments even when JWT metadata is not yet available

-- Drop the existing restrictive policies
DROP POLICY IF EXISTS "employees_can_insert_work_order_attachments" ON work_order_attachments;
DROP POLICY IF EXISTS "admins_can_insert_work_order_attachments" ON work_order_attachments;

-- Create more flexible policies with fallback mechanisms
CREATE POLICY "admins_employees_can_insert_work_order_attachments" 
ON work_order_attachments 
FOR INSERT 
WITH CHECK (
  -- Allow if user is admin or employee based on JWT metadata
  (jwt_user_type() IN ('admin', 'employee'))
  OR
  -- Fallback: Allow if user is admin/employee based on direct profile lookup (when JWT metadata is missing)
  (uploaded_by_user_id IN (
    SELECT p.id 
    FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.user_type IN ('admin', 'employee')
    AND p.is_active = true
  ))
);

-- Recreate admin-specific policy with fallback
CREATE POLICY "admins_can_manage_work_order_attachments" 
ON work_order_attachments 
FOR ALL
USING (
  -- Allow if user is admin based on JWT metadata
  jwt_is_admin()
  OR
  -- Fallback: Allow if user is admin based on direct profile lookup
  (EXISTS (
    SELECT 1 
    FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.user_type = 'admin'
    AND p.is_active = true
  ))
)
WITH CHECK (
  -- Allow if user is admin based on JWT metadata
  jwt_is_admin()
  OR
  -- Fallback: Allow if user is admin based on direct profile lookup
  (EXISTS (
    SELECT 1 
    FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.user_type = 'admin'
    AND p.is_active = true
  ))
);