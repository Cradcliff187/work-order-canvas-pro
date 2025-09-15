-- Add admin override fields to receipts table
ALTER TABLE receipts 
ADD COLUMN created_by UUID REFERENCES profiles(id),
ADD COLUMN is_admin_entered BOOLEAN DEFAULT false;

-- Update RLS policies to allow admins to create receipts on behalf of employees
CREATE POLICY "admins_can_create_receipts_for_employees" 
ON receipts 
FOR INSERT 
WITH CHECK (
  jwt_is_admin() AND (
    -- Admin can create receipt for themselves
    employee_user_id = auth_profile_id() OR
    -- Admin can create receipt for another employee  
    (employee_user_id IS NOT NULL AND is_admin_entered = true) OR
    -- Admin can create receipt directly for work order (no employee)
    employee_user_id IS NULL
  )
);

-- Allow admins to view all receipts including admin-created ones
CREATE POLICY "admins_can_view_all_receipts_including_admin_created"
ON receipts
FOR SELECT  
USING (
  jwt_is_admin() OR 
  employee_user_id = auth_profile_id()
);