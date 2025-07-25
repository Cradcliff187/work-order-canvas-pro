-- Create preview function that doesn't increment sequence numbers
CREATE OR REPLACE FUNCTION public.preview_work_order_number_per_location(
  org_id uuid,
  location_code text
)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  org_record organizations%ROWTYPE;
  current_sequence integer;
  location_sequence_record organization_location_sequences%ROWTYPE;
BEGIN
  -- Get organization details
  SELECT * INTO org_record
  FROM organizations
  WHERE id = org_id AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organization not found or inactive: %', org_id;
  END IF;
  
  -- Get current sequence for this location (without incrementing)
  SELECT * INTO location_sequence_record
  FROM organization_location_sequences
  WHERE organization_id = org_id AND location_number = location_code;
  
  IF FOUND THEN
    current_sequence := location_sequence_record.next_sequence_number;
  ELSE
    -- If no sequence exists for this location, it would start at 1
    current_sequence := 1;
  END IF;
  
  -- Return the work order number that would be generated
  RETURN CONCAT(
    COALESCE(org_record.initials, 'ORG'),
    '-',
    location_code,
    '-',
    LPAD(current_sequence::text, 3, '0')
  );
END;
$$;

-- Create/update the generation function to properly increment
CREATE OR REPLACE FUNCTION public.generate_work_order_number_per_location(
  org_id uuid,
  location_code text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  org_record organizations%ROWTYPE;
  new_sequence integer;
  location_sequence_record organization_location_sequences%ROWTYPE;
BEGIN
  -- Get organization details
  SELECT * INTO org_record
  FROM organizations
  WHERE id = org_id AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organization not found or inactive: %', org_id;
  END IF;
  
  -- Get or create sequence for this organization-location combination
  SELECT * INTO location_sequence_record
  FROM organization_location_sequences
  WHERE organization_id = org_id AND location_number = location_code;
  
  IF FOUND THEN
    -- Update existing sequence
    UPDATE organization_location_sequences
    SET next_sequence_number = next_sequence_number + 1,
        updated_at = now()
    WHERE organization_id = org_id AND location_number = location_code
    RETURNING next_sequence_number - 1 INTO new_sequence;
  ELSE
    -- Create new sequence starting at 1
    INSERT INTO organization_location_sequences (
      organization_id,
      location_number,
      next_sequence_number
    ) VALUES (
      org_id,
      location_code,
      2  -- Next will be 2, current is 1
    );
    new_sequence := 1;
  END IF;
  
  -- Return the work order number
  RETURN CONCAT(
    COALESCE(org_record.initials, 'ORG'),
    '-',
    location_code,
    '-',
    LPAD(new_sequence::text, 3, '0')
  );
END;
$$;

-- Function to fix existing sequence numbers based on actual work orders
CREATE OR REPLACE FUNCTION public.fix_work_order_sequence_numbers()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  location_record record;
  max_sequence integer;
  fixed_count integer := 0;
BEGIN
  -- Loop through all organization-location combinations that have work orders
  FOR location_record IN
    SELECT DISTINCT 
      o.id as organization_id,
      o.initials,
      SPLIT_PART(wo.work_order_number, '-', 2) as location_code
    FROM work_orders wo
    JOIN organizations o ON o.id = wo.organization_id
    WHERE wo.work_order_number ~ '^[A-Z]+-[^-]+-[0-9]+$'
  LOOP
    -- Find the highest sequence number for this org-location combination
    SELECT MAX(
      CAST(SPLIT_PART(wo.work_order_number, '-', 3) AS integer)
    ) INTO max_sequence
    FROM work_orders wo
    WHERE wo.organization_id = location_record.organization_id
    AND SPLIT_PART(wo.work_order_number, '-', 2) = location_record.location_code;
    
    -- Update or create the sequence record
    INSERT INTO organization_location_sequences (
      organization_id,
      location_number,
      next_sequence_number
    ) VALUES (
      location_record.organization_id,
      location_record.location_code,
      COALESCE(max_sequence, 0) + 1
    )
    ON CONFLICT (organization_id, location_number)
    DO UPDATE SET
      next_sequence_number = COALESCE(max_sequence, 0) + 1,
      updated_at = now();
    
    fixed_count := fixed_count + 1;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'locations_fixed', fixed_count,
    'message', 'Work order sequence numbers have been fixed'
  );
END;
$$;