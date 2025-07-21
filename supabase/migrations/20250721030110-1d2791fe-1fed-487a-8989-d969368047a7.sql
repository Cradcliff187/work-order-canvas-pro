
-- COMPREHENSIVE FIX: Work Order Numbering System
-- This migration fixes all critical issues identified in the audit

-- STEP 1: Replace generate_work_order_number_v2 with correct implementation
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
  final_location_number text;
  work_order_sequence integer;
  work_order_num text;
  fallback_num text;
BEGIN
  -- Temporarily disable RLS for this function execution
  SET LOCAL row_security = off;
  
  -- Get organization details
  SELECT initials, name INTO org_initials, org_name
  FROM public.organizations 
  WHERE id = org_id AND is_active = true;
  
  -- Re-enable RLS
  SET LOCAL row_security = on;
  
  -- If organization not found, return error
  IF org_name IS NULL THEN
    RAISE EXCEPTION 'Organization not found or inactive: %', org_id;
  END IF;
  
  -- Generate fallback number for safety
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
  
  -- Handle location number logic
  IF location_number IS NULL OR location_number = '' THEN
    -- Auto-generate location number
    final_location_number := public.generate_next_location_number(org_id);
  ELSE
    -- Use provided location number (ensure 3-digit padding)
    final_location_number := LPAD(location_number, 3, '0');
  END IF;
  
  -- Get per-location work order sequence number
  SELECT COUNT(*) + 1 INTO work_order_sequence
  FROM work_orders 
  WHERE organization_id = org_id 
    AND partner_location_number = final_location_number;
  
  -- Build work order number in standardized format: ORG-LOC-WO (all 3 digits)
  work_order_num := org_initials || '-' || LPAD(final_location_number, 3, '0') || '-' || LPAD(work_order_sequence::text, 3, '0');
  
  -- Return success response with location_number
  RETURN jsonb_build_object(
    'work_order_number', work_order_num,
    'is_fallback', false,
    'organization_name', org_name,
    'requires_initials', false,
    'location_number', final_location_number
  );
EXCEPTION
  WHEN OTHERS THEN
    -- If anything fails, return fallback with error info
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

-- STEP 2: Fix generate_next_location_number to work for all organizations
CREATE OR REPLACE FUNCTION public.generate_next_location_number(org_id uuid)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  seq_num integer;
  org_exists boolean;
BEGIN
  -- Check if organization exists (removed restriction)
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

-- STEP 3: Update trigger function to extract and store location_number
CREATE OR REPLACE FUNCTION public.trigger_generate_work_order_number_v2()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Only generate if work_order_number is not already set
  IF NEW.work_order_number IS NULL OR NEW.work_order_number = '' THEN
    -- Call the work order number generation function
    result := public.generate_work_order_number_v2(
      NEW.organization_id,
      NEW.partner_location_number
    );
    
    -- Extract work order number from result
    NEW.work_order_number := result->>'work_order_number';
    
    -- CRITICAL: Extract and store location_number if not already set
    IF NEW.partner_location_number IS NULL OR NEW.partner_location_number = '' THEN
      NEW.partner_location_number := result->>'location_number';
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- If advanced numbering fails, fall back to legacy system
    RAISE WARNING 'Advanced work order numbering failed (%), falling back to legacy numbering', SQLERRM;
    NEW.work_order_number := public.generate_work_order_number();
    -- Set a default location number if still NULL
    IF NEW.partner_location_number IS NULL OR NEW.partner_location_number = '' THEN
      NEW.partner_location_number := '001';
    END IF;
    RETURN NEW;
END;
$$;

-- STEP 4: Fix organization settings (CRITICAL - these were reversed)
UPDATE organizations 
SET uses_partner_location_numbers = false 
WHERE name = 'ABC Property Management';

UPDATE organizations 
SET uses_partner_location_numbers = true 
WHERE name = 'XYZ Commercial Properties';

-- STEP 5: Clean up ALL work orders with NULL partner_location_number
UPDATE work_orders 
SET partner_location_number = '001'
WHERE partner_location_number IS NULL;

