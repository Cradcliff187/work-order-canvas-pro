-- Create materialized views for analytics performance optimization

-- Materialized view for work order analytics
CREATE MATERIALIZED VIEW public.mv_work_order_analytics AS
SELECT 
  DATE_TRUNC('day', date_submitted) as submission_date,
  DATE_TRUNC('week', date_submitted) as submission_week,
  DATE_TRUNC('month', date_submitted) as submission_month,
  COUNT(*) as total_orders,
  COUNT(CASE WHEN status = 'received' THEN 1 END) as received_count,
  COUNT(CASE WHEN status = 'assigned' THEN 1 END) as assigned_count,
  COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_count,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
  COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count,
  AVG(CASE 
    WHEN completed_at IS NOT NULL AND date_assigned IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (completed_at - date_assigned))/3600 
  END) as avg_completion_hours,
  SUM(COALESCE(subcontractor_invoice_amount, 0)) as total_invoice_amount,
  wo.trade_id,
  wo.organization_id
FROM work_orders wo
GROUP BY 
  DATE_TRUNC('day', date_submitted),
  DATE_TRUNC('week', date_submitted),
  DATE_TRUNC('month', date_submitted),
  wo.trade_id,
  wo.organization_id;

-- Create index for better performance
CREATE INDEX idx_mv_work_order_analytics_submission_date ON public.mv_work_order_analytics(submission_date);
CREATE INDEX idx_mv_work_order_analytics_trade_id ON public.mv_work_order_analytics(trade_id);
CREATE INDEX idx_mv_work_order_analytics_organization_id ON public.mv_work_order_analytics(organization_id);

-- Materialized view for subcontractor performance
CREATE MATERIALIZED VIEW public.mv_subcontractor_performance AS
SELECT 
  p.id as subcontractor_id,
  p.first_name,
  p.last_name,
  p.company_name,
  COUNT(wo.id) as total_jobs,
  COUNT(CASE WHEN wo.status = 'completed' THEN 1 END) as completed_jobs,
  COUNT(CASE WHEN wo.completed_at <= wo.estimated_completion_date THEN 1 END) as on_time_jobs,
  AVG(CASE 
    WHEN wo.completed_at IS NOT NULL AND wo.date_assigned IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (wo.completed_at - wo.date_assigned))/3600 
  END) as avg_completion_hours,
  AVG(COALESCE(wo.subcontractor_invoice_amount, 0)) as avg_invoice_amount,
  SUM(COALESCE(wo.subcontractor_invoice_amount, 0)) as total_invoice_amount,
  -- Quality score based on report approvals
  COUNT(CASE WHEN wor.status = 'approved' THEN 1 END) * 100.0 / NULLIF(COUNT(wor.id), 0) as quality_score
FROM profiles p
LEFT JOIN work_orders wo ON wo.assigned_to = p.id
LEFT JOIN work_order_reports wor ON wor.work_order_id = wo.id AND wor.subcontractor_user_id = p.id
WHERE p.user_type = 'subcontractor'
GROUP BY p.id, p.first_name, p.last_name, p.company_name;

-- Analytics functions for complex calculations
CREATE OR REPLACE FUNCTION public.calculate_completion_time_by_trade(
  start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  trade_name TEXT,
  avg_completion_hours NUMERIC,
  total_orders BIGINT,
  completed_orders BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.name as trade_name,
    AVG(CASE 
      WHEN wo.completed_at IS NOT NULL AND wo.date_assigned IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (wo.completed_at - wo.date_assigned))/3600 
    END) as avg_completion_hours,
    COUNT(wo.id) as total_orders,
    COUNT(CASE WHEN wo.status = 'completed' THEN 1 END) as completed_orders
  FROM trades t
  LEFT JOIN work_orders wo ON wo.trade_id = t.id
  WHERE wo.date_submitted BETWEEN start_date AND end_date
  GROUP BY t.id, t.name
  ORDER BY avg_completion_hours ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_first_time_fix_rate(
  start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  end_date DATE DEFAULT CURRENT_DATE
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  fix_rate NUMERIC;
BEGIN
  -- Calculate percentage of work orders that were completed without requiring additional visits
  -- (approximated by work orders with only one approved report)
  SELECT 
    COUNT(CASE 
      WHEN report_count = 1 AND first_report_approved THEN 1 
    END) * 100.0 / NULLIF(COUNT(*), 0)
  INTO fix_rate
  FROM (
    SELECT 
      wo.id,
      COUNT(wor.id) as report_count,
      BOOL_AND(wor.status = 'approved') as first_report_approved
    FROM work_orders wo
    LEFT JOIN work_order_reports wor ON wor.work_order_id = wo.id
    WHERE wo.date_submitted BETWEEN start_date AND end_date
      AND wo.status = 'completed'
    GROUP BY wo.id
  ) report_stats;
  
  RETURN COALESCE(fix_rate, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_geographic_distribution(
  start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  state TEXT,
  city TEXT,
  work_order_count BIGINT,
  avg_completion_hours NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wo.state,
    wo.city,
    COUNT(wo.id) as work_order_count,
    AVG(CASE 
      WHEN wo.completed_at IS NOT NULL AND wo.date_assigned IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (wo.completed_at - wo.date_assigned))/3600 
    END) as avg_completion_hours
  FROM work_orders wo
  WHERE wo.date_submitted BETWEEN start_date AND end_date
    AND wo.state IS NOT NULL 
    AND wo.city IS NOT NULL
  GROUP BY wo.state, wo.city
  ORDER BY work_order_count DESC;
END;
$$;

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION public.refresh_analytics_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW public.mv_work_order_analytics;
  REFRESH MATERIALIZED VIEW public.mv_subcontractor_performance;
END;
$$;

-- Grant permissions for analytics functions
GRANT EXECUTE ON FUNCTION public.calculate_completion_time_by_trade TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_first_time_fix_rate TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_geographic_distribution TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_analytics_views TO authenticated;