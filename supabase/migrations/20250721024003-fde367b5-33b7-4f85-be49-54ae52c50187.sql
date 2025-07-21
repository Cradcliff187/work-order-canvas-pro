
-- PHASE 1: Critical Database Function Fixes

-- Step 1: Fix generate_next_location_number to remove old validation logic
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

-- Step 2: Update generate_work_order_number_v2 to properly store location numbers
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
BEGIN
  -- Temporarily disable RLS for this function execution
  SET LOCAL row_security = off;
  
  -- Get organization details
  SELECT initials, name INTO org_initials, org_name
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
  
  -- Ensure we have a location number (auto-generate if not provided)
  IF location_number IS NULL OR location_number = '' THEN
    final_location_number := public.generate_next_location_number(org_id);
  ELSE
    final_location_number := location_number;
  END IF;
  
  -- Get per-location sequence number by counting existing work orders for this org+location
  SELECT COUNT(*) + 1 INTO sequence_num
  FROM work_orders 
  WHERE organization_id = org_id 
    AND partner_location_number = final_location_number;
  
  -- Build work order number in standardized format: ORG-LOC-WO (all 3 digits)
  work_order_num := org_initials || '-' || LPAD(final_location_number, 3, '0') || '-' || LPAD(sequence_num::text, 3, '0');
  
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

-- Step 3: Fix trigger function to extract and store location_number from JSONB response
CREATE OR REPLACE FUNCTION public.trigger_generate_work_order_number_v2()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  numbering_result jsonb;
BEGIN
  -- Only generate if work_order_number is not already set
  IF NEW.work_order_number IS NULL OR NEW.work_order_number = '' THEN
    BEGIN
      -- Use organization_id (submitter) for numbering by default
      -- Use partner_location_number if provided
      numbering_result := public.generate_work_order_number_v2(
        NEW.organization_id,
        NEW.partner_location_number
      );
      
      -- Extract the work order number from the result
      NEW.work_order_number := numbering_result->>'work_order_number';
      
      -- CRITICAL FIX: Store the location number back to the work order
      IF numbering_result->>'location_number' IS NOT NULL THEN
        NEW.partner_location_number := numbering_result->>'location_number';
      END IF;
      
      -- Log warnings or errors for monitoring
      IF numbering_result->>'is_fallback' = 'true' THEN
        RAISE WARNING 'Work order % using fallback numbering: %', 
          NEW.id, numbering_result->>'warning';
      END IF;
      
    EXCEPTION
      WHEN OTHERS THEN
        -- Ultimate fallback to legacy system
        RAISE WARNING 'Advanced work order numbering failed (%), falling back to legacy numbering', SQLERRM;
        NEW.work_order_number := public.generate_work_order_number();
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

-- PHASE 2: Data Cleanup

-- Step 4: Clean existing work order data to have proper partner_location_number values
-- This will update existing work orders that have NULL partner_location_number
UPDATE work_orders 
SET partner_location_number = '001'
WHERE partner_location_number IS NULL 
  AND organization_id IS NOT NULL;

-- Step 5: Fix organizations missing initials
UPDATE organizations 
SET initials = CASE 
  WHEN name = 'ABC Property Management' THEN 'ABC'
  WHEN name = 'XYZ Commercial Properties' THEN 'XYZ'
  WHEN name = 'Premium Facilities Group' THEN 'PFG'
  WHEN name = 'Pipes & More Plumbing' THEN 'PMP'
  WHEN name = 'Sparks Electric' THEN 'SPE'
  WHEN name = 'WorkOrderPro Internal' THEN 'WOP'
  ELSE UPPER(LEFT(name, 3))
END
WHERE initials IS NULL OR initials = '';

-- Step 6: Reset sequence counters for clean testing
UPDATE organizations SET next_location_sequence = 1;
UPDATE organizations SET next_sequence_number = 1;

-- Step 7: Set up test organizations for both scenarios
UPDATE organizations 
SET uses_partner_location_numbers = false 
WHERE name = 'ABC Property Management';

UPDATE organizations 
SET uses_partner_location_numbers = true 
WHERE name = 'XYZ Commercial Properties';

-- Step 8: Create fresh test data
SELECT setup_bulletproof_test_data();
