-- Drop the existing function first
DROP FUNCTION IF EXISTS public.get_partner_unbilled_reports_with_approved_bills(uuid);

-- Create new function to get subcontractor bills ready for partner billing
CREATE OR REPLACE FUNCTION public.get_partner_ready_bills(partner_org_id uuid)
RETURNS TABLE(
  bill_id uuid,
  internal_bill_number text,
  external_bill_number text,
  total_amount numeric,
  bill_date date,
  subcontractor_organization_id uuid,
  subcontractor_org_name text,
  subcontractor_org_initials text,
  work_order_count integer,
  work_order_numbers text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    sb.id as bill_id,
    sb.internal_bill_number,
    sb.external_bill_number,
    sb.total_amount,
    sb.bill_date,
    sb.subcontractor_organization_id,
    so.name as subcontractor_org_name,
    so.initials as subcontractor_org_initials,
    COUNT(DISTINCT sbwo.work_order_id)::integer as work_order_count,
    array_agg(DISTINCT wo.work_order_number) as work_order_numbers
  FROM subcontractor_bills sb
  JOIN organizations so ON sb.subcontractor_organization_id = so.id
  JOIN subcontractor_bill_work_orders sbwo ON sbwo.subcontractor_bill_id = sb.id
  JOIN work_orders wo ON sbwo.work_order_id = wo.id
  WHERE sb.status = 'approved'
    AND sb.partner_billing_status = 'ready'
    AND wo.organization_id = partner_org_id
  GROUP BY 
    sb.id,
    sb.internal_bill_number, 
    sb.external_bill_number,
    sb.total_amount,
    sb.bill_date,
    sb.subcontractor_organization_id,
    so.name,
    so.initials
  ORDER BY sb.bill_date DESC;
END;
$function$;