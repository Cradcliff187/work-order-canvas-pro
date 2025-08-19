-- Add partner location for Testing Org to enable work order creation
INSERT INTO partner_locations (
  organization_id, 
  location_name, 
  location_number, 
  street_address, 
  city, 
  state, 
  zip_code, 
  contact_name, 
  contact_email,
  is_active
) VALUES (
  '53e8c291-f9cc-4208-980d-458b2787c7d1',
  'Testing Location',
  '001',
  '123 Test Street',
  'Test City',
  'TX',
  '12345',
  'Test Manager',
  'test@testingorg.com',
  true
) ON CONFLICT (organization_id, location_number) DO NOTHING;