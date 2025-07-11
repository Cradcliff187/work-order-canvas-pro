-- Create partner locations for existing partner organizations
-- This migration adds realistic location data for the partner location dropdown

-- Insert partner locations for ABC Property Management
INSERT INTO public.partner_locations (
  organization_id,
  location_number,
  location_name,
  street_address,
  city,
  state,
  zip_code,
  contact_name,
  contact_phone,
  contact_email,
  is_active
) VALUES 
  -- ABC Property Management locations
  (
    (SELECT id FROM public.organizations WHERE name = 'ABC Property Management' LIMIT 1),
    '504',
    'Downtown Office Complex',
    '504 N Michigan Ave',
    'Chicago',
    'IL',
    '60611',
    'Mike Johnson',
    '(312) 555-0104',
    'downtown@abcproperty.com',
    true
  ),
  (
    (SELECT id FROM public.organizations WHERE name = 'ABC Property Management' LIMIT 1),
    '605',
    'Lincoln Park Warehouse',
    '605 W Fullerton Pkwy',
    'Chicago',
    'IL',
    '60614',
    'Sarah Mitchell',
    '(312) 555-0105',
    'warehouse@abcproperty.com',
    true
  ),
  (
    (SELECT id FROM public.organizations WHERE name = 'ABC Property Management' LIMIT 1),
    '1201',
    'River North Retail Space',
    '1201 N State St',
    'Chicago',
    'IL',
    '60610',
    'David Chen',
    '(312) 555-0106',
    'retail@abcproperty.com',
    false
  ),
  (
    (SELECT id FROM public.organizations WHERE name = 'ABC Property Management' LIMIT 1),
    '1450',
    'South Loop Distribution Center',
    '1450 S Michigan Ave',
    'Chicago',
    'IL',
    '60605',
    'Lisa Rodriguez',
    '(312) 555-0107',
    'distribution@abcproperty.com',
    true
  ),
  -- XYZ Commercial Properties locations
  (
    (SELECT id FROM public.organizations WHERE name = 'XYZ Commercial Properties' LIMIT 1),
    '301',
    'Downtown Dallas Office',
    '301 Commerce St',
    'Dallas',
    'TX',
    '75202',
    'James Wilson',
    '(214) 555-0201',
    'downtown@xyzcommercial.com',
    true
  ),
  (
    (SELECT id FROM public.organizations WHERE name = 'XYZ Commercial Properties' LIMIT 1),
    '425',
    'Uptown Business Center',
    '425 McKinney Ave',
    'Dallas',
    'TX',
    '75204',
    'Amanda Foster',
    '(214) 555-0202',
    'uptown@xyzcommercial.com',
    true
  ),
  (
    (SELECT id FROM public.organizations WHERE name = 'XYZ Commercial Properties' LIMIT 1),
    '850',
    'Deep Ellum Creative Space',
    '850 Elm St',
    'Dallas',
    'TX',
    '75226',
    'Marcus Thompson',
    '(214) 555-0203',
    'creative@xyzcommercial.com',
    false
  ),
  (
    (SELECT id FROM public.organizations WHERE name = 'XYZ Commercial Properties' LIMIT 1),
    '1100',
    'Legacy West Office Park',
    '1100 Legacy Dr',
    'Plano',
    'TX',
    '75024',
    'Jennifer Lee',
    '(972) 555-0204',
    'legacy@xyzcommercial.com',
    true
  ),
  (
    (SELECT id FROM public.organizations WHERE name = 'XYZ Commercial Properties' LIMIT 1),
    '1375',
    'Arlington Distribution Hub',
    '1375 W Arkansas Ln',
    'Arlington',
    'TX',
    '76013',
    'Robert Garcia',
    '(817) 555-0205',
    'arlington@xyzcommercial.com',
    false
  ),
  -- Premium Facilities Group locations
  (
    (SELECT id FROM public.organizations WHERE name = 'Premium Facilities Group' LIMIT 1),
    '200',
    'Brickell Financial Center',
    '200 S Biscayne Blvd',
    'Miami',
    'FL',
    '33131',
    'Carlos Rodriguez',
    '(305) 555-0301',
    'brickell@premiumfacilities.com',
    true
  ),
  (
    (SELECT id FROM public.organizations WHERE name = 'Premium Facilities Group' LIMIT 1),
    '375',
    'Wynwood Arts District',
    '375 NW 26th St',
    'Miami',
    'FL',
    '33127',
    'Isabella Martinez',
    '(305) 555-0302',
    'wynwood@premiumfacilities.com',
    true
  ),
  (
    (SELECT id FROM public.organizations WHERE name = 'Premium Facilities Group' LIMIT 1),
    '600',
    'Coral Gables Office Plaza',
    '600 Biltmore Way',
    'Coral Gables',
    'FL',
    '33134',
    'Michael Thompson',
    '(305) 555-0303',
    'coralgables@premiumfacilities.com',
    false
  ),
  (
    (SELECT id FROM public.organizations WHERE name = 'Premium Facilities Group' LIMIT 1),
    '925',
    'Aventura Business Park',
    '925 NE 199th St',
    'Aventura',
    'FL',
    '33180',
    'Sandra Lopez',
    '(305) 555-0304',
    'aventura@premiumfacilities.com',
    true
  );