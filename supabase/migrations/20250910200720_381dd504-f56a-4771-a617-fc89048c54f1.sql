-- Start transaction for safety
BEGIN;

-- 1. Make work_order_id nullable (since projects don't need work orders)
ALTER TABLE employee_reports 
ALTER COLUMN work_order_id DROP NOT NULL;

-- 2. Add check constraint to ensure at least one work item is specified
ALTER TABLE employee_reports 
ADD CONSTRAINT check_has_work_item 
CHECK (work_order_id IS NOT NULL OR project_id IS NOT NULL);

-- 3. Drop the old unique constraint
ALTER TABLE employee_reports 
DROP CONSTRAINT employee_reports_work_order_date_unique;

-- 4. Create new unique constraint that properly handles NULLs
-- This allows one entry per day for:
-- - Each work_order_id (when project_id is null)
-- - Each project_id (when work_order_id is null)  
-- - Each combination (when both are specified)
CREATE UNIQUE INDEX employee_reports_daily_work_unique 
ON employee_reports (employee_user_id, report_date, COALESCE(work_order_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(project_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- 5. Verify the changes
SELECT 
  column_name,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'employee_reports' 
  AND column_name = 'work_order_id';

-- If everything looks good, commit
COMMIT;