-- Clear existing email templates that conflict with seed data
DELETE FROM email_templates 
WHERE template_name IN (
  'work_order_created',
  'work_order_assigned', 
  'work_order_completed',
  'report_submitted',
  'report_reviewed'
);