-- Update work_order_created template with world-class design and correct variables
UPDATE email_templates 
SET 
  subject = 'New Work Order {{work_order_number}} - Action Required',
  html_content = '<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="x-apple-disable-message-reformatting">
    <title>New Work Order {{work_order_number}} - Action Required</title>
    
    <style>
        /* Reset styles */
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        table { border-collapse: collapse !important; }
        body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }
        
        /* Mobile styles */
        @media screen and (max-width: 600px) {
            .mobile-hide { display: none !important; }
            .mobile-center { text-align: center !important; }
            .mobile-padding { padding: 20px 10px !important; }
            .responsive-table { width: 100% !important; }
            .mobile-button { width: 100% !important; }
        }
    </style>
</head>

<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f5f7fa; line-height: 1.6;">
    
    <!-- Email Container -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f5f7fa;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                
                <!-- Main Content Container -->
                <table class="responsive-table" border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07); overflow: hidden;">
                    
                    <!-- Header Section -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #0080FF 0%, #0066CC 100%); padding: 30px 40px; text-align: center;">
                            <img src="{{site_url}}/branding/logos/AKC_logo_fixed_header.png" alt="AKC Construction" width="120" height="40" style="display: block; margin: 0 auto 15px; max-width: 120px; height: auto;">
                            <p style="margin: 0; color: #ffffff; font-size: 14px; font-weight: 300; letter-spacing: 0.5px; opacity: 0.9;">
                                Work Order Portal
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Alert Banner -->
                    <tr>
                        <td style="background-color: #FFF4E5; border-bottom: 3px solid #FF9800; padding: 16px 40px;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td width="40" valign="middle">
                                        <div style="width: 32px; height: 32px; background-color: #FF9800; border-radius: 50%; text-align: center; line-height: 32px;">
                                            <span style="color: #ffffff; font-size: 16px; font-weight: bold;">!</span>
                                        </div>
                                    </td>
                                    <td valign="middle" style="padding-left: 12px;">
                                        <p style="margin: 0; color: #F57C00; font-size: 16px; font-weight: 600;">
                                            Action Required: New Work Order
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Main Content -->
                    <tr>
                        <td class="mobile-padding" style="padding: 40px;">
                            
                            <h1 style="margin: 0 0 20px; color: #1a1a1a; font-size: 28px; font-weight: 600; line-height: 1.2;">
                                New Work Order Received
                            </h1>
                            
                            <p style="margin: 0 0 30px; color: #4a5568; font-size: 16px; line-height: 1.6;">
                                A new work order has been submitted and requires immediate attention for assignment.
                            </p>
                            
                            <!-- Work Order Details Card -->
                            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin-bottom: 30px;">
                                
                                <!-- Work Order Number -->
                                <div style="text-align: center; margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid #e2e8f0;">
                                    <p style="margin: 0 0 8px; color: #718096; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
                                        WORK ORDER NUMBER
                                    </p>
                                    <p style="margin: 0; color: #0080FF; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                                        {{work_order_number}}
                                    </p>
                                </div>
                                
                                <!-- Details Grid -->
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td width="50%" style="padding-right: 15px;">
                                            <p style="margin: 0 0 4px; color: #718096; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Organization</p>
                                            <p style="margin: 0 0 16px; color: #1a1a1a; font-size: 16px; font-weight: 600;">{{organization_name}}</p>
                                        </td>
                                        <td width="50%" style="padding-left: 15px;">
                                            <p style="margin: 0 0 4px; color: #718096; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Store Location</p>
                                            <p style="margin: 0 0 16px; color: #1a1a1a; font-size: 16px; font-weight: 600;">{{store_location}}</p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td width="50%" style="padding-right: 15px;">
                                            <p style="margin: 0 0 4px; color: #718096; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Trade Required</p>
                                            <p style="margin: 0 0 16px; color: #1a1a1a; font-size: 16px; font-weight: 600;">{{trade_name}}</p>
                                        </td>
                                        <td width="50%" style="padding-left: 15px;">
                                            <p style="margin: 0 0 4px; color: #718096; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Date Submitted</p>
                                            <p style="margin: 0 0 16px; color: #1a1a1a; font-size: 16px; font-weight: 600;">{{date_submitted}}</p>
                                        </td>
                                    </tr>
                                </table>
                                
                                <!-- Status Badge -->
                                <div style="text-align: center; margin-top: 20px;">
                                    <span style="display: inline-block; background-color: #FFF4E5; color: #F57C00; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 600;">
                                        ⏱️ AWAITING ASSIGNMENT
                                    </span>
                                </div>
                            </div>
                            
                            <!-- Work Description -->
                            <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin-bottom: 30px;">
                                <h3 style="margin: 0 0 12px; color: #1a1a1a; font-size: 16px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Work Description</h3>
                                <p style="margin: 0; color: #4a5568; font-size: 15px; line-height: 1.6;">{{description}}</p>
                            </div>
                            
                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 0 0 30px;">
                                        <a href="{{admin_dashboard_url}}/work-orders/{{work_order_id}}" class="mobile-button" style="display: inline-block; background: linear-gradient(135deg, #0080FF 0%, #0066CC 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; letter-spacing: 0.5px; box-shadow: 0 4px 6px rgba(0, 128, 255, 0.2);">
                                            View & Assign Work Order →
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8fafc; padding: 30px 40px; border-top: 1px solid #e2e8f0;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <p style="margin: 0 0 8px; color: #718096; font-size: 14px;">Need assistance? Contact support:</p>
                                        <p style="margin: 0; font-size: 14px;">
                                            <a href="mailto:{{support_email}}" style="color: #0080FF; text-decoration: none; font-weight: 600;">{{support_email}}</a>
                                        </p>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding: 20px 0; border-top: 1px solid #e2e8f0;">
                                        <p style="margin: 0; color: #a0aec0; font-size: 12px;">
                                            © 2024 {{company_name}}. All rights reserved.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                </table>
                
            </td>
        </tr>
    </table>
    
