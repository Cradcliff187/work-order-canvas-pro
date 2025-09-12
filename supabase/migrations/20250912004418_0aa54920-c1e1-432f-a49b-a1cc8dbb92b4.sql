-- Fix internal work order reports missing bill amounts
-- Calculate and populate bill amounts for approved internal reports based on employee time entries

UPDATE work_order_reports 
SET bill_amount = calc.total_amount
FROM (
  SELECT 
    wor.id,
    COALESCE(SUM(er.hours_worked * er.hourly_rate_snapshot), 0) as total_amount
  FROM work_order_reports wor
  JOIN work_orders wo ON wo.id = wor.work_order_id
  JOIN organizations o ON o.id = wo.assigned_organization_id
  LEFT JOIN employee_reports er ON er.work_order_id = wo.id
  WHERE o.organization_type = 'internal'
    AND wor.status = 'approved'
    AND wor.bill_amount IS NULL
  GROUP BY wor.id
  HAVING COALESCE(SUM(er.hours_worked * er.hourly_rate_snapshot), 0) > 0
) calc
WHERE work_order_reports.id = calc.id;