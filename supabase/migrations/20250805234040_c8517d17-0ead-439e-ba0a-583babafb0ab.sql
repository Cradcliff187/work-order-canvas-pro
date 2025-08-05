-- Update email templates to use white logo for better contrast on blue backgrounds
UPDATE email_templates 
SET html_content = REPLACE(html_content, 'AKC_logo_fixed_header.png', 'AKC_logo_white_header.png')
WHERE html_content LIKE '%AKC_logo_fixed_header.png%';