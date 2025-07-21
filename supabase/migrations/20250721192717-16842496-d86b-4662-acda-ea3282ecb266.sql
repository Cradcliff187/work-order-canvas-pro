
-- Update work_order_created email template with AKC branding
UPDATE email_templates 
SET 
  html_content = '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Work Order Created</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
        }
        .header {
            background-color: #1e40af;
            color: white;
            padding: 20px;
            text-align: center;
        }
        .logo {
            margin-bottom: 10px;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: bold;
        }
        .content {
            padding: 30px 20px;
        }
        .work-order-box {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .work-order-number {
            font-size: 18px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 10px;
        }
        .detail-row {
            margin: 8px 0;
            display: flex;
            flex-wrap: wrap;
        }
        .detail-label {
            font-weight: bold;
            color: #374151;
            min-width: 120px;
        }
        .detail-value {
            color: #6b7280;
        }
        .cta-button {
            display: inline-block;
            background-color: #1e40af;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
            margin: 20px 0;
        }
        .footer {
            background-color: #f8fafc;
            padding: 20px;
            text-align: center;
            color: #6b7280;
            font-size: 14px;
            border-top: 1px solid #e2e8f0;
        }
        .footer a {
            color: #1e40af;
            text-decoration: none;
        }
        @media only screen and (max-width: 600px) {
            .container {
                width: 100% !important;
            }
            .content {
                padding: 20px 15px;
            }
            .detail-row {
                flex-direction: column;
            }
            .detail-label {
                min-width: auto;
                margin-bottom: 2px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">
                <img src="{{logo_url}}" height="60" alt="{{company_name}} Logo">
            </div>
            <h1>{{company_name}} Work Order Portal</h1>
        </div>
        
        <div class="content">
            <h2 style="color: #1e40af; margin-top: 0;">New Work Order Created</h2>
            
            <p>Hello,</p>
            
            <p>A new work order has been created and requires your attention. Please review the details below:</p>
            
            <div class="work-order-box">
                <div class="work-order-number">Work Order: {{work_order_number}}</div>
                
                <div class="detail-row">
                    <span class="detail-label">Organization:</span>
                    <span class="detail-value">{{organization_name}}</span>
                </div>
                
                <div class="detail-row">
                    <span class="detail-label">Location:</span>
                    <span class="detail-value">{{store_location}}</span>
                </div>
                
                <div class="detail-row">
                    <span class="detail-label">Address:</span>
                    <span class="detail-value">{{street_address}}, {{city}}, {{state}} {{zip_code}}</span>
                </div>
                
                <div class="detail-row">
                    <span class="detail-label">Trade:</span>
                    <span class="detail-value">{{trade_name}}</span>
                </div>
                
                <div class="detail-row">
                    <span class="detail-label">Title:</span>
                    <span class="detail-value">{{title}}</span>
                </div>
                
                <div class="detail-row">
                    <span class="detail-label">Description:</span>
                    <span class="detail-value">{{description}}</span>
                </div>
                
                <div class="detail-row">
                    <span class="detail-label">Status:</span>
                    <span class="detail-value">{{status}}</span>
                </div>
                
                <div class="detail-row">
                    <span class="detail-label">Date Submitted:</span>
                    <span class="detail-value">{{date_submitted}}</span>
                </div>
                
                <div class="detail-row">
                    <span class="detail-label">Created By:</span>
                    <span class="detail-value">{{created_by_name}}</span>
                </div>
            </div>
            
            <p>Please log in to the WorkOrderPortal to review and manage this work order:</p>
            
            <div style="text-align: center;">
                <a href="{{portal_url}}" class="cta-button">View Work Order</a>
            </div>
            
            <p>If you have any questions or need assistance, please contact our support team at <a href="mailto:{{support_email}}">{{support_email}}</a>.</p>
            
            <p>Thank you,<br>{{company_name}} Team</p>
        </div>
        
        <div class="footer">
            <p>{{powered_by}}</p>
            <p>For support, contact us at <a href="mailto:{{support_email}}">{{support_email}}</a></p>
        </div>
    </div>
</body>
</html>',
  updated_at = now()
WHERE template_name = 'work_order_created';
