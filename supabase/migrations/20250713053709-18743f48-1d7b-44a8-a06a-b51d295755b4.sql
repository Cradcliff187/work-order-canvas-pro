-- Manual cleanup of existing test data with proper dependency handling

-- First, delete all dependent data in correct order

-- Delete email logs
DELETE FROM email_logs WHERE work_order_id IN (
  SELECT id FROM work_orders WHERE organization_id IN (
    SELECT id FROM organizations WHERE name IN (
      'ABC Property Management', 'XYZ Commercial Properties', 'Premium Facilities Group',
      'Pipes & More Plumbing', 'Sparks Electric', 'Cool Air HVAC', 'Wood Works Carpentry',
      'WorkOrderPro Internal', 'Green Thumb Landscaping', 'Fix-It Maintenance', 'Brush Strokes Painting'
    )
  )
);

-- Delete work order attachments
DELETE FROM work_order_attachments WHERE work_order_id IN (
  SELECT id FROM work_orders WHERE organization_id IN (
    SELECT id FROM organizations WHERE name IN (
      'ABC Property Management', 'XYZ Commercial Properties', 'Premium Facilities Group',
      'Pipes & More Plumbing', 'Sparks Electric', 'Cool Air HVAC', 'Wood Works Carpentry',
      'WorkOrderPro Internal', 'Green Thumb Landscaping', 'Fix-It Maintenance', 'Brush Strokes Painting'
    )
  )
);

-- Delete work order reports
DELETE FROM work_order_reports WHERE work_order_id IN (
  SELECT id FROM work_orders WHERE organization_id IN (
    SELECT id FROM organizations WHERE name IN (
      'ABC Property Management', 'XYZ Commercial Properties', 'Premium Facilities Group',
      'Pipes & More Plumbing', 'Sparks Electric', 'Cool Air HVAC', 'Wood Works Carpentry',
      'WorkOrderPro Internal', 'Green Thumb Landscaping', 'Fix-It Maintenance', 'Brush Strokes Painting'
    )
  )
);

-- Delete work order assignments
DELETE FROM work_order_assignments WHERE work_order_id IN (
  SELECT id FROM work_orders WHERE organization_id IN (
    SELECT id FROM organizations WHERE name IN (
      'ABC Property Management', 'XYZ Commercial Properties', 'Premium Facilities Group',
      'Pipes & More Plumbing', 'Sparks Electric', 'Cool Air HVAC', 'Wood Works Carpentry',
      'WorkOrderPro Internal', 'Green Thumb Landscaping', 'Fix-It Maintenance', 'Brush Strokes Painting'
    )
  )
);

-- Delete invoice work orders
DELETE FROM invoice_work_orders WHERE invoice_id IN (
  SELECT id FROM invoices WHERE subcontractor_organization_id IN (
    SELECT id FROM organizations WHERE name IN (
      'ABC Property Management', 'XYZ Commercial Properties', 'Premium Facilities Group',
      'Pipes & More Plumbing', 'Sparks Electric', 'Cool Air HVAC', 'Wood Works Carpentry',
      'WorkOrderPro Internal', 'Green Thumb Landscaping', 'Fix-It Maintenance', 'Brush Strokes Painting'
    )
  )
);

-- Delete invoice attachments
DELETE FROM invoice_attachments WHERE invoice_id IN (
  SELECT id FROM invoices WHERE subcontractor_organization_id IN (
    SELECT id FROM organizations WHERE name IN (
      'ABC Property Management', 'XYZ Commercial Properties', 'Premium Facilities Group',
      'Pipes & More Plumbing', 'Sparks Electric', 'Cool Air HVAC', 'Wood Works Carpentry',
      'WorkOrderPro Internal', 'Green Thumb Landscaping', 'Fix-It Maintenance', 'Brush Strokes Painting'
    )
  )
);

-- Delete invoices
DELETE FROM invoices WHERE subcontractor_organization_id IN (
  SELECT id FROM organizations WHERE name IN (
    'ABC Property Management', 'XYZ Commercial Properties', 'Premium Facilities Group',
    'Pipes & More Plumbing', 'Sparks Electric', 'Cool Air HVAC', 'Wood Works Carpentry',
    'WorkOrderPro Internal', 'Green Thumb Landscaping', 'Fix-It Maintenance', 'Brush Strokes Painting'
  )
);

-- Delete work orders
DELETE FROM work_orders WHERE organization_id IN (
  SELECT id FROM organizations WHERE name IN (
    'ABC Property Management', 'XYZ Commercial Properties', 'Premium Facilities Group',
    'Pipes & More Plumbing', 'Sparks Electric', 'Cool Air HVAC', 'Wood Works Carpentry',
    'WorkOrderPro Internal', 'Green Thumb Landscaping', 'Fix-It Maintenance', 'Brush Strokes Painting'
  )
);

-- Delete partner locations
DELETE FROM partner_locations WHERE organization_id IN (
  SELECT id FROM organizations WHERE name IN (
    'ABC Property Management', 'XYZ Commercial Properties', 'Premium Facilities Group',
    'Pipes & More Plumbing', 'Sparks Electric', 'Cool Air HVAC', 'Wood Works Carpentry',
    'WorkOrderPro Internal', 'Green Thumb Landscaping', 'Fix-It Maintenance', 'Brush Strokes Painting'
  )
);

-- Delete user organization relationships
DELETE FROM user_organizations WHERE organization_id IN (
  SELECT id FROM organizations WHERE name IN (
    'ABC Property Management', 'XYZ Commercial Properties', 'Premium Facilities Group',
    'Pipes & More Plumbing', 'Sparks Electric', 'Cool Air HVAC', 'Wood Works Carpentry',
    'WorkOrderPro Internal', 'Green Thumb Landscaping', 'Fix-It Maintenance', 'Brush Strokes Painting'
  )
);

-- Now delete the organizations
DELETE FROM organizations WHERE name IN (
  'ABC Property Management', 'XYZ Commercial Properties', 'Premium Facilities Group',
  'Pipes & More Plumbing', 'Sparks Electric', 'Cool Air HVAC', 'Wood Works Carpentry',
  'WorkOrderPro Internal', 'Green Thumb Landscaping', 'Fix-It Maintenance', 'Brush Strokes Painting'
);

-- Delete test users by email patterns (keeping current admin)
DELETE FROM profiles WHERE email LIKE '%@testcompany%' 
   OR email LIKE '%@example.com' 
   OR email LIKE '%test%'
   OR email IN (
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

-- Delete test trades if they exist (keeping only ones not referenced)
DELETE FROM trades WHERE name IN (
  'Plumbing', 'Electrical', 'HVAC', 'Carpentry', 
  'Painting', 'General Maintenance', 'Landscaping',
  'Roofing', 'Flooring', 'Security Systems'
) AND id NOT IN (SELECT DISTINCT trade_id FROM work_orders WHERE trade_id IS NOT NULL);