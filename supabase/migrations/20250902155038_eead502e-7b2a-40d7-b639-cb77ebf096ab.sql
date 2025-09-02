-- Fix generate_internal_bill_number function to use correct table
CREATE OR REPLACE FUNCTION public.generate_internal_bill_number(org_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  seq_num integer;
  org_exists boolean;
BEGIN
  -- Check if organization exists
  SELECT EXISTS(
    SELECT 1 FROM organizations 
    WHERE id = org_id AND is_active = true
  ) INTO org_exists;
  
  IF NOT org_exists THEN
    RAISE EXCEPTION 'Organization not found or inactive: %', org_id;
  END IF;
  
  -- Get the current maximum internal_bill_number for this organization
  SELECT COALESCE(MAX(
    CASE 
      WHEN internal_bill_number ~ '^[0-9]+$' 
      THEN internal_bill_number::integer 
      ELSE 0 
    END
  ), 0) + 1
  INTO seq_num
  FROM subcontractor_bills 
  WHERE subcontractor_organization_id = org_id;
  
  -- Return zero-padded 6-digit bill number
  RETURN LPAD(seq_num::text, 6, '0');
  
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Failed to generate internal bill number for organization %: %', org_id, SQLERRM;
END;
$function$;

-- Update validate_invoice_fields function and rename to validate_subcontractor_bill_fields
DROP FUNCTION IF EXISTS public.validate_invoice_fields() CASCADE;
CREATE OR REPLACE FUNCTION public.validate_subcontractor_bill_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Validate required fields
  IF NEW.total_amount IS NULL OR NEW.total_amount <= 0 THEN
    RAISE EXCEPTION 'Bill total amount must be greater than 0';
  END IF;
  
  IF NEW.external_bill_number IS NULL OR trim(NEW.external_bill_number) = '' THEN
    RAISE EXCEPTION 'External bill number is required';
  END IF;
  
  IF NEW.bill_date IS NULL THEN
    RAISE EXCEPTION 'Bill date is required';
  END IF;
  
  -- Validate status transitions
  IF TG_OP = 'UPDATE' THEN
    -- Only allow certain status transitions
    IF OLD.status = 'paid' AND NEW.status != 'paid' THEN
      RAISE EXCEPTION 'Cannot change status of paid bills';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update validate_invoice_attachment_work_order function and rename
DROP FUNCTION IF EXISTS public.validate_invoice_attachment_work_order() CASCADE;
CREATE OR REPLACE FUNCTION public.validate_bill_attachment_work_order()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Validate that work_order_id exists in subcontractor_bill_work_orders for this bill
  IF NEW.work_order_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 
      FROM subcontractor_bill_work_orders sbwo
      WHERE sbwo.subcontractor_bill_id = NEW.subcontractor_bill_id 
      AND sbwo.work_order_id = NEW.work_order_id
    ) THEN
      RAISE EXCEPTION 'Work order % is not associated with this bill', NEW.work_order_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update trigger_generate_invoice_number function and rename
DROP FUNCTION IF EXISTS public.trigger_generate_invoice_number() CASCADE;
CREATE OR REPLACE FUNCTION public.trigger_generate_bill_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Generate internal bill number if not provided
  IF NEW.internal_bill_number IS NULL OR NEW.internal_bill_number = '' THEN
    NEW.internal_bill_number := generate_internal_bill_number(NEW.subcontractor_organization_id);
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update validate_invoice_status_change function and rename
DROP FUNCTION IF EXISTS public.validate_invoice_status_change() CASCADE;
CREATE OR REPLACE FUNCTION public.validate_bill_status_change()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Prevent status changes on paid bills
  IF OLD.status = 'paid' AND NEW.status != 'paid' THEN
    RAISE EXCEPTION 'Cannot modify paid bills';
  END IF;
  
  -- Validate status transitions
  IF OLD.status = 'submitted' AND NEW.status NOT IN ('approved', 'rejected', 'submitted') THEN
    RAISE EXCEPTION 'Invalid status transition from submitted to %', NEW.status;
  END IF;
  
  IF OLD.status = 'approved' AND NEW.status NOT IN ('paid', 'approved') THEN
    RAISE EXCEPTION 'Invalid status transition from approved to %', NEW.status;
  END IF;
  
  IF OLD.status = 'rejected' AND NEW.status NOT IN ('submitted', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status transition from rejected to %', NEW.status;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update get_partner_unbilled_reports_with_approved_invoices function and rename
DROP FUNCTION IF EXISTS public.get_partner_unbilled_reports_with_approved_invoices(uuid) CASCADE;
CREATE OR REPLACE FUNCTION public.get_partner_unbilled_reports_with_approved_bills(partner_org_id uuid)
RETURNS TABLE(
  work_order_report_id uuid,
  work_order_id uuid,
  work_order_number text,
  location_name text,
  total_cost numeric,
  approved_subcontractor_bill_amount numeric,
  report_date date,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    wor.id as work_order_report_id,
    wo.id as work_order_id,
    wo.work_order_number,
    wo.store_location as location_name,
    wor.total_cost,
    wor.approved_subcontractor_bill_amount,
    wor.report_date,
    wor.status
  FROM work_order_reports wor
  JOIN work_orders wo ON wo.id = wor.work_order_id
  WHERE wo.organization_id = partner_org_id
  AND wor.status = 'approved'
  AND wor.approved_subcontractor_bill_amount > 0
  AND NOT EXISTS (
    SELECT 1 
    FROM partner_invoice_line_items pili 
    WHERE pili.work_order_report_id = wor.id
  )
  AND EXISTS (
    SELECT 1 
    FROM subcontractor_bill_work_orders sbwo
    JOIN subcontractor_bills sb ON sb.id = sbwo.subcontractor_bill_id
    WHERE sbwo.work_order_report_id = wor.id
    AND sb.status = 'approved'
  )
  ORDER BY wor.report_date DESC;
END;
$function$;

-- Recreate triggers with new function names
DROP TRIGGER IF EXISTS validate_invoice_fields_trigger ON subcontractor_bills;
CREATE TRIGGER validate_subcontractor_bill_fields_trigger
  BEFORE INSERT OR UPDATE ON subcontractor_bills
  FOR EACH ROW EXECUTE FUNCTION validate_subcontractor_bill_fields();

DROP TRIGGER IF EXISTS generate_invoice_number_trigger ON subcontractor_bills;
CREATE TRIGGER generate_bill_number_trigger
  BEFORE INSERT ON subcontractor_bills
  FOR EACH ROW EXECUTE FUNCTION trigger_generate_bill_number();

DROP TRIGGER IF EXISTS validate_invoice_status_change_trigger ON subcontractor_bills;
CREATE TRIGGER validate_bill_status_change_trigger
  BEFORE UPDATE ON subcontractor_bills
  FOR EACH ROW EXECUTE FUNCTION validate_bill_status_change();

DROP TRIGGER IF EXISTS validate_invoice_attachment_work_order_trigger ON subcontractor_bill_attachments;
CREATE TRIGGER validate_bill_attachment_work_order_trigger
  BEFORE INSERT OR UPDATE ON subcontractor_bill_attachments
  FOR EACH ROW EXECUTE FUNCTION validate_bill_attachment_work_order();