
-- Update email templates with professional AKC WorkOrderPortal branding

-- 1. Update work_order_created template
UPDATE email_templates 
SET 
  subject = 'New Work Order {{work_order_number}} - {{organization_name}}',
  html_content = '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Work Order Created</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
    <div style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="background-color: #0485EA; color: white; padding: 30px 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">AKC WorkOrderPortal</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Professional Work Order Management</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px 20px;">
            <h2 style="color: #0485EA; margin-top: 0; font-size: 24px;">New Work Order Received</h2>
            
            <p style="font-size: 16px; margin-bottom: 20px;">A new work order has been submitted and requires immediate attention for assignment.</p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; border-left: 4px solid #0485EA; margin: 20px 0;">
                <h3 style="color: #333; margin-top: 0; font-size: 18px;">Work Order Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold; color: #555;">Work Order #:</td>
                        <td style="padding: 8px 0;">{{work_order_number}}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold; color: #555;">Organization:</td>
                        <td style="padding: 8px 0;">{{organization_name}}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold; color: #555;">Store Location:</td>
                        <td style="padding: 8px 0;">{{store_location}}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold; color: #555;">Trade:</td>
                        <td style="padding: 8px 0;">{{trade_name}}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold; color: #555;">Submitted:</td>
                        <td style="padding: 8px 0;">{{date_submitted}}</td>
                    </tr>
                </table>
            </div>
            
            <div style="background-color: #fff; padding: 15px; border: 1px solid #e9ecef; border-radius: 6px; margin: 20px 0;">
                <h4 style="margin-top: 0; color: #333;">Work Description:</h4>
                <p style="margin-bottom: 0; line-height: 1.5;">{{description}}</p>
            </div>
            
            <!-- Action Button -->
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{admin_dashboard_url}}" style="background-color: #0485EA; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 2px 4px rgba(4,133,234,0.3);">View & Assign Work Order</a>
            </div>
            
            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <p style="margin: 0; font-weight: bold;">⚠️ Action Required:</p>
                <p style="margin: 5px 0 0 0;">This work order needs to be assigned to ensure timely completion.</p>
            </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
            <p style="margin: 0; font-size: 14px; color: #666;">For support, contact us at <a href="mailto:support@workorderportal.com" style="color: #0485EA;">support@workorderportal.com</a></p>
            <p style="margin: 10px 0 0 0; font-size: 12px; color: #999;">© 2024 AKC WorkOrderPortal. All rights reserved.</p>
        </div>
    </div>
</body>
</html>',
  text_content = 'New Work Order Received - AKC WorkOrderPortal

Work Order: {{work_order_number}}
Organization: {{organization_name}}
Store Location: {{store_location}}
Trade: {{trade_name}}
Submitted: {{date_submitted}}

Description: {{description}}

Action Required: This work order needs to be assigned.

View details: {{admin_dashboard_url}}

For support, contact us at support@workorderportal.com
© 2024 AKC WorkOrderPortal'
WHERE template_name = 'work_order_created';

