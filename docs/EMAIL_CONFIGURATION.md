
# Email Configuration Guide

## Overview
WorkOrderPortal uses a professional email setup with IONOS SMTP integrated through Supabase Auth for all system communications.

## Email System Architecture

### Email Flow
1. **Application Event** → Triggers database function
2. **Database Function** → Calls Edge Function via pg_net
3. **Edge Function** → Uses Supabase Auth to send email
4. **Supabase Auth** → Sends via IONOS SMTP
5. **IONOS SMTP** → Delivers to recipient

### Email Provider Setup

#### IONOS Configuration
- **Account Type**: Mail Basic
- **Email Address**: support@workorderportal.com
- **SMTP Server**: smtp.ionos.com
- **Ports**: 587 (TLS/STARTTLS) or 465 (SSL)
- **Authentication**: Required (full email as username)

#### Supabase SMTP Integration
1. Navigate to: Supabase Dashboard → Authentication → SMTP Settings
2. Configuration:
   - **Enable custom SMTP**: ON
   - **Sender email**: support@workorderportal.com
   - **Sender name**: AKC-WorkOrderPortal
   - **Host**: smtp.ionos.com
   - **Port**: 587
   - **Username**: support@workorderportal.com
   - **Password**: [IONOS email password]

## Email Templates

### Authentication Emails (Supabase Dashboard)
Managed at: Dashboard → Authentication → Email Templates

1. **Confirm Signup** 
   - Triggered: New user registration
   - Subject: "Welcome to AKC WorkOrderPortal - Please Confirm Your Email"

2. **Reset Password**
   - Triggered: Password reset request
   - Subject: "Reset Your WorkOrderPortal Password"

3. **Magic Link**
   - Triggered: Passwordless login
   - Subject: "Your WorkOrderPortal Login Link"

4. **Invite User**
   - Triggered: Admin invites new user
   - Subject: "You're Invited to Join AKC WorkOrderPortal"

5. **Change Email**
   - Triggered: User changes email
   - Subject: "Confirm Your New WorkOrderPortal Email Address"

### Application Emails (Database)
Stored in `email_templates` table:

1. **work_order_created**
   - Triggered: New work order submission
   - Recipients: System administrators
   - Variables: {{work_order_number}}, {{organization_name}}, {{trade_name}}

2. **work_order_assigned**
   - Triggered: Work order assigned to subcontractor
   - Recipients: Assigned subcontractor
   - Variables: {{work_order_number}}, {{subcontractor_name}}, {{due_date}}

3. **work_order_completed**
   - Triggered: Work order marked complete
   - Recipients: Partner organization
   - Variables: {{work_order_number}}, {{completed_date}}, {{invoice_total}}

4. **report_submitted**
   - Triggered: Subcontractor submits report
   - Recipients: Administrators
   - Variables: {{work_order_number}}, {{submitted_by}}, {{invoice_amount}}

5. **report_reviewed**
   - Triggered: Admin reviews report
   - Recipients: Report submitter
   - Variables: {{status}}, {{review_notes}}, {{work_order_number}}

6. **welcome_email**
   - Triggered: New user created by admin
   - Recipients: New user
   - Variables: {{first_name}}, {{user_type}}, {{organization_name}}

## Email Triggers

### Database Triggers
Located in migrations, these triggers fire on data changes:

```sql
-- Example: Work order created trigger
CREATE TRIGGER trigger_work_order_created_email
  AFTER INSERT ON work_orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_work_order_created();
```

### Edge Functions
Called by database triggers via pg_net:

- `/functions/v1/email-work-order-created`
- `/functions/v1/email-work-order-assigned` 
- `/functions/v1/email-work-order-completed`
- `/functions/v1/email-report-submitted`
- `/functions/v1/email-report-reviewed`
- `/functions/v1/email-welcome`

## Email Rate Limits

### Supabase Configuration
- **Email sending**: 20 per hour
- **Token refresh**: 150 per 5 minutes
- **Configuration**: Supabase Dashboard → Authentication → Rate Limits

### IONOS Limits
- **Daily limit**: 1,000 emails (Mail Basic)
- **Attachment size**: 50MB total
- **Recipients per email**: 100

## Monitoring and Troubleshooting

### Application Monitoring
- **Email Logs**: `/admin/email-logs` in application
- **Test Panel**: `/admin/email-test` for function testing
- **Database logs**: `email_logs` table

### Supabase Monitoring
- **Auth Logs**: Dashboard → Logs → Auth
- **Function Logs**: Dashboard → Edge Functions → Logs
- **SMTP Status**: Dashboard → Settings → SMTP

### Common Issues

#### Email Delivery Problems
1. **Check spam folders**: IONOS emails may be filtered
2. **Verify SPF record**: `v=spf1 include:_spf-us.ionos.com -all`
3. **SMTP authentication**: Ensure password is correct
4. **Rate limits**: Check both Supabase and IONOS limits

#### Function Errors
1. **Check Edge Function logs**: Dashboard → Functions → [function-name] → Logs
2. **Database trigger errors**: Check `audit_logs` table
3. **Template variables**: Ensure all required variables are provided

### Testing Email System

#### Via Application
1. Navigate to `/admin/email-test`
2. Select email type to test
3. Provide required test data
4. Send test email
5. Check delivery and formatting

#### Via Supabase Dashboard
1. Go to Authentication → Users
2. Trigger auth emails (signup, reset, etc.)
3. Monitor in Auth logs
4. Verify SMTP delivery

## Security Considerations

### SMTP Credentials
- **Storage**: Secure in Supabase Dashboard (encrypted)
- **Access**: Limited to Supabase Auth service
- **Rotation**: Change IONOS password periodically

### Email Content
- **Template injection**: All variables are escaped
- **PII protection**: No sensitive data in subject lines
- **Audit trail**: All emails logged in `email_logs` table

### Rate Limiting
- **Abuse prevention**: Supabase rate limits protect against spam
- **Resource protection**: IONOS limits prevent service disruption
- **Monitoring**: Track usage via email logs

This email system provides reliable, professional email delivery for all WorkOrderPortal communications while maintaining security and monitoring capabilities.
