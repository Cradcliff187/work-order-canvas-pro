-- Emergency Fix 5/5: Correct Company Naming to WorkOrderPortal
-- Update database entries to use correct WorkOrderPortal branding

-- 1. Update internal organization name to WorkOrderPortal Internal
UPDATE organizations 
SET 
  name = 'WorkOrderPortal Internal',
  contact_email = 'admin@workorderportal.com',
  initials = 'WOP'
WHERE organization_type = 'internal' 
AND name = 'AKC Contracting';

-- 2. Update email templates that reference incorrect naming
UPDATE email_templates 
SET 
  html_content = REPLACE(html_content, 'WorkOrderPro', 'WorkOrderPortal'),
  subject = REPLACE(subject, 'WorkOrderPro', 'WorkOrderPortal'),
  text_content = REPLACE(text_content, 'WorkOrderPro', 'WorkOrderPortal')
WHERE 
  html_content ILIKE '%workorderpro%' 
  OR subject ILIKE '%workorderpro%' 
  OR text_content ILIKE '%workorderpro%';

-- 3. Update any system settings that reference incorrect naming
UPDATE system_settings 
SET setting_value = jsonb_set(
  setting_value,
  '{company_name}',
  '"WorkOrderPortal"'
)
WHERE setting_value::text ILIKE '%workorderpro%';

-- 4. Create system setting for correct branding if not exists
INSERT INTO system_settings (category, setting_key, setting_value, description, updated_by_user_id)
VALUES (
  'branding',
  'company_name',
  '"WorkOrderPortal"',
  'Official company name for branding consistency',
  (SELECT id FROM profiles WHERE email = 'cradcliff@austinkunzconstruction.com' LIMIT 1)
) ON CONFLICT (category, setting_key) 
DO UPDATE SET setting_value = EXCLUDED.setting_value;