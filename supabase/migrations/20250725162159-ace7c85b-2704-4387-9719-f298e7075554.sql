-- Create table to track per-location sequence numbers
CREATE TABLE IF NOT EXISTS public.organization_location_sequences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_number TEXT NOT NULL,
  next_sequence_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, location_number)
);

-- Enable RLS
ALTER TABLE public.organization_location_sequences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "admins_can_manage_location_sequences" ON public.organization_location_sequences
FOR ALL USING (jwt_is_admin()) WITH CHECK (jwt_is_admin());

CREATE POLICY "employees_can_select_location_sequences" ON public.organization_location_sequences
FOR SELECT USING (jwt_user_type() = 'employee'::user_type);

-- Create function to generate work order number with per-location sequencing
CREATE OR REPLACE FUNCTION public.generate_work_order_number_per_location(
  org_id UUID,
  location_code TEXT
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  org_record RECORD;
  seq_num INTEGER;
  work_order_num TEXT;
BEGIN
  -- Get organization details
  SELECT name, initials, uses_partner_location_numbers
  INTO org_record
  FROM organizations 
  WHERE id = org_id AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organization not found or inactive: %', org_id;
  END IF;
  
  -- For organizations using partner location numbers, use per-location sequencing
  IF org_record.uses_partner_location_numbers THEN
    -- Get and increment the sequence for this organization-location combination
    INSERT INTO organization_location_sequences (organization_id, location_number, next_sequence_number)
    VALUES (org_id, location_code, 2)
    ON CONFLICT (organization_id, location_number)
    DO UPDATE SET 
      next_sequence_number = organization_location_sequences.next_sequence_number + 1,
      updated_at = now()
    RETURNING next_sequence_number - 1 INTO seq_num;
  ELSE
    -- For organizations not using partner location numbers, use global sequence
    UPDATE organizations 
    SET next_sequence_number = COALESCE(next_sequence_number, 1) + 1
    WHERE id = org_id
    RETURNING next_sequence_number - 1 INTO seq_num;
  END IF;
  
  -- Format the work order number
  work_order_num := COALESCE(org_record.initials, 'ORG') || '-' || location_code || '-' || LPAD(seq_num::TEXT, 3, '0');
  
  RETURN work_order_num;
END;
$$;

-- Create migration function to fix existing work order numbers
CREATE OR REPLACE FUNCTION public.fix_existing_work_order_numbers()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  wo_record RECORD;
  org_record RECORD;
  location_sequence_map JSONB := '{}';
  new_number TEXT;
  updated_count INTEGER := 0;
BEGIN
  -- Only allow admins to run this
  IF NOT jwt_is_admin() THEN
    RAISE EXCEPTION 'Only administrators can fix work order numbers';
  END IF;
  
  -- Process work orders by organization and location, ordered by date
  FOR wo_record IN 
    SELECT wo.*, o.initials, o.uses_partner_location_numbers
    FROM work_orders wo
    JOIN organizations o ON o.id = wo.organization_id
    WHERE o.uses_partner_location_numbers = true
    ORDER BY wo.organization_id, wo.store_location, wo.date_submitted
  LOOP
    -- Extract location number from existing work order number
    DECLARE
      location_code TEXT;
      sequence_key TEXT;
      current_seq INTEGER;
    BEGIN
      -- Parse location code from existing work order number (format: INITIALS-LOCATION-SEQ)
      location_code := split_part(wo_record.work_order_number, '-', 2);
      sequence_key := wo_record.organization_id::TEXT || '-' || location_code;
      
      -- Get current sequence for this org-location combo
      current_seq := COALESCE((location_sequence_map ->> sequence_key)::INTEGER, 0) + 1;
      
      -- Generate new work order number
      new_number := COALESCE(wo_record.initials, 'ORG') || '-' || location_code || '-' || LPAD(current_seq::TEXT, 3, '0');
      
      -- Update the work order if number changed
      IF new_number != wo_record.work_order_number THEN
        UPDATE work_orders 
        SET work_order_number = new_number 
        WHERE id = wo_record.id;
        updated_count := updated_count + 1;
      END IF;
      
      -- Update sequence tracking
      location_sequence_map := jsonb_set(
        location_sequence_map, 
        ARRAY[sequence_key], 
        to_jsonb(current_seq)
      );
      
      -- Ensure organization_location_sequences table has correct next sequence
      INSERT INTO organization_location_sequences (organization_id, location_number, next_sequence_number)
      VALUES (wo_record.organization_id, location_code, current_seq + 1)
      ON CONFLICT (organization_id, location_number)
      DO UPDATE SET next_sequence_number = GREATEST(organization_location_sequences.next_sequence_number, current_seq + 1);
    END;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'updated_count', updated_count,
    'message', 'Work order numbers fixed successfully'
  );
END;
$$;