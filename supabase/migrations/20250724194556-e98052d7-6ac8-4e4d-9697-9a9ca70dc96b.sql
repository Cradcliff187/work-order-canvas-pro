-- Step 1: Drop the materialized view that depends on work_order_reports.invoice_amount
DROP MATERIALIZED VIEW IF EXISTS mv_subcontractor_performance;

-- Step 2: Remove invoice fields from work_order_reports table
ALTER TABLE work_order_reports 
DROP COLUMN IF EXISTS invoice_amount,
DROP COLUMN IF EXISTS invoice_number;

-- Step 3: Recreate the materialized view without invoice_amount
-- Updated to focus on work completion metrics rather than financial data
CREATE MATERIALIZED VIEW mv_subcontractor_performance AS
SELECT 
  p.id AS subcontractor_id,
  p.first_name,
  p.last_name,
  p.company_name,
  COUNT(DISTINCT wo.id) AS total_jobs,
  COUNT(DISTINCT CASE 
    WHEN wo.status = 'completed' THEN wo.id 
    ELSE NULL 
  END) AS completed_jobs,
  COUNT(DISTINCT CASE 
    WHEN wo.status = 'completed' 
    AND wo.completed_at IS NOT NULL 
    AND wo.estimated_completion_date IS NOT NULL 
    AND wo.completed_at::date <= wo.estimated_completion_date 
    THEN wo.id 
    ELSE NULL 
  END) AS on_time_jobs,
  AVG(wo.actual_hours) AS avg_completion_hours,
  COUNT(DISTINCT wor.id) AS total_reports_submitted,
  COUNT(DISTINCT CASE 
    WHEN wor.status = 'approved' THEN wor.id 
    ELSE NULL 
  END) AS approved_reports,
  CASE 
    WHEN COUNT(DISTINCT CASE WHEN wo.status = 'completed' THEN wo.id ELSE NULL END) = 0 
    THEN NULL
    ELSE ROUND(
      (COUNT(DISTINCT CASE 
        WHEN wo.status = 'completed' 
        AND wo.completed_at IS NOT NULL 
        AND wo.estimated_completion_date IS NOT NULL 
        AND wo.completed_at::date <= wo.estimated_completion_date 
        THEN wo.id 
        ELSE NULL 
      END)::numeric / 
      COUNT(DISTINCT CASE WHEN wo.status = 'completed' THEN wo.id ELSE NULL END)::numeric) * 100, 2
    )
  END AS on_time_percentage,
  CASE 
    WHEN COUNT(DISTINCT wor.id) = 0 
    THEN NULL
    ELSE ROUND(
      (COUNT(DISTINCT CASE WHEN wor.status = 'approved' THEN wor.id ELSE NULL END)::numeric / 
      COUNT(DISTINCT wor.id)::numeric) * 100, 2
    )
  END AS report_approval_rate
FROM profiles p
JOIN work_orders wo ON wo.assigned_to = p.id
LEFT JOIN work_order_reports wor ON wor.work_order_id = wo.id AND wor.subcontractor_user_id = p.id
WHERE p.user_type = 'subcontractor'
GROUP BY p.id, p.first_name, p.last_name, p.company_name;

-- Create index for better performance
CREATE INDEX idx_mv_subcontractor_performance_id ON mv_subcontractor_performance(subcontractor_id);

-- Add comment to clarify the purpose
COMMENT ON TABLE work_order_reports IS 'Stores work completion reports without financial information. Invoice data is handled separately in the invoices table.';
COMMENT ON MATERIALIZED VIEW mv_subcontractor_performance IS 'Performance metrics for subcontractors focusing on work completion rather than financial data.';