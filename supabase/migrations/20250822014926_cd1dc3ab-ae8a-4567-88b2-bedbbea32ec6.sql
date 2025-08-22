-- Create optimized employee dashboard data function
CREATE OR REPLACE FUNCTION get_employee_dashboard_data(
  p_employee_id uuid,
  p_week_start date,
  p_week_end date,
  p_month_start date,
  p_month_end date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Use CTEs to organize complex queries efficiently
  WITH active_assignments AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', woa.id,
        'assignment_type', woa.assignment_type,
        'assigned_at', woa.assigned_at,
        'work_orders', CASE 
          WHEN wo.id IS NOT NULL THEN jsonb_build_object(
            'id', wo.id,
            'title', wo.title,
            'work_order_number', wo.work_order_number,
            'status', wo.status
          )
          ELSE NULL
        END
      )
    ) AS assignments
    FROM work_order_assignments woa
    INNER JOIN work_orders wo ON wo.id = woa.work_order_id
    WHERE woa.assigned_to = p_employee_id
      AND wo.status IN ('assigned', 'in_progress')
  ),
  
  week_time_reports AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', er.id,
        'report_date', er.report_date,
        'hours_worked', er.hours_worked,
        'hourly_rate_snapshot', er.hourly_rate_snapshot,
        'work_performed', er.work_performed,
        'work_orders', CASE 
          WHEN wo.id IS NOT NULL THEN jsonb_build_object(
            'work_order_number', wo.work_order_number
          )
          ELSE NULL
        END
      )
    ) AS reports,
    COALESCE(SUM(er.hours_worked), 0) AS total_hours
    FROM employee_reports er
    INNER JOIN work_orders wo ON wo.id = er.work_order_id
    WHERE er.employee_user_id = p_employee_id
      AND er.report_date >= p_week_start
      AND er.report_date <= p_week_end
  ),
  
  month_time_reports AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', er.id,
        'report_date', er.report_date,
        'hours_worked', er.hours_worked,
        'hourly_rate_snapshot', er.hourly_rate_snapshot,
        'work_performed', er.work_performed,
        'work_orders', CASE 
          WHEN wo.id IS NOT NULL THEN jsonb_build_object(
            'work_order_number', wo.work_order_number
          )
          ELSE NULL
        END
      )
    ) AS reports,
    COALESCE(SUM(er.hours_worked), 0) AS total_hours
    FROM employee_reports er
    INNER JOIN work_orders wo ON wo.id = er.work_order_id
    WHERE er.employee_user_id = p_employee_id
      AND er.report_date >= p_month_start
      AND er.report_date <= p_month_end
  ),
  
  recent_receipts AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'vendor_name', r.vendor_name,
        'amount', r.amount,
        'receipt_date', r.receipt_date,
        'description', r.description
      )
    ) AS receipts
    FROM receipts r
    WHERE r.employee_user_id = p_employee_id
    ORDER BY r.receipt_date DESC
    LIMIT 10
  ),
  
  monthly_expenses AS (
    SELECT COALESCE(SUM(r.amount), 0) AS total_amount
    FROM receipts r
    WHERE r.employee_user_id = p_employee_id
      AND r.receipt_date >= p_month_start
      AND r.receipt_date <= p_month_end
  ),
  
  pending_time_reports AS (
    SELECT COUNT(DISTINCT woa.work_order_id)::integer AS count
    FROM work_order_assignments woa
    WHERE woa.assigned_to = p_employee_id
      AND NOT EXISTS (
        SELECT 1 
        FROM employee_reports er 
        WHERE er.employee_user_id = p_employee_id
          AND er.work_order_id = woa.work_order_id
          AND er.report_date >= (CURRENT_DATE - INTERVAL '7 days')
      )
  )
  
  -- Combine all results into single JSON response
  SELECT jsonb_build_object(
    'activeAssignments', COALESCE(aa.assignments, '[]'::jsonb),
    'hoursThisWeek', COALESCE(wtr.reports, '[]'::jsonb),
    'hoursThisMonth', COALESCE(mtr.reports, '[]'::jsonb),
    'recentReceipts', COALESCE(rr.receipts, '[]'::jsonb),
    'monthlyExpenses', me.total_amount,
    'pendingTimeReports', ptr.count,
    'totalHoursThisWeek', wtr.total_hours,
    'totalHoursThisMonth', mtr.total_hours
  ) INTO result
  FROM active_assignments aa
  CROSS JOIN week_time_reports wtr
  CROSS JOIN month_time_reports mtr  
  CROSS JOIN recent_receipts rr
  CROSS JOIN monthly_expenses me
  CROSS JOIN pending_time_reports ptr;
  
  RETURN result;
END;
$$;