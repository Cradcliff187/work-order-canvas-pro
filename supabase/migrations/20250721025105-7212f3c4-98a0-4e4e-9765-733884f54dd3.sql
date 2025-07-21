
-- CRITICAL FIX 1: Fix generate_work_order_number_v2 function to properly return location_number
CREATE OR REPLACE FUNCTION public.generate_work_order_number_v2(
  org_id uuid,
  location_number text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_initials text;
  sequence_num integer;
  work_order_num text;
  fallback_num text;
  org_name text;
  final_location_number text;
  org_uses_location_numbers boolean;
BEGIN
  -- Temporarily disable RLS for this function execution
  SET LOCAL row_security = off;
  
  -- Get organization details
  SELECT initials, name, uses_partner_location_numbers 
  INTO org_initials, org_name, org_uses_location_numbers
  FROM public.organizations 
  WHERE id = org_id AND is_active = true;
  
  -- Re-enable RLS
  SET LOCAL row_security = on;
  
  -- If organization not found
  IF org_name IS NULL THEN
    RAISE EXCEPTION 'Organization not found or inactive: %', org_id;
  END IF;
  
  -- Generate fallback number
  fallback_num := public.generate_work_order_number();
  
  -- If initials are missing, return warning with fallback
  IF org_initials IS NULL OR org_initials = '' THEN
    RETURN jsonb_build_object(
      'work_order_number', fallback_num,
      'is_fallback', true,
      'warning', 'Organization "' || org_name || '" needs initials for smart numbering. Using fallback number.',
      'organization_name', org_name,
      'requires_initials', true
    );
  END IF;
  
  -- CRITICAL FIX: Handle location number logic properly
  IF location_number IS NULL OR location_number = '' THEN
    -- Auto-generate location number
    final_location_number := public.generate_next_location_number(org_id);
  ELSE
    -- Use provided location number
    final_location_number := location_number;
  END IF;
  
  -- Get per-location sequence number by counting existing work orders for this org+location
  SELECT COUNT(*) + 1 INTO sequence_num
  FROM work_orders 
  WHERE organization_id = org_id 
    AND partner_location_number = final_location_number;
  
  -- Build work order number in standardized format: ORG-LOC-WO (all 3 digits)
  work_order_num := org_initials || '-' || LPAD(final_location_number, 3, '0') || '-' || LPAD(sequence_num::text, 3, '0');
  
  -- CRITICAL FIX: Always return location_number in response
  RETURN jsonb_build_object(
    'work_order_number', work_order_num,
    'is_fallback', false,
    'organization_name', org_name,
    'requires_initials', false,
    'location_number', final_location_number
  );
EXCEPTION
  WHEN OTHERS THEN
    -- If anything else fails, return fallback with error info
    RAISE WARNING 'Work order numbering failed for org %: %, using fallback', org_id, SQLERRM;
    RETURN jsonb_build_object(
      'work_order_number', public.generate_work_order_number(),
      'is_fallback', true,
      'warning', 'Work order numbering system encountered an error. Using fallback number.',
      'error', SQLERRM,
      'requires_initials', false
    );
END;
$$;

-- CRITICAL FIX 2: Fix generate_next_location_number to remove restriction
CREATE OR REPLACE FUNCTION public.generate_next_location_number(org_id uuid)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  seq_num integer;
  org_exists boolean;
BEGIN
  -- Check if organization exists (removed uses_partner_location_numbers restriction)
  SELECT EXISTS(
    SELECT 1 FROM organizations 
    WHERE id = org_id AND is_active = true
  ) INTO org_exists;
  
  IF NOT org_exists THEN
    RAISE EXCEPTION 'Organization not found or inactive: %', org_id;
  END IF;
  
  -- Atomically increment the sequence and get the previous value
  UPDATE organizations 
  SET next_location_sequence = COALESCE(next_location_sequence, 1) + 1
  WHERE id = org_id
  RETURNING next_location_sequence - 1 INTO seq_num;
  
  -- Return zero-padded 3-digit location number
  RETURN LPAD(seq_num::text, 3, '0');
  
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Failed to generate location number for organization %: %', org_id, SQLERRM;
END;
$$;

-- CRITICAL FIX 3: Correct organization settings (ABC=auto-generate, XYZ=manual)
UPDATE organizations 
SET uses_partner_location_numbers = false 
WHERE name = 'ABC Property Management';

UPDATE organizations 
SET uses_partner_location_numbers = true 
WHERE name = 'XYZ Commercial Properties';

-- CRITICAL FIX 4: Clean up existing work order data
-- First, update all work orders with NULL partner_location_number
UPDATE work_orders 
SET partner_location_number = '001'
WHERE partner_location_number IS NULL;

-- CRITICAL FIX 5: Standardize all work order numbers to ORG-LOC-WO format
-- Update ABC work orders to proper format
UPDATE work_orders 
SET 
  work_order_number = 'ABC-' || LPAD(COALESCE(partner_location_number, '001'), 3, '0') || '-' || LPAD((ROW_NUMBER() OVER (PARTITION BY organization_id, partner_location_number ORDER BY created_at))::text, 3, '0'),
  partner_location_number = COALESCE(partner_location_number, '001')
WHERE organization_id IN (SELECT id FROM organizations WHERE name = 'ABC Property Management');

-- Update XYZ work orders to proper format
UPDATE work_orders 
SET 
  work_order_number = 'XYZ-' || LPAD(COALESCE(partner_location_number, '101'), 3, '0') || '-' || LPAD((ROW_NUMBER() OVER (PARTITION BY organization_id, partner_location_number ORDER BY created_at))::text, 3, '0'),
  partner_location_number = COALESCE(partner_location_number, '101')
WHERE organization_id IN (SELECT id FROM organizations WHERE name = 'XYZ Commercial Properties');

-- Update Premium Facilities Group work orders to proper format
UPDATE work_orders 
SET 
  work_order_number = 'PFG-' || LPAD(COALESCE(partner_location_number, '201'), 3, '0') || '-' || LPAD((ROW_NUMBER() OVER (PARTITION BY organization_id, partner_location_number ORDER BY created_at))::text, 3, '0'),
  partner_location_number = COALESCE(partner_location_number, '201')
WHERE organization_id IN (SELECT id FROM organizations WHERE name = 'Premium Facilities Group');

-- CRITICAL FIX 6: Reset sequences to clean state for proper counting
UPDATE organizations SET next_location_sequence = 2 WHERE name = 'ABC Property Management';
UPDATE organizations SET next_location_sequence = 102 WHERE name = 'XYZ Commercial Properties';
UPDATE organizations SET next_location_sequence = 202 WHERE name = 'Premium Facilities Group';

-- Reset work order sequences
UPDATE organizations SET next_sequence_number = 1;
