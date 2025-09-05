-- Fix the broken get_partner_unbilled_reports_with_approved_bills function
-- Remove the non-existent total_cost column reference

CREATE OR REPLACE FUNCTION public.get_partner_unbilled_reports_with_approved_bills(partner_org_id uuid)
RETURNS TABLE(
  id uuid,
  work_order_id uuid,
  work_performed text,
  materials_used text,
  hours_worked numeric,
  notes text,
  status text,
  submitted_at timestamp with time zone,
  reviewed_at timestamp with time zone,
  partner_billed_at timestamp with time zone,
  partner_billed_amount numeric,
  partner_invoice_id text,
  subcontractor_organization_id uuid,
  submitted_by_user_id uuid,
  reviewed_by_user_id uuid,
  subcontractor_costs numeric,
  work_order_number text,
  title text,
  description text,
  store_location text,
  street_address text,
  city text,
  state text,
  zip_code text,
  internal_estimate_amount numeric,
  internal_estimate_description text,
  org_id uuid,
  org_name text,
  org_initials text,
  subcontractor_first_name text,
  subcontractor_last_name text,
  subcontractor_email text,
  submitted_by_first_name text,
  submitted_by_last_name text,
  submitted_by_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    wor.id,
    wor.work_order_id,
    wor.work_performed,
    wor.materials_used,
    wor.hours_worked,
    wor.notes,
    wor.status,
    wor.submitted_at,
    wor.reviewed_at,
    wor.partner_billed_at,
    wor.partner_billed_amount,
    wor.partner_invoice_id,
    wor.subcontractor_organization_id,
    wor.submitted_by_user_id,
    wor.reviewed_by_user_id,
    -- Get subcontractor costs from approved bills
    COALESCE(sbwo.amount, 0) as subcontractor_costs,
    wo.work_order_number,
    wo.title,
    wo.description,
    wo.store_location,
    wo.street_address,
    wo.city,
    wo.state,
    wo.zip_code,
    wo.internal_estimate_amount,
    wo.internal_estimate_description,
    so.id as org_id,
    so.name as org_name,
    so.initials as org_initials,
    sc.first_name as subcontractor_first_name,
    sc.last_name as subcontractor_last_name,
    sc.email as subcontractor_email,
    sb.first_name as submitted_by_first_name,
    sb.last_name as submitted_by_last_name,
    sb.email as submitted_by_email
  FROM work_order_reports wor
  JOIN work_orders wo ON wor.work_order_id = wo.id
  LEFT JOIN subcontractor_organizations so ON wor.subcontractor_organization_id = so.id
  LEFT JOIN profiles sc ON wor.submitted_by_user_id = sc.id
  LEFT JOIN profiles sb ON wor.submitted_by_user_id = sb.id
  LEFT JOIN subcontractor_bill_work_orders sbwo ON sbwo.work_order_report_id = wor.id
  LEFT JOIN subcontractor_bills sbs ON sbwo.subcontractor_bill_id = sbs.id AND sbs.status = 'approved'
  WHERE wo.organization_id = partner_org_id
    AND wor.status = 'approved'
    AND wor.partner_billed_at IS NULL;
END;
$function$;

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