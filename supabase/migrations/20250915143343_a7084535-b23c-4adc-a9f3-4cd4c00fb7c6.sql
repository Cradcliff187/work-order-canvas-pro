-- Adjust get_partner_ready_bills to temporarily include 10 legacy 'billed' bills that are paid
-- This is a scoped, reversible change to surface legacy Big Boy bills in the UI without altering data

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
SET search_path TO 'public'
AS $$
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
  WHERE sb.status IN ('approved', 'paid')
    AND (
      sb.partner_billing_status IN ('ready', 'paid')
      OR (
        -- Temporary exception: include the 10 legacy Big Boy bills that remain 'billed' but are 'paid'
        sb.partner_billing_status = 'billed'
        AND sb.status = 'paid'
        AND sb.internal_bill_number IN (
          'INV-2025-00001','INV-2025-00002','INV-2025-00003','INV-2025-00004','INV-2025-00005',
          'INV-2025-00006','INV-2025-00007','INV-2025-00008','INV-2025-00012','INV-2025-00013'
        )
      )
    )
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
$$;

-- Verification: ensure Big Boy org sees 10 bills (partner_org_id from audit)
DO $$
DECLARE
  cnt int;
BEGIN
  SELECT COUNT(*) INTO cnt
  FROM get_partner_ready_bills('b47e1606-bcc2-437d-8c68-da288942d9cd'::uuid)
  WHERE internal_bill_number IN (
    'INV-2025-00001','INV-2025-00002','INV-2025-00003','INV-2025-00004','INV-2025-00005',
    'INV-2025-00006','INV-2025-00007','INV-2025-00008','INV-2025-00012','INV-2025-00013'
  );
  INSERT INTO audit_logs(table_name, record_id, action, new_values)
  VALUES(
    'subcontractor_bills', gen_random_uuid(), 'get_partner_ready_bills_adjusted_verification',
    jsonb_build_object('big_boy_visible_count', cnt, 'expected', 10)
  );
END;
$$;