-- 2. Update work_order_assigned template
UPDATE email_templates 
SET 
  subject = 'Work Order {{work_order_number}} Assigned to You',
  html_content = '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Work Order Assignment</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
    <div style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="background-color: #0485EA; color: white; padding: 30px 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">AKC WorkOrderPortal</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Professional Work Order Management</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px 20px;">
            <h2 style="color: #0485EA; margin-top: 0; font-size: 24px;">Work Order Assignment</h2>
            
            <p style="font-size: 16px; margin-bottom: 20px;">Hello {{subcontractor_name}},</p>
            <p style="font-size: 16px; margin-bottom: 20px;">You have been assigned a new work order. Please review the details below and begin work as soon as possible.</p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; border-left: 4px solid #0485EA; margin: 20px 0;">
                <h3 style="color: #333; margin-top: 0; font-size: 18px;">Assignment Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold; color: #555;">Work Order #:</td>
                        <td style="padding: 8px 0;">{{work_order_number}}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold; color: #555;">Organization:</td>
                        <td style="padding: 8px 0;">{{organization_name}}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold; color: #555;">Store Location:</td>
                        <td style="padding: 8px 0;">{{store_location}}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold; color: #555;">Trade:</td>
                        <td style="padding: 8px 0;">{{trade_name}}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold; color: #555;">Due Date:</td>
                        <td style="padding: 8px 0;">{{estimated_completion_date}}</td>
                    </tr>
                </table>
            </div>
            
            <div style="background-color: #fff; padding: 15px; border: 1px solid #e9ecef; border-radius: 6px; margin: 20px 0;">
                <h4 style="margin-top: 0; color: #333;">Work Location:</h4>
                <p style="margin-bottom: 0;">{{street_address}}<br>{{city}}, {{state}} {{zip_code}}</p>
            </div>
            
            <div style="background-color: #fff; padding: 15px; border: 1px solid #e9ecef; border-radius: 6px; margin: 20px 0;">
                <h4 style="margin-top: 0; color: #333;">Work Description:</h4>
                <p style="margin-bottom: 0; line-height: 1.5;">{{description}}</p>
            </div>
            
            <!-- Action Button -->
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{work_order_url}}" style="background-color: #0485EA; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 2px 4px rgba(4,133,234,0.3);">View Work Order Details</a>
            </div>
            
            <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <p style="margin: 0; font-weight: bold;">📋 Next Steps:</p>
                <ul style="margin: 5px 0 0 20px; padding: 0;">
                    <li>Review the work order details thoroughly</li>
                    <li>Contact the site if you need additional information</li>
                    <li>Complete the work as described</li>
                    <li>Submit your completion report with photos and invoice details</li>
                </ul>
            </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
            <p style="margin: 0; font-size: 14px; color: #666;">For support, contact us at <a href="mailto:support@workorderportal.com" style="color: #0485EA;">support@workorderportal.com</a></p>
            <p style="margin: 10px 0 0 0; font-size: 12px; color: #999;">© 2024 AKC WorkOrderPortal. All rights reserved.</p>
        </div>
    </div>
</body>
</html>',
  text_content = 'Work Order Assignment - AKC WorkOrderPortal

Hello {{subcontractor_name}},

You have been assigned work order {{work_order_number}}.

Assignment Details:
- Organization: {{organization_name}}
- Store Location: {{store_location}}
- Trade: {{trade_name}}
- Due Date: {{estimated_completion_date}}

Work Location:
{{street_address}}
{{city}}, {{state}} {{zip_code}}

Description: {{description}}

Next Steps:
1. Review the work order details thoroughly
2. Contact the site if needed
3. Complete the work as described
4. Submit completion report with photos

View details: {{work_order_url}}

For support, contact us at support@workorderportal.com
© 2024 AKC WorkOrderPortal'
WHERE template_name = 'work_order_assigned';

-- 3. Update work_order_completed template
UPDATE email_templates 
SET 
  subject = 'Work Order {{work_order_number}} Completed',
  html_content = '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Work Order Completed</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
    <div style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="background-color: #0485EA; color: white; padding: 30px 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">AKC WorkOrderPortal</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Professional Work Order Management</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px 20px;">
            <h2 style="color: #28a745; margin-top: 0; font-size: 24px;">✅ Work Order Completed</h2>
            
            <p style="font-size: 16px; margin-bottom: 20px;">Great news! Work order {{work_order_number}} has been completed successfully.</p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; border-left: 4px solid #28a745; margin: 20px 0;">
                <h3 style="color: #333; margin-top: 0; font-size: 18px;">Completion Summary</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold; color: #555;">Work Order #:</td>
                        <td style="padding: 8px 0;">{{work_order_number}}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold; color: #555;">Organization:</td>
                        <td style="padding: 8px 0;">{{organization_name}}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold; color: #555;">Store Location:</td>
                        <td style="padding: 8px 0;">{{store_location}}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold; color: #555;">Trade:</td>
                        <td style="padding: 8px 0;">{{trade_name}}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold; color: #555;">Completed By:</td>
                        <td style="padding: 8px 0;">{{subcontractor_name}}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold; color: #555;">Completion Date:</td>
                        <td style="padding: 8px 0;">{{completed_date}}</td>
                    </tr>
                </table>
            </div>
            
            <div style="background-color: #fff; padding: 15px; border: 1px solid #e9ecef; border-radius: 6px; margin: 20px 0;">
                <h4 style="margin-top: 0; color: #333;">Work Location:</h4>
                <p style="margin-bottom: 0;">{{street_address}}<br>{{city}}, {{state}} {{zip_code}}</p>
            </div>
            
            <div style="background-color: #fff; padding: 15px; border: 1px solid #e9ecef; border-radius: 6px; margin: 20px 0;">
                <h4 style="margin-top: 0; color: #333;">Work Summary:</h4>
                <p style="margin-bottom: 0; line-height: 1.5;">{{work_performed}}</p>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <h4 style="margin-top: 0; color: #333;">Final Invoice Amount:</h4>
                <p style="margin-bottom: 0; font-size: 20px; font-weight: bold; color: #0485EA;">${{invoice_amount}}</p>
            </div>
            
            <!-- Action Button -->
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{work_order_url}}" style="background-color: #0485EA; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 2px 4px rgba(4,133,234,0.3);">View Completion Report</a>
            </div>
            
            <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <p style="margin: 0; font-weight: bold;">📋 Next Steps:</p>
                <ul style="margin: 5px 0 0 20px; padding: 0;">
                    <li>Review the completed work documentation</li>
                    <li>Process payment according to your billing procedures</li>
                    <li>Archive the work order for future reference</li>
                </ul>
            </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
            <p style="margin: 0; font-size: 14px; color: #666;">For support, contact us at <a href="mailto:support@workorderportal.com" style="color: #0485EA;">support@workorderportal.com</a></p>
            <p style="margin: 10px 0 0 0; font-size: 12px; color: #999;">© 2024 AKC WorkOrderPortal. All rights reserved.</p>
        </div>
    </div>
