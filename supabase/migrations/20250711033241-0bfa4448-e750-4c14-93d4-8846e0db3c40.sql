-- Create internal organization and migrate data
-- This migration establishes proper organization types and creates internal company structure

-- 1. Insert WorkOrderPro internal organization
INSERT INTO public.organizations (
  name, 
  contact_email, 
  contact_phone,
  address,
  organization_type,
  initials,
  next_sequence_number
) VALUES (
  'WorkOrderPro Internal',
  'admin@workorderpro.com',
  '(555) 000-0000',
  '100 Main Street, Suite 200, Business City, BC 12345',
  'internal',
  'WOP',
  1
) ON CONFLICT (name) DO NOTHING;

-- 2. Update existing partner organizations with proper types and initials
UPDATE public.organizations 
SET 
  organization_type = 'partner',
  initials = 'ABC',
  next_sequence_number = COALESCE(next_sequence_number, 1)
WHERE name = 'ABC Property Management';

UPDATE public.organizations
SET 
  organization_type = 'partner', 
  initials = 'XYZ',
  next_sequence_number = COALESCE(next_sequence_number, 1)
WHERE name = 'XYZ Commercial Properties';

UPDATE public.organizations
SET 
  organization_type = 'partner',
  initials = 'PFG', 
  next_sequence_number = COALESCE(next_sequence_number, 1)
WHERE name = 'Premium Facilities Group';

-- 3. Create subcontractor organizations
INSERT INTO public.organizations (name, contact_email, contact_phone, address, organization_type, initials, next_sequence_number) VALUES
('Pipes & More Plumbing', 'contact@pipesmore.com', '(555) 987-6543', '456 Trade Ave, Plumber City, PC 67890', 'subcontractor', 'PMP', 1),
('Sparks Electric', 'contact@sparkselectric.com', '(555) 876-5432', '789 Electric Blvd, Sparks Town, ST 54321', 'subcontractor', 'SPE', 1),
('Cool Air HVAC', 'contact@coolairhvac.com', '(555) 765-4321', '321 HVAC Street, Cool City, CC 43210', 'subcontractor', 'CAH', 1),
('Wood Works Carpentry', 'contact@woodworks.com', '(555) 654-3210', '654 Carpenter Lane, Wood Village, WV 32109', 'subcontractor', 'WWC', 1),
('Brush Strokes Painting', 'contact@brushstrokes.com', '(555) 543-2109', '987 Paint Avenue, Color Town, CT 21098', 'subcontractor', 'BSP', 1),
('Fix-It Maintenance', 'contact@fixit.com', '(555) 432-1098', '147 Repair Road, Fix City, FC 10987', 'subcontractor', 'FIM', 1),
('Green Thumb Landscaping', 'contact@greenthumb.com', '(555) 321-0987', '258 Garden Street, Green Valley, GV 09876', 'subcontractor', 'GTL', 1)
ON CONFLICT (name) DO NOTHING;

-- 4. Link all admin users to internal organization
INSERT INTO public.user_organizations (user_id, organization_id)
SELECT 
  p.id as user_id,
  o.id as organization_id
FROM public.profiles p
CROSS JOIN public.organizations o
WHERE p.user_type = 'admin' 
  AND o.organization_type = 'internal'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_organizations uo 
    WHERE uo.user_id = p.id AND uo.organization_id = o.id
  );

-- 5. Ensure all admin users are marked as employees
UPDATE public.profiles 
SET is_employee = true 
WHERE user_type = 'admin';