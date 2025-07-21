
-- Fix organization settings issues
-- 1. Add initials to "Test Organization"
-- 2. Fix "Internal Test Organization" to not use partner location numbers
-- 3. Standardize test partners for better testing coverage

-- Update Test Organization with initials
UPDATE organizations 
SET initials = 'TST'
WHERE name = 'Test Organization' AND initials IS NULL;

-- Fix Internal Test Organization - internal orgs should not use partner location numbers
UPDATE organizations 
SET uses_partner_location_numbers = false
WHERE name = 'Internal Test Organization' AND organization_type = 'internal';

-- Set Test Property Management to use partner location numbers for comprehensive testing
UPDATE organizations 
SET uses_partner_location_numbers = true
WHERE name = 'Test Property Management' AND organization_type = 'partner';

-- Ensure all partner organizations have initials (safety check)
UPDATE organizations 
SET initials = CASE 
  WHEN name = 'Test Property Management' THEN 'TPM'
  WHEN name = 'ABC Property Management' THEN 'ABC'
  WHEN name = 'XYZ Commercial Properties' THEN 'XYZ'
  WHEN name = 'Premium Facilities Group' THEN 'PFG'
  ELSE initials
END
WHERE organization_type = 'partner' AND (initials IS NULL OR initials = '');

-- Ensure all subcontractor organizations have initials and don't use partner location numbers
UPDATE organizations 
SET 
  initials = CASE 
    WHEN name = 'Pipes & More Plumbing' THEN 'PMP'
    WHEN name = 'Sparks Electric' THEN 'SPE'
    WHEN name = 'Cool Air HVAC' THEN 'CAH'
    WHEN name = 'Wood Works Carpentry' THEN 'WWC'
    WHEN name = 'Brush Strokes Painting' THEN 'BSP'
    WHEN name = 'Fix-It Maintenance' THEN 'FIM'
    WHEN name = 'Green Thumb Landscaping' THEN 'GTL'
    ELSE initials
  END,
  uses_partner_location_numbers = false
WHERE organization_type = 'subcontractor';

-- Ensure all internal organizations have initials and don't use partner location numbers
UPDATE organizations 
SET 
  initials = CASE 
    WHEN name = 'WorkOrderPro Internal' THEN 'WOP'
    WHEN name = 'Internal Test Organization' THEN 'ITO'
    ELSE initials
  END,
  uses_partner_location_numbers = false
WHERE organization_type = 'internal';

-- Reset sequence counters to ensure clean testing
-- Organizations using manual locations should have higher next_sequence_number
-- Organizations using auto-generation should have higher next_location_sequence
UPDATE organizations 
SET 
  next_sequence_number = CASE 
    WHEN uses_partner_location_numbers = true THEN GREATEST(next_sequence_number, 1)
    ELSE 1
  END,
  next_location_sequence = CASE 
    WHEN uses_partner_location_numbers = false THEN GREATEST(next_location_sequence, 1)
    ELSE 1
  END;
