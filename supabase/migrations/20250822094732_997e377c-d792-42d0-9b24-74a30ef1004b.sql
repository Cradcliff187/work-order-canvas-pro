-- Drop and recreate the function with proper return structure
DROP FUNCTION IF EXISTS get_employee_dashboard_data(UUID, DATE, DATE, DATE, DATE);

CREATE OR REPLACE FUNCTION get_employee_dashboard_data(
  p_employee_id UUID,
  p_week_start DATE,
  p_week_end DATE,
  p_month_start DATE,
  p_month_end DATE
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  WITH active_assignments AS (
    SELECT 
      woa.id,
      woa.assignment_type,
      woa.assigned_at,
      jsonb_build_object(
        'id', wo.id,
        'title', wo.title,
        'work_order_number', wo.work_order_number,
        'status', wo.status
      ) as work_orders
    FROM work_order_assignments woa
    LEFT JOIN work_orders wo ON wo.id = woa.work_order_id
    WHERE woa.assigned_to = p_employee_id
  ),
  weekly_hours AS (
    SELECT 
      er.id,
      er.report_date,
      er.hours_worked,
      er.hourly_rate_snapshot,
      er.work_performed,
      jsonb_build_object(
        'work_order_number', wo.work_order_number
      ) as work_orders
    FROM employee_reports er
    LEFT JOIN work_orders wo ON wo.id = er.work_order_id
    WHERE er.employee_user_id = p_employee_id
      AND er.report_date >= p_week_start
      AND er.report_date <= p_week_end
    ORDER BY er.report_date DESC
  ),
  monthly_hours AS (
    SELECT 
      er.id,
      er.report_date,
      er.hours_worked,
      er.hourly_rate_snapshot,
      er.work_performed,
      jsonb_build_object(
        'work_order_number', wo.work_order_number
      ) as work_orders
    FROM employee_reports er
    LEFT JOIN work_orders wo ON wo.id = er.work_order_id
    WHERE er.employee_user_id = p_employee_id
      AND er.report_date >= p_month_start
      AND er.report_date <= p_month_end
    ORDER BY er.report_date DESC
  ),
  recent_time_reports AS (
    SELECT 
      er.id,
      er.report_date,
      er.hours_worked,
      er.hourly_rate_snapshot,
      er.work_performed,
      jsonb_build_object(
        'work_order_number', wo.work_order_number
      ) as work_orders
    FROM employee_reports er
    LEFT JOIN work_orders wo ON wo.id = er.work_order_id
    WHERE er.employee_user_id = p_employee_id
      AND er.report_date >= (CURRENT_DATE - INTERVAL '30 days')
    ORDER BY er.report_date DESC
  ),
  recent_receipts AS (
    SELECT 
      r.id,
      r.vendor_name,
      r.amount,
      r.receipt_date,
      r.description
    FROM receipts r
    WHERE r.employee_user_id = p_employee_id
    ORDER BY r.receipt_date DESC
    LIMIT 10
  ),
  monthly_expenses_total AS (
    SELECT COALESCE(SUM(r.amount), 0) as total
    FROM receipts r
    WHERE r.employee_user_id = p_employee_id
      AND r.receipt_date >= p_month_start
      AND r.receipt_date <= p_month_end
  ),
  pending_reports_count AS (
    SELECT COUNT(DISTINCT woa.work_order_id) as count
    FROM work_order_assignments woa
    WHERE woa.assigned_to = p_employee_id
      AND NOT EXISTS (
        SELECT 1 
        FROM employee_reports er 
        WHERE er.work_order_id = woa.work_order_id
          AND er.employee_user_id = p_employee_id
          AND er.report_date >= (CURRENT_DATE - INTERVAL '7 days')
      )
  ),
  weekly_hours_total AS (
    SELECT COALESCE(SUM(hours_worked), 0) as total
    FROM weekly_hours
  ),
  monthly_hours_total AS (
    SELECT COALESCE(SUM(hours_worked), 0) as total
    FROM monthly_hours
  )
  
  SELECT jsonb_build_object(
    'activeAssignments', COALESCE((SELECT jsonb_agg(to_jsonb(aa)) FROM active_assignments aa), '[]'::jsonb),
    'hoursThisWeek', COALESCE((SELECT jsonb_agg(to_jsonb(wh)) FROM weekly_hours wh), '[]'::jsonb),
    'hoursThisMonth', COALESCE((SELECT jsonb_agg(to_jsonb(mh)) FROM monthly_hours mh), '[]'::jsonb),
    'recentTimeReports', COALESCE((SELECT jsonb_agg(to_jsonb(rtr)) FROM recent_time_reports rtr), '[]'::jsonb),
    'recentReceipts', COALESCE((SELECT jsonb_agg(to_jsonb(rr)) FROM recent_receipts rr), '[]'::jsonb),
    'monthlyExpenses', (SELECT total FROM monthly_expenses_total),
    'pendingTimeReports', (SELECT count FROM pending_reports_count),
    'totalHoursThisWeek', (SELECT total FROM weekly_hours_total),
    'totalHoursThisMonth', (SELECT total FROM monthly_hours_total)
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;