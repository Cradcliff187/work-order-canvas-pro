-- Insert default email templates
INSERT INTO public.email_templates (template_name, subject, html_content, is_active) VALUES
('work_order_received', 'New Work Order #{{workOrderNumber}} Received', 
'<h1>New Work Order Received</h1>
<p>A new work order has been submitted and is ready for assignment.</p>
<h3>Work Order Details:</h3>
<ul>
<li><strong>Work Order #:</strong> {{workOrderNumber}}</li>
<li><strong>Organization:</strong> {{organizationName}}</li>
<li><strong>Store Location:</strong> {{storeLocation}}</li>
<li><strong>Trade:</strong> {{tradeName}}</li>
<li><strong>Submitted:</strong> {{submittedDate}}</li>
</ul>
<h3>Description:</h3>
<p>{{description}}</p>
<a href="{{adminDashboardUrl}}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View & Assign Work Order</a>', 
true),

('work_order_assigned', 'Work Order #{{workOrderNumber}} Assigned to You', 
'<h1>Work Order Assignment</h1>
<p>Hello {{subcontractorName}},</p>
<p>You have been assigned a new work order. Please review the details below and begin work as soon as possible.</p>
<h3>Work Order Details:</h3>
<ul>
<li><strong>Work Order #:</strong> {{workOrderNumber}}</li>
<li><strong>Organization:</strong> {{organizationName}}</li>
<li><strong>Store Location:</strong> {{storeLocation}}</li>
<li><strong>Trade:</strong> {{tradeName}}</li>
</ul>
<h3>Work Location:</h3>
<p>{{streetAddress}}<br>{{city}}, {{state}} {{zipCode}}</p>
<h3>Description:</h3>
<p>{{description}}</p>
<a href="{{workOrderUrl}}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Work Order Details</a>', 
true),

('report_submitted', 'Work Report Submitted for #{{workOrderNumber}}', 
'<h1>Work Report Submitted</h1>
<p>A work completion report has been submitted and is ready for review.</p>
<h3>Work Order Details:</h3>
<ul>
<li><strong>Work Order #:</strong> {{workOrderNumber}}</li>
<li><strong>Subcontractor:</strong> {{subcontractorName}}</li>
<li><strong>Organization:</strong> {{organizationName}}</li>
<li><strong>Invoice Amount:</strong> ${{invoiceAmount}}</li>
</ul>
<a href="{{reviewUrl}}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Review & Approve Report</a>', 
true),

('report_reviewed', 'Your Work Report for #{{workOrderNumber}} has been {{status}}', 
'<h1>Work Report {{status}}</h1>
<p>Hello {{subcontractorName}},</p>
<p>Your work completion report for work order #{{workOrderNumber}} has been reviewed and {{status}}.</p>
<h3>Review Notes:</h3>
<p>{{reviewNotes}}</p>
<a href="{{reportUrl}}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Report Details</a>', 
true),

('work_order_completed', 'Work Order #{{workOrderNumber}} Completed', 
'<h1>Work Order Completed</h1>
<p>Great news! Work order #{{workOrderNumber}} has been completed successfully.</p>
<h3>Work Order Details:</h3>
<ul>
<li><strong>Work Order #:</strong> {{workOrderNumber}}</li>
<li><strong>Organization:</strong> {{organizationName}}</li>
<li><strong>Completed By:</strong> {{subcontractorName}}</li>
<li><strong>Final Invoice Amount:</strong> ${{invoiceAmount}}</li>
</ul>
<a href="{{workOrderUrl}}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Complete Work Order</a>', 
true);