</body>
</html>',
  updated_at = NOW()
WHERE template_name = 'work_order_created';

-- Update work_order_assigned template
UPDATE email_templates 
SET 
  subject = 'Work Order {{work_order_number}} Assigned to You',
  html_content = '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Work Order {{work_order_number}} Assigned</title>
    <style>
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        table { border-collapse: collapse !important; }
        body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }
        @media screen and (max-width: 600px) {
            .responsive-table { width: 100% !important; }
            .mobile-padding { padding: 20px 10px !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; background-color: #f5f7fa;">
    
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f5f7fa;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table class="responsive-table" border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 30px 40px; text-align: center;">
                            <img src="{{site_url}}/branding/logos/AKC_logo_fixed_header.png" alt="AKC Construction" width="120" height="40" style="display: block; margin: 0 auto 15px;">
                            <p style="margin: 0; color: #ffffff; font-size: 14px; font-weight: 300; opacity: 0.9;">Work Order Portal</p>
                        </td>
                    </tr>
                    
                    <!-- Success Banner -->
                    <tr>
                        <td style="background-color: #ECFDF5; border-bottom: 3px solid #10B981; padding: 16px 40px;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td width="40" valign="middle">
                                        <div style="width: 32px; height: 32px; background-color: #10B981; border-radius: 50%; text-align: center; line-height: 32px;">
                                            <span style="color: #ffffff; font-size: 16px;">✓</span>
                                        </div>
                                    </td>
                                    <td valign="middle" style="padding-left: 12px;">
                                        <p style="margin: 0; color: #047857; font-size: 16px; font-weight: 600;">Work Order Assigned to You</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Main Content -->
                    <tr>
                        <td class="mobile-padding" style="padding: 40px;">
                            <h1 style="margin: 0 0 20px; color: #1a1a1a; font-size: 28px; font-weight: 600;">Hello {{assignee_name}},</h1>
                            <p style="margin: 0 0 30px; color: #4a5568; font-size: 16px; line-height: 1.6;">
                                You have been assigned a new work order. Please review the details below and begin work as scheduled.
                            </p>
                            
                            <!-- Work Order Card -->
                            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin-bottom: 30px;">
                                <div style="text-align: center; margin-bottom: 20px;">
                                    <p style="margin: 0 0 8px; color: #718096; font-size: 12px; text-transform: uppercase;">WORK ORDER</p>
                                    <p style="margin: 0; color: #10B981; font-size: 24px; font-weight: 700;">{{work_order_number}}</p>
                                </div>
                                
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td width="50%" style="padding-right: 15px;">
                                            <p style="margin: 0 0 4px; color: #718096; font-size: 12px; text-transform: uppercase;">Organization</p>
                                            <p style="margin: 0 0 16px; color: #1a1a1a; font-size: 14px; font-weight: 600;">{{organization_name}}</p>
                                        </td>
                                        <td width="50%" style="padding-left: 15px;">
                                            <p style="margin: 0 0 4px; color: #718096; font-size: 12px; text-transform: uppercase;">Location</p>
                                            <p style="margin: 0 0 16px; color: #1a1a1a; font-size: 14px; font-weight: 600;">{{store_location}}</p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td width="50%" style="padding-right: 15px;">
                                            <p style="margin: 0 0 4px; color: #718096; font-size: 12px; text-transform: uppercase;">Trade</p>
                                            <p style="margin: 0 0 16px; color: #1a1a1a; font-size: 14px; font-weight: 600;">{{trade_name}}</p>
                                        </td>
                                        <td width="50%" style="padding-left: 15px;">
                                            <p style="margin: 0 0 4px; color: #718096; font-size: 12px; text-transform: uppercase;">Due Date</p>
                                            <p style="margin: 0 0 16px; color: #1a1a1a; font-size: 14px; font-weight: 600;">{{estimated_completion_date}}</p>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                            
                            <!-- Description -->
                            <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                                <h3 style="margin: 0 0 12px; color: #1a1a1a; font-size: 14px; font-weight: 600; text-transform: uppercase;">Description</h3>
                                <p style="margin: 0; color: #4a5568; font-size: 14px; line-height: 1.6;">{{description}}</p>
                            </div>
                            
                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <a href="{{dashboard_url}}/work-orders/{{work_order_id}}" style="display: inline-block; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                                            View Work Order Details
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8fafc; padding: 20px 40px; border-top: 1px solid #e2e8f0; text-align: center;">
                            <p style="margin: 0 0 8px; color: #718096; font-size: 12px;">Questions? Contact: <a href="mailto:{{support_email}}" style="color: #10B981;">{{support_email}}</a></p>
                            <p style="margin: 0; color: #a0aec0; font-size: 12px;">© 2024 {{company_name}}. All rights reserved.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>',
  updated_at = NOW()
WHERE template_name = 'work_order_assigned';

-- Update work_order_completed template
UPDATE email_templates 
SET 
  subject = 'Work Order {{work_order_number}} Completed',
  html_content = '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Work Order {{work_order_number}} Completed</title>
    <style>
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        table { border-collapse: collapse !important; }
        body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }
        @media screen and (max-width: 600px) {
            .responsive-table { width: 100% !important; }
            .mobile-padding { padding: 20px 10px !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; background-color: #f5f7fa;">
    
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f5f7fa;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table class="responsive-table" border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px 40px; text-align: center;">
                            <img src="{{site_url}}/branding/logos/AKC_logo_fixed_header.png" alt="AKC Construction" width="120" height="40" style="display: block; margin: 0 auto 15px;">
                            <p style="margin: 0; color: #ffffff; font-size: 14px; font-weight: 300; opacity: 0.9;">Work Order Portal</p>
                        </td>
                    </tr>
                    
                    <!-- Completion Banner -->
                    <tr>
                        <td style="background-color: #ECFDF5; border-bottom: 3px solid #059669; padding: 16px 40px;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td width="40" valign="middle">
                                        <div style="width: 32px; height: 32px; background-color: #059669; border-radius: 50%; text-align: center; line-height: 32px;">
                                            <span style="color: #ffffff; font-size: 16px;">✓</span>
                                        </div>
                                    </td>
                                    <td valign="middle" style="padding-left: 12px;">
                                        <p style="margin: 0; color: #047857; font-size: 16px; font-weight: 600;">Work Order Completed</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Main Content -->
                    <tr>
                        <td class="mobile-padding" style="padding: 40px;">
                            <h1 style="margin: 0 0 20px; color: #1a1a1a; font-size: 28px; font-weight: 600;">Work Order Completed</h1>
                            <p style="margin: 0 0 30px; color: #4a5568; font-size: 16px; line-height: 1.6;">
                                Great news! Work order {{work_order_number}} has been successfully completed. Here are the details:
                            </p>
                            
                            <!-- Work Order Summary -->
                            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin-bottom: 30px;">
                                <div style="text-align: center; margin-bottom: 20px;">
                                    <p style="margin: 0 0 8px; color: #718096; font-size: 12px; text-transform: uppercase;">COMPLETED WORK ORDER</p>
                                    <p style="margin: 0; color: #059669; font-size: 24px; font-weight: 700;">{{work_order_number}}</p>
                                </div>
                                
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td width="50%" style="padding-right: 15px;">
                                            <p style="margin: 0 0 4px; color: #718096; font-size: 12px; text-transform: uppercase;">Organization</p>
                                            <p style="margin: 0 0 16px; color: #1a1a1a; font-size: 14px; font-weight: 600;">{{organization_name}}</p>
                                        </td>
                                        <td width="50%" style="padding-left: 15px;">
                                            <p style="margin: 0 0 4px; color: #718096; font-size: 12px; text-transform: uppercase;">Location</p>
                                            <p style="margin: 0 0 16px; color: #1a1a1a; font-size: 14px; font-weight: 600;">{{store_location}}</p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td width="50%" style="padding-right: 15px;">
                                            <p style="margin: 0 0 4px; color: #718096; font-size: 12px; text-transform: uppercase;">Completed By</p>
                                            <p style="margin: 0 0 16px; color: #1a1a1a; font-size: 14px; font-weight: 600;">{{completed_by_name}}</p>
                                        </td>
                                        <td width="50%" style="padding-left: 15px;">
                                            <p style="margin: 0 0 4px; color: #718096; font-size: 12px; text-transform: uppercase;">Completion Date</p>
                                            <p style="margin: 0 0 16px; color: #1a1a1a; font-size: 14px; font-weight: 600;">{{date_completed}}</p>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                            
                            <!-- Work Performed -->
                            <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                                <h3 style="margin: 0 0 12px; color: #1a1a1a; font-size: 14px; font-weight: 600; text-transform: uppercase;">Work Performed</h3>
                                <p style="margin: 0; color: #4a5568; font-size: 14px; line-height: 1.6;">{{work_performed}}</p>
                            </div>
                            
                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <a href="{{dashboard_url}}/work-orders/{{work_order_id}}" style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                                            View Complete Details
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8fafc; padding: 20px 40px; border-top: 1px solid #e2e8f0; text-align: center;">
                            <p style="margin: 0 0 8px; color: #718096; font-size: 12px;">Questions? Contact: <a href="mailto:{{support_email}}" style="color: #059669;">{{support_email}}</a></p>
                            <p style="margin: 0; color: #a0aec0; font-size: 12px;">© 2024 {{company_name}}. All rights reserved.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>',
  updated_at = NOW()
WHERE template_name = 'work_order_completed';