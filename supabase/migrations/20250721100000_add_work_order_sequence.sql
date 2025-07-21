
-- Add missing column to organizations table
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS next_work_order_sequence integer DEFAULT 1;

-- Create the increment_work_order_sequence function
CREATE OR REPLACE FUNCTION public.increment_work_order_sequence(organization_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_sequence integer;
BEGIN
  -- Get and increment the sequence number atomically
  UPDATE public.organizations 
  SET next_work_order_sequence = next_work_order_sequence + 1
  WHERE id = organization_id
  RETURNING next_work_order_sequence - 1 INTO next_sequence;
  
  -- Return the sequence number that was used
  RETURN next_sequence;
END;
$$;
