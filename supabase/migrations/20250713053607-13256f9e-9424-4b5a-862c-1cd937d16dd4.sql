-- Manual cleanup of existing test data to resolve seeding conflicts

-- Delete test organizations and cascade related data
DELETE FROM organizations WHERE name IN (
  'ABC Property Management',
  'XYZ Commercial Properties', 
  'Premium Facilities Group',
  'Pipes & More Plumbing',
  'Sparks Electric',
  'Cool Air HVAC',
  'Wood Works Carpentry',
  'WorkOrderPro Internal',
  'Green Thumb Landscaping',
  'Fix-It Maintenance',
  'Brush Strokes Painting'
);

-- Delete test users by email patterns
DELETE FROM profiles WHERE email LIKE '%@testcompany%' 
   OR email LIKE '%@example.com' 
   OR email LIKE '%test%'
   OR email IN (
     'admin@workorderpro.com',
     'john.smith@workorderpro.com',
     'sarah.johnson@workorderpro.com',
     'manager@abc-property.com',
     'operations@xyz-commercial.com',
     'facilities@premiumfacilities.com',
     'joe@pipesmore.com',
     'mike@sparkselectric.com',
     'tom@coolair.com',
     'bob@woodworks.com',
     'alex@pipesmore.com',
     'sam@sparkselectric.com',
     'chris@coolair.com',
     'dave@woodworks.com'
   );

-- Delete test trades if they exist
DELETE FROM trades WHERE name IN (
  'Plumbing', 'Electrical', 'HVAC', 'Carpentry', 
  'Painting', 'General Maintenance', 'Landscaping',
  'Roofing', 'Flooring', 'Security Systems'
);

-- Reset organization sequence numbers
UPDATE organizations SET next_sequence_number = 1;