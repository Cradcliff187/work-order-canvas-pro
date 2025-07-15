-- Migration: Fix user_profiles_with_organization security issues
-- Adds company_name back to profiles table with auto-update triggers

-- Step 1: Revoke anonymous access to problematic view
REVOKE SELECT ON public.user_profiles_with_organization FROM anon;

-- Step 2: Add company_name column back to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS company_name TEXT;

-- Step 3: Populate company_name from current organization relationships
UPDATE public.profiles 
SET company_name = (
  SELECT o.name 
  FROM organizations o
  JOIN user_organizations uo ON o.id = uo.organization_id
  WHERE uo.user_id = profiles.id
  ORDER BY uo.created_at ASC
  LIMIT 1
)
WHERE company_name IS NULL;

-- Step 4: Create trigger function to auto-update company_name
CREATE OR REPLACE FUNCTION update_profile_company_name()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the user's profile with their primary organization name
  UPDATE profiles 
  SET company_name = (
    SELECT o.name 
    FROM organizations o
    JOIN user_organizations uo ON o.id = uo.organization_id
    WHERE uo.user_id = NEW.user_id
    ORDER BY uo.created_at ASC
    LIMIT 1
  )
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create triggers
CREATE TRIGGER update_profile_company_on_user_org_insert
  AFTER INSERT ON user_organizations
  FOR EACH ROW EXECUTE FUNCTION update_profile_company_name();

CREATE TRIGGER update_profile_company_on_user_org_update  
  AFTER UPDATE ON user_organizations
  FOR EACH ROW EXECUTE FUNCTION update_profile_company_name();

-- Step 6: Drop and recreate materialized view to use profiles.company_name
DROP MATERIALIZED VIEW IF EXISTS mv_subcontractor_performance CASCADE;

CREATE MATERIALIZED VIEW mv_subcontractor_performance AS
SELECT 
    p.id as subcontractor_id,
    p.first_name,
    p.last_name,
    p.company_name,  -- Now from profiles table directly
    COUNT(DISTINCT wo.id) as total_jobs,
    COUNT(DISTINCT CASE WHEN wo.status = 'completed' THEN wo.id END) as completed_jobs,
    COUNT(DISTINCT CASE 
        WHEN wo.status = 'completed' 
        AND wo.completed_at IS NOT NULL 
        AND wo.estimated_completion_date IS NOT NULL
        AND wo.completed_at::date <= wo.estimated_completion_date 
        THEN wo.id 
    END) as on_time_jobs,
    AVG(wo.actual_hours) as avg_completion_hours,
    SUM(wor.invoice_amount) as total_invoice_amount,
    AVG(wor.invoice_amount) as avg_invoice_amount,
    CASE 
        WHEN COUNT(DISTINCT CASE WHEN wo.status = 'completed' THEN wo.id END) = 0 THEN NULL
        ELSE ROUND(
            (COUNT(DISTINCT CASE 
                WHEN wo.status = 'completed' 
                AND wo.completed_at IS NOT NULL 
                AND wo.estimated_completion_date IS NOT NULL
                AND wo.completed_at::date <= wo.estimated_completion_date 
                THEN wo.id 
            END)::numeric / COUNT(DISTINCT CASE WHEN wo.status = 'completed' THEN wo.id END)::numeric) * 100, 
            2
        )
    END as quality_score
FROM profiles p  -- Direct from profiles table now
JOIN work_orders wo ON wo.assigned_to = p.id
LEFT JOIN work_order_reports wor ON wor.work_order_id = wo.id AND wor.subcontractor_user_id = p.id
WHERE p.user_type = 'subcontractor'
GROUP BY p.id, p.first_name, p.last_name, p.company_name;

-- Step 7: Recreate indexes and permissions
CREATE INDEX IF NOT EXISTS idx_mv_subcontractor_performance_id ON mv_subcontractor_performance(subcontractor_id);
GRANT SELECT ON mv_subcontractor_performance TO authenticated;

-- Step 8: Drop the problematic view
DROP VIEW IF EXISTS public.user_profiles_with_organization CASCADE;

-- Step 9: Add comment documenting the fix
COMMENT ON TABLE profiles IS 'company_name column restored and auto-updated via triggers for security/performance';