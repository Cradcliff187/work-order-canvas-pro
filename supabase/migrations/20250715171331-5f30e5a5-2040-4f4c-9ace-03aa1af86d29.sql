-- First, drop the materialized view that depends on company_name
DROP MATERIALIZED VIEW IF EXISTS mv_subcontractor_performance;

-- Create a view that combines profiles with organization data
CREATE OR REPLACE VIEW public.user_profiles_with_organization AS
SELECT 
  p.id,
  p.user_id,
  p.email,
  p.first_name,
  p.last_name,
  p.user_type,
  p.phone,
  p.avatar_url,
  p.is_active,
  p.is_employee,
  p.hourly_cost_rate,
  p.hourly_billable_rate,
  p.created_at,
  p.updated_at,
  -- Get organization name through user_organizations relationship
  o.name as company_name,
  o.id as organization_id,
  o.organization_type
FROM profiles p
LEFT JOIN user_organizations uo ON uo.user_id = p.id
LEFT JOIN organizations o ON o.id = uo.organization_id;

-- Grant necessary permissions on the view
GRANT SELECT ON public.user_profiles_with_organization TO authenticated;
GRANT SELECT ON public.user_profiles_with_organization TO anon;

-- Drop the company_name column from profiles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS company_name;

-- Recreate the materialized view using the new view instead of company_name
CREATE MATERIALIZED VIEW mv_subcontractor_performance AS
SELECT 
    p.id as subcontractor_id,
    p.first_name,
    p.last_name,
    p.company_name,
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
    -- Quality score based on on-time completion rate
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
FROM user_profiles_with_organization p
JOIN work_orders wo ON wo.assigned_to = p.id
LEFT JOIN work_order_reports wor ON wor.work_order_id = wo.id AND wor.subcontractor_user_id = p.id
WHERE p.user_type = 'subcontractor'
GROUP BY p.id, p.first_name, p.last_name, p.company_name;

-- Create index on the materialized view
CREATE INDEX IF NOT EXISTS idx_mv_subcontractor_performance_id ON mv_subcontractor_performance(subcontractor_id);

-- Grant permissions on the materialized view
GRANT SELECT ON mv_subcontractor_performance TO authenticated;