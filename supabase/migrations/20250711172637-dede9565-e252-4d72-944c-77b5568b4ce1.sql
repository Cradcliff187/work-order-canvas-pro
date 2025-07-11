-- Enhanced work order number generation with better error handling
CREATE OR REPLACE FUNCTION public.generate_work_order_number_v2(
  org_id uuid,
  location_number text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  org_initials text;
  sequence_num integer;
  work_order_num text;
  fallback_num text;
  org_name text;
BEGIN
  -- Get organization details and lock row for sequence update
  SELECT initials, name INTO org_initials, org_name
  FROM public.organizations 
  WHERE id = org_id AND is_active = true
  FOR UPDATE;
  
  -- If organization not found
  IF org_name IS NULL THEN
    RAISE EXCEPTION 'Organization not found or inactive: %', org_id;
  END IF;
  
  -- Get and increment sequence number atomically
  UPDATE public.organizations 
  SET next_sequence_number = next_sequence_number + 1
  WHERE id = org_id
  RETURNING next_sequence_number - 1 INTO sequence_num;
  
  -- Generate fallback number
  fallback_num := public.generate_work_order_number();
  
  -- If initials are missing or empty, return warning with fallback
  IF org_initials IS NULL OR org_initials = '' THEN
    RETURN jsonb_build_object(
      'work_order_number', fallback_num,
      'is_fallback', true,
      'warning', 'Organization "' || org_name || '" needs initials for smart numbering. Using fallback number.',
      'organization_name', org_name,
      'requires_initials', true
    );
  END IF;
  
  -- Build work order number based on location presence
  IF location_number IS NOT NULL AND location_number != '' THEN
    work_order_num := org_initials || '-' || location_number || '-' || LPAD(sequence_num::text, 3, '0');
  ELSE
    work_order_num := org_initials || '-' || LPAD(sequence_num::text, 4, '0');
  END IF;
  
  RETURN jsonb_build_object(
    'work_order_number', work_order_num,
    'is_fallback', false,
    'organization_name', org_name,
    'requires_initials', false
  );
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

-- Enhanced trigger function with better fallback handling
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