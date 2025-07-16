-- Add location number management columns to organizations table
-- These fields support enhanced work order numbering schemes that can incorporate partner location information

ALTER TABLE public.organizations 
ADD COLUMN uses_partner_location_numbers BOOLEAN DEFAULT false,
ADD COLUMN next_location_sequence INTEGER DEFAULT 1;

-- Add helpful comments for documentation
COMMENT ON COLUMN public.organizations.uses_partner_location_numbers IS 'When true, enables location-based work order numbering that incorporates partner location numbers';
COMMENT ON COLUMN public.organizations.next_location_sequence IS 'Tracks the next sequence number for location-based work order numbering';