-- STEP 6: Standardize ALL work order numbers to ORG-LOC-WO format
-- Update ABC work orders to proper format
UPDATE work_orders 
SET 
  work_order_number = 'ABC-' || LPAD(COALESCE(partner_location_number, '001'), 3, '0') || '-' || LPAD((ROW_NUMBER() OVER (PARTITION BY organization_id, partner_location_number ORDER BY created_at))::text, 3, '0'),
  partner_location_number = LPAD(COALESCE(partner_location_number, '001'), 3, '0')
WHERE organization_id IN (SELECT id FROM organizations WHERE name = 'ABC Property Management');

-- Update XYZ work orders to proper format  
UPDATE work_orders 
SET 
  work_order_number = 'XYZ-' || LPAD(COALESCE(partner_location_number, '101'), 3, '0') || '-' || LPAD((ROW_NUMBER() OVER (PARTITION BY organization_id, partner_location_number ORDER BY created_at))::text, 3, '0'),
  partner_location_number = LPAD(COALESCE(partner_location_number, '101'), 3, '0')
WHERE organization_id IN (SELECT id FROM organizations WHERE name = 'XYZ Commercial Properties');

-- Update Premium Facilities Group work orders to proper format
UPDATE work_orders 
SET 
  work_order_number = 'PFG-' || LPAD(COALESCE(partner_location_number, '201'), 3, '0') || '-' || LPAD((ROW_NUMBER() OVER (PARTITION BY organization_id, partner_location_number ORDER BY created_at))::text, 3, '0'),
  partner_location_number = LPAD(COALESCE(partner_location_number, '201'), 3, '0')
WHERE organization_id IN (SELECT id FROM organizations WHERE name = 'Premium Facilities Group');

-- STEP 7: Reset organization sequences to clean state
UPDATE organizations SET next_location_sequence = 2 WHERE name = 'ABC Property Management';
UPDATE organizations SET next_location_sequence = 102 WHERE name = 'XYZ Commercial Properties';
UPDATE organizations SET next_location_sequence = 202 WHERE name = 'Premium Facilities Group';

-- STEP 8: Ensure all organizations have proper initials
UPDATE organizations SET initials = 'ABC' WHERE name = 'ABC Property Management' AND (initials IS NULL OR initials = '');
UPDATE organizations SET initials = 'XYZ' WHERE name = 'XYZ Commercial Properties' AND (initials IS NULL OR initials = '');
UPDATE organizations SET initials = 'PFG' WHERE name = 'Premium Facilities Group' AND (initials IS NULL OR initials = '');

-- STEP 9: Verify data integrity - ensure no NULL partner_location_number values remain
DO $$
DECLARE
  null_count integer;
BEGIN
  SELECT COUNT(*) INTO null_count 
  FROM work_orders 
  WHERE partner_location_number IS NULL;
  
  IF null_count > 0 THEN
    RAISE EXCEPTION 'Data integrity check failed: % work orders still have NULL partner_location_number', null_count;
  END IF;
  
  RAISE NOTICE 'SUCCESS: All work orders have valid partner_location_number values';
END $$;

-- STEP 10: Verify work order number format consistency
DO $$
DECLARE
  invalid_count integer;
BEGIN
  SELECT COUNT(*) INTO invalid_count 
  FROM work_orders 
  WHERE work_order_number !~ '^[A-Z]{2,4}-[0-9]{3}-[0-9]{3}$';
  
  IF invalid_count > 0 THEN
    RAISE WARNING 'Format check: % work orders do not follow ORG-LOC-WO format', invalid_count;
  ELSE
    RAISE NOTICE 'SUCCESS: All work orders follow ORG-LOC-WO format';
  END IF;
END $$;

COMMENT ON FUNCTION public.generate_work_order_number_v2(uuid, text) IS 'Generates work order numbers in ORG-LOC-WO format with 3-digit zero-padding. Returns JSONB with work_order_number and location_number fields.';
COMMENT ON FUNCTION public.generate_next_location_number(uuid) IS 'Generates next sequential location number for an organization. Returns 3-digit zero-padded string.';
COMMENT ON FUNCTION public.trigger_generate_work_order_number_v2() IS 'Trigger function that generates work order numbers and extracts location_number into partner_location_number field.';
