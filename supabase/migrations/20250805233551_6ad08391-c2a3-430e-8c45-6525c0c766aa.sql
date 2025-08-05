-- Fix company name consistency in email templates
UPDATE email_templates 
SET 
  html_content = REPLACE(html_content, 'AKC Construction Services', 'AKC Contracting'),
  text_content = REPLACE(text_content, 'AKC Construction Services', 'AKC Contracting')
WHERE html_content LIKE '%AKC Construction Services%' 
   OR text_content LIKE '%AKC Construction Services%';