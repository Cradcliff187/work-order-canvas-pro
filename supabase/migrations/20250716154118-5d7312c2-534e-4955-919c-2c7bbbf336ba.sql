-- Update test organization to have uses_partner_location_numbers=true for testing
UPDATE organizations 
SET uses_partner_location_numbers = true 
WHERE name = 'ABC Property Management';