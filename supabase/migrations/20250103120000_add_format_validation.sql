-- Add CHECK constraints for phone and email formats
-- These constraints match the formatting patterns used by our FormattedInput components

-- Phone format constraint: (555) 123-4567 or empty/null
-- Allows NULL, empty string, or properly formatted phone numbers
ALTER TABLE profiles 
ADD CONSTRAINT check_phone_format 
CHECK (
  phone IS NULL OR 
  phone = '' OR 
  phone ~ '^\(\d{3}\) \d{3}-\d{4}$'
);

-- Email format constraint: basic email validation or empty/null
-- Allows NULL, empty string, or valid email format (lowercase, trimmed)
ALTER TABLE profiles 
ADD CONSTRAINT check_email_format 
CHECK (
  email IS NULL OR 
  email = '' OR 
  (email ~ '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$' AND email = lower(trim(email)))
);

-- Contact email format constraint for organizations
ALTER TABLE organizations 
ADD CONSTRAINT check_contact_email_format 
CHECK (
  contact_email IS NULL OR 
  contact_email = '' OR 
  (contact_email ~ '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$' AND contact_email = lower(trim(contact_email)))
);

-- Contact phone format constraint for organizations
ALTER TABLE organizations 
ADD CONSTRAINT check_contact_phone_format 
CHECK (
  contact_phone IS NULL OR 
  contact_phone = '' OR 
  contact_phone ~ '^\(\d{3}\) \d{3}-\d{4}$'
);

-- Partner locations contact email format
ALTER TABLE partner_locations 
ADD CONSTRAINT check_partner_contact_email_format 
CHECK (
  contact_email IS NULL OR 
  contact_email = '' OR 
  (contact_email ~ '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$' AND contact_email = lower(trim(contact_email)))
);

-- Partner locations contact phone format
ALTER TABLE partner_locations 
ADD CONSTRAINT check_partner_contact_phone_format 
CHECK (
  contact_phone IS NULL OR 
  contact_phone = '' OR 
  contact_phone ~ '^\(\d{3}\) \d{3}-\d{4}$'
);

-- Add comments explaining the constraints
COMMENT ON CONSTRAINT check_phone_format ON profiles IS 
'Ensures phone numbers are in (555) 123-4567 format or empty/null';

COMMENT ON CONSTRAINT check_email_format ON profiles IS 
'Ensures email addresses are lowercase, trimmed, and valid format or empty/null';

COMMENT ON CONSTRAINT check_contact_email_format ON organizations IS 
'Ensures organization contact emails are lowercase, trimmed, and valid format or empty/null';

COMMENT ON CONSTRAINT check_contact_phone_format ON organizations IS 
'Ensures organization contact phones are in (555) 123-4567 format or empty/null';

COMMENT ON CONSTRAINT check_partner_contact_email_format ON partner_locations IS 
'Ensures partner location contact emails are lowercase, trimmed, and valid format or empty/null';

COMMENT ON CONSTRAINT check_partner_contact_phone_format ON partner_locations IS 
'Ensures partner location contact phones are in (555) 123-4567 format or empty/null';