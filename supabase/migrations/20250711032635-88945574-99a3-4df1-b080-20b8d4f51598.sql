-- Create enhanced work order number generation function
CREATE OR REPLACE FUNCTION public.generate_work_order_number_v2(
  org_id uuid,
  location_number text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  org_initials text;
  sequence_num integer;
  work_order_num text;
BEGIN
  -- Get organization initials and lock row for sequence update
  SELECT initials INTO org_initials 
  FROM public.organizations 
  WHERE id = org_id AND is_active = true
  FOR UPDATE;
  
  -- Validate initials exist
  IF org_initials IS NULL OR org_initials = '' THEN
    RAISE EXCEPTION 'Organization initials are required for work order numbering. Please set initials for organization ID: %', org_id;
  END IF;
  
  -- Get and increment sequence number atomically
  UPDATE public.organizations 
  SET next_sequence_number = next_sequence_number + 1
  WHERE id = org_id
  RETURNING next_sequence_number - 1 INTO sequence_num;
  
  -- Build work order number based on location presence
  IF location_number IS NOT NULL AND location_number != '' THEN
    work_order_num := org_initials || '-' || location_number || '-' || LPAD(sequence_num::text, 3, '0');
  ELSE
    work_order_num := org_initials || '-' || LPAD(sequence_num::text, 4, '0');
  END IF;
  
  RETURN work_order_num;
EXCEPTION
  WHEN NO_DATA_FOUND THEN
    RAISE EXCEPTION 'Organization not found or inactive: %', org_id;
END;
$$;

-- Create trigger function for auto-generation with fallback
CREATE OR REPLACE FUNCTION public.trigger_generate_work_order_number_v2()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only generate if work_order_number is not already set
  IF NEW.work_order_number IS NULL OR NEW.work_order_number = '' THEN
    -- Use organization_id (submitter) for numbering by default
    -- Use partner_location_number if provided
    NEW.work_order_number := public.generate_work_order_number_v2(
      NEW.organization_id,
      NEW.partner_location_number
    );
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- If advanced numbering fails, fall back to legacy system
    RAISE WARNING 'Advanced work order numbering failed (%), falling back to legacy numbering', SQLERRM;
    NEW.work_order_number := public.generate_work_order_number();
    RETURN NEW;
END;
$$;

-- Add trigger to work orders table for automatic number generation
CREATE TRIGGER trigger_work_order_number_v2
  BEFORE INSERT ON public.work_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_generate_work_order_number_v2();