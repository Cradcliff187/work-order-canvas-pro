-- Fix the get_partner_ready_bills function to call get_work_order_reference with correct parameters
DROP FUNCTION IF EXISTS public.get_partner_ready_bills(uuid);

CREATE OR REPLACE FUNCTION public.get_partner_ready_bills(partner_org_id uuid)
RETURNS TABLE (
  bill_id uuid,
  internal_bill_number text,
  external_bill_number text,
  total_amount numeric,
  bill_date date,
  subcontractor_organization_id uuid,
  subcontractor_org_name text,
  subcontractor_org_initials text,
  work_order_count bigint,
  work_orders jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH subcontractor_bills AS (
    SELECT 
      sb.id as bill_id,
      sb.internal_bill_number,
      sb.external_bill_number,
      sb.total_amount,
      sb.bill_date,
      sb.subcontractor_organization_id,
      o.name as subcontractor_org_name,
      o.initials as subcontractor_org_initials
    FROM subcontractor_bills sb
    JOIN organizations o ON o.id = sb.subcontractor_organization_id
    WHERE sb.status = 'approved'
      AND sb.partner_invoice_id IS NULL
      AND EXISTS (
        SELECT 1 FROM subcontractor_bill_work_orders sbwo
        JOIN work_orders wo ON wo.id = sbwo.work_order_id
        WHERE sbwo.subcontractor_bill_id = sb.id
          AND wo.organization_id = partner_org_id
      )
  ),
  work_order_details AS (
    SELECT 
      sb.bill_id,
      jsonb_agg(
        jsonb_build_object(
          'id', wo.id,
          'work_order_number', wo.work_order_number,
          'title', wo.title,
          'reference', get_work_order_reference(wo.id)
        ) ORDER BY wo.work_order_number
      ) as work_orders_json,
      COUNT(*) as wo_count
    FROM subcontractor_bills sb
    JOIN subcontractor_bill_work_orders sbwo ON sbwo.subcontractor_bill_id = sb.bill_id
    JOIN work_orders wo ON wo.id = sbwo.work_order_id
    WHERE wo.organization_id = partner_org_id
    GROUP BY sb.bill_id
  )
  SELECT 
    sb.bill_id,
    sb.internal_bill_number,
    sb.external_bill_number,
    sb.total_amount,
    sb.bill_date,
    sb.subcontractor_organization_id,
    sb.subcontractor_org_name,
    sb.subcontractor_org_initials,
    COALESCE(wod.wo_count, 0) as work_order_count,
    COALESCE(wod.work_orders_json, '[]'::jsonb) as work_orders
  FROM subcontractor_bills sb
  LEFT JOIN work_order_details wod ON wod.bill_id = sb.bill_id
  ORDER BY sb.bill_date DESC, sb.internal_bill_number;
END;
$$;