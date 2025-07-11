-- Add structured address fields to work_orders table
-- Purpose: Enable better data quality and future geocoding capabilities

-- Add new structured location fields
ALTER TABLE public.work_orders 
ADD COLUMN location_street_address TEXT,
ADD COLUMN location_city TEXT,
ADD COLUMN location_state TEXT,
ADD COLUMN location_zip_code TEXT;

-- Add validation for state (2 characters)
ALTER TABLE public.work_orders 
ADD CONSTRAINT chk_location_state_format 
CHECK (location_state IS NULL OR (length(location_state) = 2 AND location_state = upper(location_state)));

-- Add validation for ZIP code (5 digits or 5+4 format)
ALTER TABLE public.work_orders 
ADD CONSTRAINT chk_location_zip_format 
CHECK (location_zip_code IS NULL OR location_zip_code ~ '^\d{5}(-\d{4})?$');

-- Create performance indexes
CREATE INDEX idx_work_orders_location_number 
ON public.work_orders (organization_id, partner_location_number) 
WHERE partner_location_number IS NOT NULL;

CREATE INDEX idx_work_orders_location_city_state 
ON public.work_orders (location_city, location_state) 
WHERE location_city IS NOT NULL AND location_state IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.work_orders.location_street_address IS 'Structured street address for better data quality and geocoding';
COMMENT ON COLUMN public.work_orders.location_city IS 'City name for structured addressing';
COMMENT ON COLUMN public.work_orders.location_state IS 'Two-character state abbreviation';
COMMENT ON COLUMN public.work_orders.location_zip_code IS 'ZIP code in 12345 or 12345-6789 format';