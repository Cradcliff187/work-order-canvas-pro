-- Emergency fix: correct get_partner_ready_bills to use partner_billing_status and robust CTEs
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
  WITH base_bills AS (
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
      AND COALESCE(sb.partner_billing_status, 'ready') = 'ready'
      AND EXISTS (
        SELECT 1 FROM subcontractor_bill_work_orders sbwo
        JOIN work_orders wo ON wo.id = sbwo.work_order_id
        WHERE sbwo.subcontractor_bill_id = sb.id
          AND wo.organization_id = partner_org_id
      )
  ),
  work_order_details AS (
    SELECT 
      bb.bill_id,
      jsonb_agg(
        jsonb_build_object(
          'id', wo.id,
          'work_order_number', wo.work_order_number,
          'title', wo.title,
          'reference', public.get_work_order_reference(wo.id)
        ) ORDER BY wo.work_order_number
      ) as work_orders_json,
      COUNT(*) as wo_count
    FROM base_bills bb
    JOIN subcontractor_bill_work_orders sbwo ON sbwo.subcontractor_bill_id = bb.bill_id
    JOIN work_orders wo ON wo.id = sbwo.work_order_id
    WHERE wo.organization_id = partner_org_id
    GROUP BY bb.bill_id
  )
  SELECT 
    bb.bill_id,
    bb.internal_bill_number,
    bb.external_bill_number,
    bb.total_amount,
    bb.bill_date,
    bb.subcontractor_organization_id,
    bb.subcontractor_org_name,
    bb.subcontractor_org_initials,
    COALESCE(wod.wo_count, 0) as work_order_count,
    COALESCE(wod.work_orders_json, '[]'::jsonb) as work_orders
  FROM base_bills bb
  LEFT JOIN work_order_details wod ON wod.bill_id = bb.bill_id
  ORDER BY bb.bill_date DESC, bb.internal_bill_number;
END;
$$;