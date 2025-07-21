
-- Step 1: Clear all work orders and related data
-- This will cascade delete all related records due to foreign key constraints

-- Delete all work order assignments
DELETE FROM work_order_assignments;

-- Delete all work order reports  
DELETE FROM work_order_reports;

-- Delete all work order attachments
DELETE FROM work_order_attachments;

-- Delete all email logs related to work orders
DELETE FROM email_logs WHERE work_order_id IS NOT NULL;

-- Delete all work orders
DELETE FROM work_orders;

-- Reset organization sequences to clean state
UPDATE organizations SET 
  next_sequence_number = 1,
  next_location_sequence = CASE 
    WHEN name = 'ABC Property Management' THEN 1
    WHEN name = 'XYZ Commercial Properties' THEN 101  
    WHEN name = 'Premium Facilities Group' THEN 201
    ELSE next_location_sequence
  END;

-- CRITICAL FIX: Correct organization settings (ABC=auto, XYZ=manual)
UPDATE organizations 
SET uses_partner_location_numbers = false 
WHERE name = 'ABC Property Management';

UPDATE organizations 
SET uses_partner_location_numbers = true 
WHERE name = 'XYZ Commercial Properties';

-- Step 2: Create the corrected work order numbering system

-- Replace the broken generate_work_order_number_v2 function
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
  org_uses_location_numbers boolean;
  final_location_number text;
  work_order_sequence integer;
  work_order_num text;
  fallback_num text;
BEGIN
  -- Get organization details
  SELECT initials, name, uses_partner_location_numbers 
  INTO org_initials, org_name, org_uses_location_numbers
  FROM organizations 
  WHERE id = org_id AND is_active = true;
  
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
  
  -- Get per-location work order sequence number by counting existing work orders
  SELECT COUNT(*) + 1 INTO work_order_sequence
  FROM work_orders 
  WHERE organization_id = org_id 
    AND partner_location_number = final_location_number;
  
  -- Build work order number in standardized format: ORG-LOC-WO (all 3 digits)
  work_order_num := org_initials || '-' || LPAD(final_location_number, 3, '0') || '-' || LPAD(work_order_sequence::text, 3, '0');
  
  -- CRITICAL: Return success response with location_number
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

-- Fix generate_next_location_number to work for all organizations
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

-- Update trigger function to extract and store location_number
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

-- Verify organization settings are correct
DO $$
DECLARE
  abc_setting boolean;
  xyz_setting boolean;
BEGIN
  SELECT uses_partner_location_numbers INTO abc_setting FROM organizations WHERE name = 'ABC Property Management';
  SELECT uses_partner_location_numbers INTO xyz_setting FROM organizations WHERE name = 'XYZ Commercial Properties';
  
  IF abc_setting != false THEN
    RAISE EXCEPTION 'ABC Property Management should have uses_partner_location_numbers = false (auto-generate)';
  END IF;
  
  IF xyz_setting != true THEN
    RAISE EXCEPTION 'XYZ Commercial Properties should have uses_partner_location_numbers = true (manual entry)';
  END IF;
  
  RAISE NOTICE 'SUCCESS: Organization settings verified correctly';
END $$;

-- Add comments for clarity
COMMENT ON FUNCTION public.generate_work_order_number_v2(uuid, text) IS 'Generates work order numbers in ORG-LOC-WO format with 3-digit zero-padding. Returns JSONB with work_order_number and location_number fields.';
COMMENT ON FUNCTION public.generate_next_location_number(uuid) IS 'Generates next sequential location number for an organization. Returns 3-digit zero-padded string.';
COMMENT ON FUNCTION public.trigger_generate_work_order_number_v2() IS 'Trigger function that generates work order numbers and extracts location_number into partner_location_number field.';