</body>
</html>',
  text_content = 'Work Order Completed - AKC WorkOrderPortal

Work order {{work_order_number}} has been completed successfully.

Completion Summary:
- Organization: {{organization_name}}
- Store Location: {{store_location}}
- Trade: {{trade_name}}
- Completed By: {{subcontractor_name}}
- Completion Date: {{completed_date}}

Work Location:
{{street_address}}
{{city}}, {{state}} {{zip_code}}

Work Summary: {{work_performed}}
Final Invoice Amount: ${{invoice_amount}}

Next Steps:
1. Review completed work documentation
2. Process payment according to billing procedures
3. Archive work order for future reference

View details: {{work_order_url}}

For support, contact us at support@workorderportal.com
© 2024 AKC WorkOrderPortal'
WHERE template_name = 'work_order_completed';

-- 4. Update report_submitted template
UPDATE email_templates 
SET 
  subject = 'Report Submitted for {{work_order_number}}',
  html_content = '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Work Report Submitted</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
    <div style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="background-color: #0485EA; color: white; padding: 30px 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">AKC WorkOrderPortal</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Professional Work Order Management</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px 20px;">
            <h2 style="color: #0485EA; margin-top: 0; font-size: 24px;">Work Report Submitted</h2>
            
            <p style="font-size: 16px; margin-bottom: 20px;">A work completion report has been submitted and is ready for review and approval.</p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; border-left: 4px solid #0485EA; margin: 20px 0;">
                <h3 style="color: #333; margin-top: 0; font-size: 18px;">Report Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold; color: #555;">Work Order #:</td>
                        <td style="padding: 8px 0;">{{work_order_number}}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold; color: #555;">Subcontractor:</td>
                        <td style="padding: 8px 0;">{{subcontractor_name}}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold; color: #555;">Organization:</td>
                        <td style="padding: 8px 0;">{{organization_name}}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold; color: #555;">Store Location:</td>
                        <td style="padding: 8px 0;">{{store_location}}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold; color: #555;">Submitted:</td>
                        <td style="padding: 8px 0;">{{submitted_date}}</td>
                    </tr>
                </table>
            </div>
            
            <div style="background-color: #fff; padding: 15px; border: 1px solid #e9ecef; border-radius: 6px; margin: 20px 0;">
                <h4 style="margin-top: 0; color: #333;">Work Summary:</h4>
                <p style="margin-bottom: 0; line-height: 1.5;">{{work_performed}}</p>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <h4 style="margin-top: 0; color: #333;">Billing Information:</h4>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 4px 0; font-weight: bold; color: #555;">Hours Worked:</td>
                        <td style="padding: 4px 0;">{{hours_worked}}</td>
                    </tr>
                    <tr>
                        <td style="padding: 4px 0; font-weight: bold; color: #555;">Invoice Amount:</td>
                        <td style="padding: 4px 0; font-size: 18px; font-weight: bold; color: #0485EA;">${{invoice_amount}}</td>
                    </tr>
                </table>
            </div>
            
            <!-- Action Button -->
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{review_url}}" style="background-color: #0485EA; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 2px 4px rgba(4,133,234,0.3);">Review Report</a>
            </div>
            
            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <p style="margin: 0; font-weight: bold;">⚠️ Action Required:</p>
                <p style="margin: 5px 0 0 0;">Please review the submitted work report, including any attached photos and documentation. You can approve or request changes directly from the admin dashboard.</p>
            </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
            <p style="margin: 0; font-size: 14px; color: #666;">For support, contact us at <a href="mailto:support@workorderportal.com" style="color: #0485EA;">support@workorderportal.com</a></p>
            <p style="margin: 10px 0 0 0; font-size: 12px; color: #999;">© 2024 AKC WorkOrderPortal. All rights reserved.</p>
        </div>
    </div>
