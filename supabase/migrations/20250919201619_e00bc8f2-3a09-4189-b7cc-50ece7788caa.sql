-- Drop the existing function to change return type
DROP FUNCTION IF EXISTS public.get_partner_ready_bills(uuid);

-- Create new function to return full work order details instead of just numbers
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
    so.name as subcontractor_org_name,
    so.initials as subcontractor_org_initials,
    COUNT(DISTINCT sbwo.work_order_id)::integer as work_order_count,
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