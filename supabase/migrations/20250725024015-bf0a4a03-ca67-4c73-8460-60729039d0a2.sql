-- Fix work order sequential numbering system

-- First, create the corrected work order number generation function
CREATE OR REPLACE FUNCTION public.generate_work_order_number_v2(
  org_id uuid,
  location_code text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  org_initials text;
  org_uses_partner_locations boolean;
  final_location_code text;
  sequence_num integer;
  formatted_sequence text;
BEGIN
  -- Get organization details
  SELECT initials, uses_partner_location_numbers
  INTO org_initials, org_uses_partner_locations
  FROM organizations
  WHERE id = org_id AND is_active = true;
  
  IF org_initials IS NULL THEN
    RAISE EXCEPTION 'Organization not found or inactive: %', org_id;
  END IF;
  
  -- Determine location code
  IF org_uses_partner_locations THEN
    -- Use provided partner location number
    IF location_code IS NULL THEN
      RAISE EXCEPTION 'Partner location number required for organization %', org_id;
    END IF;
    final_location_code := location_code;
  ELSE
    -- Generate auto location code if not provided
    IF location_code IS NULL THEN
      SELECT generate_next_location_number(org_id) INTO final_location_code;
    ELSE
      final_location_code := location_code;
    END IF;
  END IF;
  
  -- Atomically increment and get sequence number
  UPDATE organizations 
  SET next_sequence_number = COALESCE(next_sequence_number, 1) + 1
  WHERE id = org_id
  RETURNING next_sequence_number - 1 INTO sequence_num;
  
  -- Format sequence as 3-digit padded number
  formatted_sequence := LPAD(sequence_num::text, 3, '0');
  
  -- Return properly formatted work order number
  RETURN org_initials || '-' || final_location_code || '-' || formatted_sequence;
  
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Failed to generate work order number for organization %: %', org_id, SQLERRM;
END;
$$;

-- Create the trigger function
CREATE OR REPLACE FUNCTION public.trigger_generate_work_order_number_v2()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only generate if work_order_number is not already set
  IF NEW.work_order_number IS NULL THEN
    NEW.work_order_number := public.generate_work_order_number_v2(
      NEW.organization_id,
      NEW.partner_location_number
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_generate_work_order_number_v2 ON work_orders;

-- Create the trigger on work_orders table
CREATE TRIGGER trigger_generate_work_order_number_v2
  BEFORE INSERT ON work_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_generate_work_order_number_v2();

-- Update any existing work orders with 'WO' suffix to use proper sequence numbers
UPDATE work_orders 
SET work_order_number = REPLACE(work_order_number, '-WO', '-001')
WHERE work_order_number LIKE '%-WO';

-- Reset sequence numbers for all organizations to start fresh
UPDATE organizations 
SET next_sequence_number = (
  SELECT COALESCE(MAX(
    CASE 
      WHEN work_order_number ~ '-[0-9]{3}$' 
      THEN (regexp_match(work_order_number, '-([0-9]{3})$'))[1]::integer 
      ELSE 0 
    END
  ), 0) + 1
  FROM work_orders 
  WHERE work_orders.organization_id = organizations.id
);