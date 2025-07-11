-- Set initials for existing partner organizations that don't have them
UPDATE organizations 
SET initials = 'ABC' 
WHERE name = 'ABC Property Management' AND initials IS NULL;

UPDATE organizations 
SET initials = 'XYZ' 
WHERE name = 'XYZ Commercial Properties' AND initials IS NULL;

UPDATE organizations 
SET initials = 'PFG' 
WHERE name = 'Premium Facilities Group' AND initials IS NULL;

-- Set default initials for any other partner organizations that don't have them
-- Using first 3 uppercase letters of organization name
UPDATE organizations 
SET initials = UPPER(LEFT(REGEXP_REPLACE(name, '[^A-Za-z]', '', 'g'), 3))
WHERE organization_type = 'partner' 
  AND (initials IS NULL OR initials = '')
  AND LENGTH(REGEXP_REPLACE(name, '[^A-Za-z]', '', 'g')) >= 3;