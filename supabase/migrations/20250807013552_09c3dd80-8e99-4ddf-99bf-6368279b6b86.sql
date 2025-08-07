-- Create function to get partner unbilled reports with approved invoices only
CREATE OR REPLACE FUNCTION get_partner_unbilled_reports_with_approved_invoices(partner_org_id uuid)
RETURNS TABLE(
  id uuid,
  work_order_id uuid,
  work_performed text,
  materials_used text,
  hours_worked numeric,
  notes text,
  status report_status,
  submitted_at timestamp with time zone,
  reviewed_at timestamp with time zone,
  partner_billed_at timestamp with time zone,
  partner_billed_amount numeric,
  partner_invoice_id uuid,
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
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
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
    COALESCE(SUM(iwo.amount), 0) as subcontractor_costs,
    wo.work_order_number,
    wo.title,
    wo.description,
    wo.store_location,
    wo.street_address,
    wo.city,
    wo.state,
    wo.zip_code,
    subcontractor_orgs.id as org_id,
    subcontractor_orgs.name as org_name,
    subcontractor_orgs.initials as org_initials,
    subcontractor_profile.first_name as subcontractor_first_name,
    subcontractor_profile.last_name as subcontractor_last_name,
    subcontractor_profile.email as subcontractor_email,
    submitted_by_profile.first_name as submitted_by_first_name,
    submitted_by_profile.last_name as submitted_by_last_name,
    submitted_by_profile.email as submitted_by_email
  FROM work_order_reports wor
  INNER JOIN work_orders wo ON wo.id = wor.work_order_id
  INNER JOIN invoice_work_orders iwo ON iwo.work_order_report_id = wor.id
  INNER JOIN invoices i ON i.id = iwo.invoice_id
  LEFT JOIN organizations subcontractor_orgs ON wor.subcontractor_organization_id = subcontractor_orgs.id
  LEFT JOIN profiles subcontractor_profile ON wor.subcontractor_user_id = subcontractor_profile.id
  LEFT JOIN profiles submitted_by_profile ON wor.submitted_by_user_id = submitted_by_profile.id
  WHERE wor.status = 'approved'
    AND wor.partner_invoice_id IS NULL
    AND wo.organization_id = partner_org_id
    AND i.status IN ('approved', 'paid')
  GROUP BY 
    wor.id, wor.work_order_id, wor.work_performed, wor.materials_used, wor.hours_worked,
    wor.notes, wor.status, wor.submitted_at, wor.reviewed_at, wor.partner_billed_at,
    wor.partner_billed_amount, wor.partner_invoice_id, wor.subcontractor_organization_id,
    wor.submitted_by_user_id, wor.reviewed_by_user_id,
    wo.work_order_number, wo.title, wo.description, wo.store_location, wo.street_address,
    wo.city, wo.state, wo.zip_code,
    subcontractor_orgs.id, subcontractor_orgs.name, subcontractor_orgs.initials,
    subcontractor_profile.first_name, subcontractor_profile.last_name, subcontractor_profile.email,
    submitted_by_profile.first_name, submitted_by_profile.last_name, submitted_by_profile.email
  ORDER BY wor.submitted_at DESC;
END;
$$;