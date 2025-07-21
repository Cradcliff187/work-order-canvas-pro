
-- Migration: final_atomic_work_order_numbering
-- Fix work order number generation to handle both manual and auto-generated location codes correctly

-- Drop and recreate the function with corrected business logic
DROP FUNCTION IF EXISTS public.generate_work_order_number_v2(uuid, text);

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
  org_name text;
  uses_partner_locations boolean;
  sequence_num integer;
  location_code text;
  work_order_num text;
  fallback_num text;
BEGIN
  -- Temporarily disable RLS for this function execution
  SET LOCAL row_security = off;
  
  -- Get organization details
  SELECT 
    initials, 
    name, 
    COALESCE(uses_partner_location_numbers, false)
  INTO 
    org_initials, 
    org_name, 
    uses_partner_locations
  FROM public.organizations 
  WHERE id = org_id AND is_active = true
  FOR UPDATE;
  
  -- Re-enable RLS
  SET LOCAL row_security = on;
  
  -- If organization not found
  IF org_name IS NULL THEN
    RAISE EXCEPTION 'Organization not found or inactive: %', org_id;
  END IF;
  
  -- Generate fallback number for error cases
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
  
  -- Business Logic Implementation:
  -- Case 1: Organization uses partner location numbers AND location_number is provided
  IF uses_partner_locations AND location_number IS NOT NULL AND location_number != '' THEN
    -- Use exact location number as provided (no truncation)
    location_code := location_number;
    
    -- Get and increment the general sequence number
    UPDATE public.organizations 
    SET next_sequence_number = next_sequence_number + 1
    WHERE id = org_id
    RETURNING next_sequence_number - 1 INTO sequence_num;
    
    -- Format: ORG-{EXACT_LOCATION}-WO
    work_order_num := org_initials || '-' || location_code || '-WO';
    
    RETURN jsonb_build_object(
      'work_order_number', work_order_num,
      'is_fallback', false,
      'organization_name', org_name,
      'requires_initials', false,
      'location_type', 'manual',
      'location_code', location_code
    );
  
  -- Case 2: Organization doesn't use partner locations OR no location provided
  ELSE
    -- Auto-generate 3-digit padded location codes
    UPDATE public.organizations 
    SET next_location_sequence = next_location_sequence + 1
    WHERE id = org_id
    RETURNING next_location_sequence - 1 INTO sequence_num;
    
    -- Generate 3-digit padded location code
    location_code := LPAD(sequence_num::text, 3, '0');
    
    -- Format: ORG-001-WO
    work_order_num := org_initials || '-' || location_code || '-WO';
    
    RETURN jsonb_build_object(
      'work_order_number', work_order_num,
      'is_fallback', false,
      'organization_name', org_name,
      'requires_initials', false,
      'location_type', 'auto_generated',
      'location_code', location_code
    );
  END IF;
  
EXCEPTION
  WHEN NO_DATA_FOUND THEN
    RAISE EXCEPTION 'Organization not found or inactive: %', org_id;
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

-- Update the simple wrapper function to work with the new structure
CREATE OR REPLACE FUNCTION public.generate_work_order_number_simple(
  org_id uuid,
  location_number text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  result jsonb;
BEGIN
  result := public.generate_work_order_number_v2(org_id, location_number);
  RETURN result->>'work_order_number';
END;
$$;

-- Test queries to verify functionality
-- Test Case 1: XYZ with manual location (should use exact location)
-- SELECT generate_work_order_number_v2(
--   (SELECT id FROM organizations WHERE name = 'XYZ Commercial Properties'),
--   'BLDG-A'
-- );

-- Test Case 2: ABC with manual location (should ignore and auto-generate)
-- SELECT generate_work_order_number_v2(
--   (SELECT id FROM organizations WHERE name = 'ABC Property Management'),
--   'BLDG-A'
-- );

-- Test Case 3: XYZ with no location (should auto-generate)
-- SELECT generate_work_order_number_v2(
--   (SELECT id FROM organizations WHERE name = 'XYZ Commercial Properties'),
--   NULL
-- );
