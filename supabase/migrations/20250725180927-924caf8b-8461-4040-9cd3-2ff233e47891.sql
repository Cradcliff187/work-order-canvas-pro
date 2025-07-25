-- First, drop dependent objects that reference assigned_to column
-- Drop materialized view that depends on assigned_to
DROP MATERIALIZED VIEW IF EXISTS mv_subcontractor_performance;

-- Drop policies that depend on assigned_to column
DROP POLICY IF EXISTS "Subcontractors can view organization work orders" ON work_orders;
DROP POLICY IF EXISTS "subcontractors_can_insert_own_work_order_reports" ON work_order_reports;

-- Now remove the legacy assignment columns
ALTER TABLE work_orders 
DROP COLUMN IF EXISTS assigned_to,
DROP COLUMN IF EXISTS assigned_to_type;

-- Recreate the subcontractor work orders policy using work_order_assignments
CREATE POLICY "Subcontractors can view assigned work orders" 
ON work_orders 
FOR SELECT 
USING (
  jwt_user_type() = 'subcontractor' AND 
  id IN (
    SELECT woa.work_order_id 
    FROM work_order_assignments woa 
    WHERE woa.assigned_to = jwt_profile_id()
  )
);

-- Recreate the work order reports policy using work_order_assignments  
CREATE POLICY "subcontractors_can_insert_own_work_order_reports" 
ON work_order_reports 
FOR INSERT 
WITH CHECK (
  jwt_user_type() = 'subcontractor' AND 
  subcontractor_user_id = jwt_profile_id() AND
  work_order_id IN (
    SELECT woa.work_order_id 
    FROM work_order_assignments woa 
    WHERE woa.assigned_to = jwt_profile_id()
  )
);