</body>
</html>',
  text_content = 'Work Report Submitted - AKC WorkOrderPortal

A work completion report has been submitted for review.

Report Details:
- Work Order: {{work_order_number}}
- Subcontractor: {{subcontractor_name}}
- Organization: {{organization_name}}
- Store Location: {{store_location}}
- Submitted: {{submitted_date}}

Work Summary: {{work_performed}}
Hours Worked: {{hours_worked}}
Invoice Amount: ${{invoice_amount}}

Action Required: Please review the submitted work report.

Review report: {{review_url}}

For support, contact us at support@workorderportal.com
© 2024 AKC WorkOrderPortal'
WHERE template_name = 'report_submitted';

-- 5. Update report_reviewed template
UPDATE email_templates 
SET 
  subject = 'Your Report for {{work_order_number}} has been {{status}}',
  html_content = '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Report Review Status</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
    <div style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="background-color: #0485EA; color: white; padding: 30px 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">AKC WorkOrderPortal</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Professional Work Order Management</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px 20px;">
            <h2 style="color: #0485EA; margin-top: 0; font-size: 24px;">Work Report {{status}}</h2>
            
            <p style="font-size: 16px; margin-bottom: 20px;">Hello {{subcontractor_name}},</p>
            <p style="font-size: 16px; margin-bottom: 20px;">Your work completion report for work order {{work_order_number}} has been reviewed and <strong>{{status}}</strong>.</p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; border-left: 4px solid #0485EA; margin: 20px 0;">
                <h3 style="color: #333; margin-top: 0; font-size: 18px;">Review Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold; color: #555;">Work Order #:</td>
                        <td style="padding: 8px 0;">{{work_order_number}}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold; color: #555;">Organization:</td>
                        <td style="padding: 8px 0;">{{organization_name}}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold; color: #555;">Store Location:</td>
                        <td style="padding: 8px 0;">{{store_location}}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold; color: #555;">Review Status:</td>
                        <td style="padding: 8px 0;">
                            <span style="text-transform: uppercase; font-weight: bold; color: {{#if approved}}#28a745{{else}}#dc3545{{/if}};">{{status}}</span>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold; color: #555;">Reviewed:</td>
                        <td style="padding: 8px 0;">{{reviewed_date}}</td>
                    </tr>
                </table>
            </div>
            
            <div style="background-color: #fff; padding: 15px; border: 1px solid #e9ecef; border-radius: 6px; margin: 20px 0;">
                <h4 style="margin-top: 0; color: #333;">Review Notes:</h4>
                <p style="margin-bottom: 0; line-height: 1.5;">{{review_notes}}</p>
            </div>
            
            <!-- Action Button -->
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{report_url}}" style="background-color: #0485EA; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 2px 4px rgba(4,133,234,0.3);">View Report Details</a>
            </div>
            
            <!-- Status-specific content -->
            <div style="background-color: {{#if approved}}#d4edda{{else}}#f8d7da{{/if}}; border: 1px solid {{#if approved}}#c3e6cb{{else}}#f5c6cb{{/if}}; color: {{#if approved}}#155724{{else}}#721c24{{/if}}; padding: 15px; border-radius: 6px; margin: 20px 0;">
                {{#if approved}}
                    <p style="margin: 0; font-weight: bold;">🎉 Congratulations!</p>
                    <p style="margin: 5px 0 0 0;">Your work has been approved. The work order is now marked as completed and you should expect payment processing to begin.</p>
                {{else}}
                    <p style="margin: 0; font-weight: bold;">⚠️ Action Required:</p>
                    <p style="margin: 5px 0 0 0;">Please review the feedback provided and make the necessary revisions to your report. You can update your report with additional information, photos, or corrections as needed.</p>
                {{/if}}
            </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
            <p style="margin: 0; font-size: 14px; color: #666;">For support, contact us at <a href="mailto:support@workorderportal.com" style="color: #0485EA;">support@workorderportal.com</a></p>
            <p style="margin: 10px 0 0 0; font-size: 12px; color: #999;">© 2024 AKC WorkOrderPortal. All rights reserved.</p>
        </div>
    </div>
</body>
</html>',
  text_content = 'Report Review Status - AKC WorkOrderPortal

Hello {{subcontractor_name}},

Your work report for {{work_order_number}} has been {{status}}.

Review Details:
- Work Order: {{work_order_number}}
- Organization: {{organization_name}}
- Store Location: {{store_location}}
- Status: {{status}}
- Reviewed: {{reviewed_date}}

Review Notes: {{review_notes}}

{{#if approved}}
Congratulations! Your work has been approved and payment processing will begin.
{{else}}
Action Required: Please review the feedback and make necessary revisions.
{{/if}}

View details: {{report_url}}

For support, contact us at support@workorderportal.com
© 2024 AKC WorkOrderPortal'
WHERE template_name = 'report_reviewed';

-- 6. Update welcome_email template
UPDATE email_templates 
SET 
  subject = 'Welcome to AKC WorkOrderPortal - Your Account is Ready',
  html_content = '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to AKC WorkOrderPortal</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
    <div style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="background-color: #0485EA; color: white; padding: 30px 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">AKC WorkOrderPortal</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Professional Work Order Management</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px 20px;">
            <h2 style="color: #0485EA; margin-top: 0; font-size: 24px;">Welcome to AKC WorkOrderPortal!</h2>
            
            <p style="font-size: 16px; margin-bottom: 20px;">Hello {{first_name}} {{last_name}},</p>
            <p style="font-size: 16px; margin-bottom: 20px;">Your AKC WorkOrderPortal account has been created successfully! You can now access the system with your credentials below.</p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; border-left: 4px solid #0485EA; margin: 20px 0;">
                <h3 style="color: #333; margin-top: 0; font-size: 18px;">Your Login Credentials</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold; color: #555;">Email:</td>
                        <td style="padding: 8px 0;">{{email}}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold; color: #555;">Temporary Password:</td>
                        <td style="padding: 8px 0; font-family: monospace; background-color: #fff; padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px;">{{temporary_password}}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold; color: #555;">Account Type:</td>
                        <td style="padding: 8px 0; text-transform: capitalize;">{{user_type}}</td>
                    </tr>
                </table>
            </div>
            
            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <p style="margin: 0; font-weight: bold;">🔒 Important Security Notice:</p>
                <p style="margin: 5px 0 0 0;">Please change your password after your first login for security purposes. You can do this from your profile settings.</p>
            </div>
            
            <!-- Action Button -->
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{site_url}}" style="background-color: #0485EA; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 2px 4px rgba(4,133,234,0.3);">Access Your Account</a>
            </div>
            
            <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <p style="margin: 0; font-weight: bold;">🚀 Getting Started:</p>
                <ul style="margin: 5px 0 0 20px; padding: 0;">
                    <li>Log in with your temporary credentials</li>
                    <li>Update your password and profile information</li>
                    <li>Explore your dashboard and available features</li>
                    <li>Contact support if you need assistance</li>
                </ul>
            </div>
            
            <p style="font-size: 16px; margin: 20px 0;">If you have any questions or need assistance getting started, our support team is here to help.</p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
            <p style="margin: 0; font-size: 14px; color: #666;">For support, contact us at <a href="mailto:support@workorderportal.com" style="color: #0485EA;">support@workorderportal.com</a></p>
            <p style="margin: 10px 0 0 0; font-size: 12px; color: #999;">© 2024 AKC WorkOrderPortal. All rights reserved.</p>
        </div>
    </div>
</body>
</html>',
  text_content = 'Welcome to AKC WorkOrderPortal!

Hello {{first_name}} {{last_name}},

Your AKC WorkOrderPortal account has been created successfully!

Your Login Credentials:
- Email: {{email}}
- Temporary Password: {{temporary_password}}
- Account Type: {{user_type}}

Important: Please change your password after your first login for security.

Getting Started:
1. Log in with your temporary credentials
2. Update your password and profile
3. Explore your dashboard and features
4. Contact support if needed

Access your account: {{site_url}}

For support, contact us at support@workorderportal.com
© 2024 AKC WorkOrderPortal'
WHERE template_name = 'welcome_email';
