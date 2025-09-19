-- First, let's see what the current RPC function looks like
SELECT routine_definition FROM information_schema.routines 
WHERE routine_name = 'get_partner_ready_bills' AND routine_schema = 'public';

-- Create/update the RPC function to return full work order details
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
  work_orders jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    o.name as subcontractor_org_name,
    o.initials as subcontractor_org_initials,
    COALESCE(array_length(array_agg(DISTINCT wo.id), 1), 0)::integer as work_order_count,
    COALESCE(
      jsonb_agg(
        DISTINCT jsonb_build_object(
          'id', wo.id,
          'work_order_number', wo.work_order_number,
          'title', wo.title,
          'reference', get_work_order_reference(NULL, wo.work_order_number, wo.id)
        )
      ) FILTER (WHERE wo.id IS NOT NULL),
      '[]'::jsonb
    ) as work_orders
  FROM subcontractor_bills sb
  JOIN organizations o ON o.id = sb.subcontractor_organization_id
  LEFT JOIN subcontractor_bill_work_orders sbwo ON sbwo.subcontractor_bill_id = sb.id
  LEFT JOIN work_orders wo ON wo.id = sbwo.work_order_id
  WHERE sb.status = 'approved'
    AND sb.partner_invoice_id IS NULL
    AND EXISTS (
      SELECT 1 FROM work_orders wo_check
      WHERE wo_check.organization_id = partner_org_id
        AND wo_check.id = wo.id
    )
  GROUP BY sb.id, sb.internal_bill_number, sb.external_bill_number, 
           sb.total_amount, sb.bill_date, sb.subcontractor_organization_id,
           o.name, o.initials
  ORDER BY sb.bill_date DESC, sb.created_at DESC;
END;
$$;