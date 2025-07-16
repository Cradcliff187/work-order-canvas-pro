-- Create function to generate next location number for organizations
-- This function atomically increments the location sequence and returns a zero-padded location number

CREATE OR REPLACE FUNCTION public.generate_next_location_number(org_id uuid)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  seq_num integer;
  org_exists boolean;
BEGIN
  -- Check if organization exists and uses location numbers
  SELECT EXISTS(
    SELECT 1 FROM organizations 
    WHERE id = org_id AND uses_partner_location_numbers = true
  ) INTO org_exists;
  
  IF NOT org_exists THEN
    RAISE EXCEPTION 'Organization not found or does not use partner location numbers: %', org_id;
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

-- Add helpful comment
COMMENT ON FUNCTION public.generate_next_location_number(uuid) IS 
  'Generates the next sequential location number for an organization that uses partner location numbers. Returns a zero-padded 3-digit string (e.g., "001", "002").';

-- Example usage:
-- SELECT generate_next_location_number('123e4567-e89b-12d3-a456-426614174000');