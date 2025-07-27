
# WorkOrderPortal Email System Documentation

## Email vs Messaging System

**⚠️ IMPORTANT DISTINCTION:**

WorkOrderPortal has **TWO COMPLETELY SEPARATE** communication systems:

### 🔄 **EMAIL SYSTEM** (This Document)
- **Purpose**: External notifications sent via Resend API
- **Usage**: Transactional emails (work order notifications, reports, authentication)
- **Recipients**: External email addresses (users' inboxes)
- **Technology**: Resend API + Edge Functions
- **Storage**: `email_templates`, `email_logs`, `email_queue` tables

### 💬 **MESSAGING SYSTEM** (See [MESSAGING_SYSTEM.md](./MESSAGING_SYSTEM.md))
- **Purpose**: In-app real-time chat between users
- **Usage**: Work order discussions, internal communication
- **Recipients**: Users within the application interface
- **Technology**: Supabase real-time subscriptions + React components
- **Storage**: `work_order_messages`, `message_read_receipts` tables

**These systems serve different purposes and operate independently. Do not confuse email notifications with in-app messaging.**

---

## Overview

WorkOrderPortal implements a unified email system using Resend API that handles ALL email communications, including both transactional notifications and authentication emails. This system bypasses Supabase's unreliable SMTP service to provide 100% reliable email delivery with complete control and monitoring.

## Architecture

### Why We Bypassed Supabase Auth Emails

**Problems with Supabase SMTP**:
- Unreliable delivery rates
- Limited customization options
- Poor monitoring and debugging capabilities
- Inconsistent email formatting
- No unified control over all email types

**Our Solution**:
- **Single Email Service**: All emails route through Resend API
- **Unified Management**: One Edge Function (`send-email`) handles all email types
- **Complete Control**: Full customization of email content, timing, and delivery
- **Comprehensive Monitoring**: Complete audit trail in database
- **Reliable Delivery**: Resend's enterprise-grade infrastructure

### Email Flow Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Application   │───▶│   send-email     │───▶│   Resend API    │
│   Triggers      │    │   Edge Function  │    │   (Delivery)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
        │                        │                        │
        ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Database       │    │  email_templates │    │   email_logs    │
│  Triggers       │    │  (9 templates)   │    │   (Tracking)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

**Flow Process**:
1. **Trigger**: Database trigger or manual function call
2. **Processing**: `send-email` Edge Function processes request
3. **Template**: Retrieves template from `email_templates` table
4. **Variables**: Merges dynamic data with template
5. **Delivery**: Sends via Resend API
6. **Logging**: Records result in `email_logs` table

## Email Queue Architecture

As of January 2025, WorkOrderPortal has implemented a sophisticated queue-based email system with automated processing for enhanced reliability and performance. This architecture provides asynchronous email processing with automatic retry capabilities and comprehensive monitoring.

### Automated Processing System

**pg_cron Schedule**: Email queue is automatically processed every 5 minutes using PostgreSQL's cron extension:
```sql
-- Automated processing schedule
SELECT cron.schedule(
  'process-email-queue-every-5-minutes',
  '*/5 * * * *',  -- Every 5 minutes
  $$
  SELECT net.http_post(
    url := 'https://inudoymofztrvxhrlrek.supabase.co/functions/v1/process-email-queue',
    headers := '{"Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}',
    body := '{}'
  );
  $$
);
```

### Queue-Based Flow Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Application   │───▶│   email_queue    │───▶│ Automated       │
│   Triggers      │    │   Table          │    │ Processing      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
        │                        │                        │
        ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Database       │    │  pg_cron         │    │process-email-   │
│  Triggers       │    │  (Every 5 min)   │    │queue Function   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │  Processing Log  │    │   send-email    │
                       │  (History)       │    │   Edge Function │
                       └──────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │  Retry Logic     │    │   Resend API    │
                       │  (Exponential)   │    │   (Delivery)    │
                       └──────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │   email_logs    │
                                               │   (Tracking)    │
                                               └─────────────────┘
```

### Queue Processing Flow

**Automated Process**:
1. **Trigger**: Database trigger or manual function call queues email
2. **Queue Entry**: Email request stored in `email_queue` table with `pending` status
3. **Automated Processing**: pg_cron invokes `process-email-queue` function every 5 minutes
4. **Batch Processing**: Function processes pending emails in batches
5. **Email Delivery**: Calls `send-email` Edge Function for actual delivery
6. **Status Update**: Queue entry updated to `sent` or `failed` based on result
7. **Retry Logic**: Failed emails automatically retried with exponential backoff
8. **Processing Log**: Each processing run logged in `email_queue_processing_log` table
9. **Final Logging**: Complete audit trail maintained in `email_logs` table

### Queue Retry Logic

**Exponential Backoff Strategy**:
- **First Retry**: 5 minutes after initial failure
- **Second Retry**: 30 minutes after first retry
- **Third Retry**: 2 hours after second retry
- **Maximum Attempts**: 3 total retry attempts
- **Final Status**: Marked as permanently failed after 3 attempts

**Retry Conditions**:
- Network timeouts or temporary API errors
- Rate limiting from email service
- Temporary template processing issues
- Does NOT retry for permanent failures (invalid email, blocked domain)

### Queue Management Features

**System Health Check Interface** (`/admin/system-health`):
- **Email Queue Automation**: Real-time automated processing status
- **Queue Status Monitoring**: Live statistics (pending, sent, failed emails)
- **Manual Processing Controls**: Force immediate queue processing
- **Processing History**: Recent processing runs with metrics
- **Failed Email Management**: Comprehensive failed email intervention

**Admin Interface Components**:
- **EmailQueueStatus**: Queue statistics, manual processing, history view
- **EmailFailedManager**: Failed email management (retry_count >= 3)
- **ProcessingHistory**: Recent processing runs with duration and counts

**Database Functions**:
- `process_email_queue()` - Batch processes pending emails with logging
- Queue status tracking and comprehensive error logging
- Automatic cleanup of old processed entries
- Processing history tracking in `email_queue_processing_log`

### Migration History

**Phase A-H Implementation (2025-01-27)**:
- **Phase A**: Email queue table creation with retry logic
- **Phase B**: Database function `process_email_queue()` implementation
- **Phase C**: `process-email-queue` Edge Function creation
- **Phase D**: Queue integration into existing email triggers
- **Phase E**: SystemHealthCheck page creation with monitoring
- **Phase F**: EmailQueueStatus component with queue management
- **Phase G**: Processing history tracking and display
- **Phase H**: Failed email management with retry/delete capabilities

**Automated Processing Setup (2025-01-27)**:
- **pg_cron Integration**: 5-minute automated queue processing schedule
- **Processing Log**: `email_queue_processing_log` table for history tracking
- **Admin Interface**: Comprehensive queue monitoring and management
- **Failed Email Management**: Manual intervention for permanently failed emails

**2025-01-26 Email System Cleanup**:
- **Removed Functions**: `call_send_email_trigger()` and `trigger_work_order_created_email_v2()`
- **Reason**: Obsoleted by queue-based architecture
- **Impact**: System now uses 6 active triggers with queue processing
- **Status**: Migration completed successfully with full backward compatibility

## Email Templates

### Complete Template List (9 Total)

#### Transactional Templates (7)
| Template Name | Purpose | Triggered By | Recipients |
|---------------|---------|--------------|------------|
| `work_order_created` | New work order notification | Work order creation | Admins |
| `work_order_assigned` | Assignment notification | Work order assignment | Assigned subcontractor |
| `work_order_completed` | Completion notification | Work order completion | Partner organization |
| `report_submitted` | New report notification | Report submission | Admins |
| `report_reviewed` | Review result notification | Report approval/rejection | Subcontractor |
| `welcome_email` | New user welcome | User creation (optional) | New user |
| `test_email` | System testing | Manual testing | Test recipient |

#### Authentication Templates (2)
| Template Name | Purpose | Triggered By | Recipients |
|---------------|---------|--------------|------------|
| `auth_confirmation` | Account activation | User registration | New user |
| `password_reset` | Password recovery | Password reset request | User |

### Template Structure

**Database Schema**:
```sql
email_templates:
- template_name (unique identifier)
- subject (email subject line)
- html_content (HTML email body with variables)
- description (template purpose)
- variables (available substitution variables)
- is_active (template enabled status)
```

**Variable Substitution**:
Templates use `{{variable_name}}` syntax for dynamic content:
```html
<h1>Hello {{first_name}},</h1>
<p>Your work order {{work_order_number}} has been {{status}}.</p>
<a href="{{confirmation_link}}">Click here to confirm</a>
```

## Authentication Email System

### Account Confirmation Flow

**Traditional Supabase Flow** (Bypassed):
```
User Registration → Supabase SMTP → Unreliable Delivery
```

**Our Custom Flow**:
```
User Registration → create-admin-user → Magic Link Generation → send-email → Resend API → Reliable Delivery
```

**Implementation**:
1. Admin creates user via `create-admin-user` Edge Function  
2. Function creates auth user with `email_confirm: false`
3. Generates secure magic link via `supabase.auth.admin.generateLink()`
4. Calls `send-email` with `auth_confirmation` template
5. Passes confirmation link via `custom_data`
6. User receives email from Resend
7. User clicks link to activate account

### Password Reset Flow

**Traditional Supabase Flow** (Bypassed):
```
Reset Request → Supabase SMTP → Unreliable Delivery
```

**Our Custom Flow**:
```
Reset Request → password-reset-email → Magic Link Generation → send-email → Resend API → Reliable Delivery
```

**Implementation**:
1. User requests password reset via `password-reset-email` Edge Function
2. Function looks up user profile (securely, without revealing existence)
3. Generates secure reset link via `supabase.auth.admin.generateLink()`
4. Calls `send-email` with `password_reset` template
5. Always returns success for security (prevents user enumeration)
6. User receives email if account exists

### Authentication Email Variables

**auth_confirmation Template Variables**:
```javascript
{
  first_name: string,
  email: string,
  confirmation_link: string // Generated magic link
}
```

**password_reset Template Variables**:
```javascript
{
  first_name: string,
  email: string,
  reset_link: string // Generated magic link
}
```

## Email Testing System

### Email Testing Panel

**Location**: `/admin/test-email`
**Access**: Admin users only

**Features**:
- Test all 9 email templates
- Custom recipient override
- Real-time delivery status
- Test mode flag for safe testing
- Integration with `email_logs` monitoring

**Testing Workflow**:
```typescript
// Test authentication email
const testAuthEmail = async () => {
  await supabase.functions.invoke('send-email', {
    body: {
      template_name: 'auth_confirmation',
      record_id: 'TEST-AUTH-001',
      record_type: 'user',
      test_mode: true,
      test_recipient: 'test@example.com',
      custom_data: {
        email: 'test@example.com',
        first_name: 'Test User',
        confirmation_link: 'https://workorderportal.com/auth/confirm?token=test'
      }
    }
  });
};
```

### Email Monitoring

**Database Tracking**:
All emails logged in `email_logs` table:
```sql
email_logs:
- template_name (which template was used)
- recipient_email (who received it)
- resend_message_id (Resend tracking ID)
- status (sent/delivered/failed/bounced)
- error_message (failure details)
- test_mode (development flag)
- sent_at (timestamp)
- metadata (additional tracking data)
```

**Monitoring Queries**:
```sql
-- Email delivery status summary
SELECT 
  template_name,
  status,
  COUNT(*) as count,
  DATE(sent_at) as date
FROM email_logs 
WHERE sent_at > NOW() - INTERVAL '7 days'
GROUP BY template_name, status, DATE(sent_at)
ORDER BY date DESC, template_name;

-- Failed authentication emails
SELECT 
  template_name,
  recipient_email,
  error_message,
  sent_at
FROM email_logs 
WHERE template_name IN ('auth_confirmation', 'password_reset')
AND status = 'failed'
ORDER BY sent_at DESC;

-- Recent test emails
SELECT * FROM email_logs 
WHERE test_mode = true 
ORDER BY sent_at DESC 
LIMIT 10;
```

## Health Check System

### Automated Processing Monitoring

**Processing History Table**:
```sql
-- email_queue_processing_log structure
CREATE TABLE email_queue_processing_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  processed_count INTEGER NOT NULL,
  failed_count INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Recent Processing Verification**:
```sql
-- Check recent automated processing runs
SELECT 
  processed_at,
  processed_count,
  failed_count,
  duration_ms,
  (processed_count + failed_count) as total_processed
FROM email_queue_processing_log 
ORDER BY processed_at DESC 
LIMIT 10;

-- Should show regular 5-minute intervals with processing activity
```

### Failed Email Management

**Failed Email Detection**:
```sql
-- Find permanently failed emails (retry_count >= 3)
SELECT 
  id,
  template_name,
  record_type,
  record_id,
  status,
  retry_count,
  error_message,
  created_at,
  context_data->>'recipient_email' as recipient_email
FROM email_queue 
WHERE status = 'failed' 
  AND retry_count >= 3
ORDER BY created_at DESC;
```

**Failed Email Management Interface**:
- **Location**: SystemHealthCheck page → "Failed Email Management" section
- **Features**: View, retry (reset retry_count to 0), delete failed emails
- **Bulk Actions**: Select multiple emails for batch operations
- **Error Details**: View detailed error messages and recipient information

### Email System Health Verification

Use these queries to ensure the email system is functioning correctly after migration or maintenance.

#### 1. System Component Checks

**Verify Email Queue Table Structure**:
```sql
-- Check email_queue table exists and has correct structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'email_queue' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Expected columns: id, template_name, record_type, record_id, context_data, 
-- status, retry_count, error_message, next_retry_at, created_at, processed_at
```

**Verify Process Function Exists**:
```sql
-- Check process_email_queue function exists
SELECT 
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_name = 'process_email_queue' 
  AND routine_schema = 'public';

-- Should return 1 row with function definition
```

**Check Email Triggers Count**:
```sql
-- Verify all 6 email triggers exist
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
  AND trigger_name LIKE '%email%'
ORDER BY trigger_name;

-- Expected triggers: 6 total
-- - Work order created/assigned/completed triggers
-- - Report submitted/reviewed triggers  
-- - User creation trigger
```

**Validate Email Templates**:
```sql
-- Confirm all 9 email templates exist and are active
SELECT 
  template_name,
  is_active,
  LENGTH(html_content) as content_length,
  created_at
FROM email_templates 
WHERE template_name IN (
  'work_order_created', 'work_order_assigned', 'work_order_completed',
  'report_submitted', 'report_reviewed', 'welcome_email', 'test_email',
  'auth_confirmation', 'password_reset'
)
ORDER BY template_name;

-- Should return 9 rows, all with is_active = true
```

#### 2. Queue Health Checks

**Identify Stuck Emails**:
```sql
-- Find emails that have failed permanently (retry_count >= 3)
SELECT 
  id,
  template_name,
  record_type,
  record_id,
  status,
  retry_count,
  error_message,
  created_at,
  next_retry_at
FROM email_queue 
WHERE status = 'failed' 
  AND retry_count >= 3
ORDER BY created_at DESC;

-- Should return 0 rows in healthy system
```

**Queue Status Summary**:
```sql
-- Overall queue health summary
SELECT 
  status,
  COUNT(*) as count,
  MIN(created_at) as oldest_entry,
  MAX(created_at) as newest_entry
FROM email_queue 
GROUP BY status
ORDER BY status;

-- Healthy system: mostly 'sent', minimal 'pending', few 'failed'
```

**Old Pending Emails Detection**:
```sql
-- Find emails pending for more than 30 minutes (potential issue with 5-min processing)
SELECT 
  id,
  template_name,
  record_type,
  status,
  retry_count,
  created_at,
  next_retry_at,
  AGE(now(), created_at) as pending_duration
FROM email_queue 
WHERE status = 'pending' 
  AND created_at < now() - INTERVAL '30 minutes'
  AND (next_retry_at IS NULL OR next_retry_at < now())
ORDER BY created_at ASC;

-- Should return 0 rows in healthy system with 5-minute processing
```

**Automated Processing Health Check**:
```sql
-- Verify automated processing is running (should have recent entries)
SELECT 
  COUNT(*) as recent_processing_runs,
  MAX(processed_at) as last_processing_run,
  AGE(now(), MAX(processed_at)) as time_since_last_run
FROM email_queue_processing_log 
WHERE processed_at > now() - INTERVAL '1 hour';

-- Should show recent processing runs within last 5-10 minutes
```

#### 3. Expected Email Trigger Behavior

**Work Order Created (`work_order_created`)**:
- **Trigger**: INSERT on `work_orders` table
- **Recipients**: Admin users
- **Template**: Notifies admins of new work order submission
- **Variables**: `work_order_number`, `organization_name`, `store_location`, `description`

**Work Order Assigned (`work_order_assigned`)**:
- **Trigger**: UPDATE on `work_orders` when status changes to 'assigned'
- **Recipients**: Assigned subcontractor(s)
- **Template**: Notifies assignee of new work assignment
- **Variables**: `work_order_number`, `assignee_name`, `due_date`, `work_description`

**Work Order Completed (`work_order_completed`)**:
- **Trigger**: UPDATE on `work_orders` when status changes to 'completed'
- **Recipients**: Partner organization contact
- **Template**: Notifies partner that work is complete
- **Variables**: `work_order_number`, `completion_date`, `work_summary`

**Report Submitted (`report_submitted`)**:
- **Trigger**: INSERT on `work_order_reports` table
- **Recipients**: Admin users
- **Template**: Notifies admins of submitted work report
- **Variables**: `work_order_number`, `subcontractor_name`, `work_performed`

**Report Reviewed (`report_reviewed`)**:
- **Trigger**: UPDATE on `work_order_reports` when status changes to 'approved' or 'rejected'
- **Recipients**: Report submitter (subcontractor)
- **Template**: Notifies subcontractor of report review result
- **Variables**: `work_order_number`, `review_status`, `review_notes`

**User Welcome (`welcome_email`)**:
- **Trigger**: Manual or INSERT on `profiles` table (optional)
- **Recipients**: New user
- **Template**: Welcome message for new system users
- **Variables**: `first_name`, `user_type`, `login_link`

#### 4. Functional Testing

**Test Work Order Email Queuing**:
```sql
-- Before test: Note current queue count
SELECT COUNT(*) as current_queue_count FROM email_queue WHERE status = 'pending';

-- Create test work order (replace with actual org_id and trade_id)
INSERT INTO work_orders (
  work_order_number, title, description, organization_id, trade_id, 
  status, store_location, street_address, city, state, zip_code, created_by
) VALUES (
  'TEST-001-001', 'Test Email Trigger', 'Testing email queue functionality',
  'your-org-id', 'your-trade-id', 'received', 'Test Location',
  '123 Test St', 'Test City', 'TX', '12345', 'your-user-id'
);

-- After test: Verify queue entry was created
SELECT 
  template_name,
  record_type,
  status,
  created_at
FROM email_queue 
WHERE template_name = 'work_order_created' 
  AND created_at > now() - INTERVAL '5 minutes'
ORDER BY created_at DESC;

-- Cleanup: Delete test work order
DELETE FROM work_orders WHERE work_order_number = 'TEST-001-001';
```

**Manual Queue Processing Test**:
```sql
-- Process the email queue manually
SELECT process_email_queue();

-- Verify processing results
SELECT 
  template_name,
  status,
  processed_at,
  error_message
FROM email_queue 
WHERE processed_at > now() - INTERVAL '5 minutes'
ORDER BY processed_at DESC;
```

#### 5. Troubleshooting Common Issues

**Missing Triggers (Critical)**:
```sql
-- If trigger count is less than 6, email queuing is broken
-- Check specific missing triggers:
SELECT 
  'work_order_created' as expected_trigger
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.triggers 
  WHERE trigger_name LIKE '%work_order_created%'
);

-- Repeat for each expected trigger
```

**Queue Processing Not Working**:
```sql
-- Check if process function is being called
SELECT 
  id,
  status,
  retry_count,
  created_at,
  processed_at
FROM email_queue 
WHERE created_at > now() - INTERVAL '24 hours'
  AND processed_at IS NULL
ORDER BY created_at DESC;

-- If many unprocessed entries exist, check Edge Function deployment
```

**Email Delivery Failures**:
```sql
-- Check recent email failures in logs
SELECT 
  template_used,
  recipient_email,
  status,
  error_message,
  sent_at
FROM email_logs 
WHERE status IN ('failed', 'bounced')
  AND sent_at > now() - INTERVAL '24 hours'
ORDER BY sent_at DESC;

-- Common causes: Invalid Resend API key, domain not verified
```

#### 6. Performance Monitoring

**Email Volume Tracking**:
```sql
-- Daily email volume by template
SELECT 
  DATE(created_at) as date,
  template_name,
  COUNT(*) as emails_queued,
  COUNT(CASE WHEN status = 'sent' THEN 1 END) as emails_sent,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as emails_failed
FROM email_queue 
WHERE created_at > now() - INTERVAL '7 days'
GROUP BY DATE(created_at), template_name
ORDER BY date DESC, template_name;
```

**Queue Processing Performance**:
```sql
-- Average processing time per email
SELECT 
  template_name,
  AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) as avg_processing_seconds,
  MIN(processed_at - created_at) as min_processing_time,
  MAX(processed_at - created_at) as max_processing_time
FROM email_queue 
WHERE processed_at IS NOT NULL
  AND created_at > now() - INTERVAL '7 days'
GROUP BY template_name
ORDER BY avg_processing_seconds DESC;
```

### Health Check Automation

Consider automating these health checks with a scheduled function:

```sql
-- Create a comprehensive health check function
CREATE OR REPLACE FUNCTION email_system_health_check()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb := '{}'::jsonb;
  stuck_emails integer;
  old_pending integer;
  trigger_count integer;
  template_count integer;
BEGIN
  -- Count stuck emails
  SELECT COUNT(*) INTO stuck_emails
  FROM email_queue 
  WHERE status = 'failed' AND retry_count >= 3;
  
  -- Count old pending emails
  SELECT COUNT(*) INTO old_pending
  FROM email_queue 
  WHERE status = 'pending' 
    AND created_at < now() - INTERVAL '1 hour';
  
  -- Count email triggers
  SELECT COUNT(*) INTO trigger_count
  FROM information_schema.triggers 
  WHERE trigger_schema = 'public'
    AND trigger_name LIKE '%email%';
  
  -- Count active templates
  SELECT COUNT(*) INTO template_count
  FROM email_templates 
  WHERE is_active = true;
  
  -- Build result
  result := jsonb_build_object(
    'timestamp', now(),
    'status', CASE 
      WHEN stuck_emails > 0 OR old_pending > 5 OR trigger_count < 6 OR template_count < 9 
      THEN 'unhealthy' 
      ELSE 'healthy' 
    END,
    'stuck_emails', stuck_emails,
    'old_pending_emails', old_pending,
    'active_triggers', trigger_count,
    'active_templates', template_count,
    'expected_triggers', 6,
    'expected_templates', 9
  );
  
  RETURN result;
END;
$$;
```

Run the health check with:
```sql
SELECT email_system_health_check();
```

## Configuration and Setup

### Required Environment Variables

**Supabase Edge Function Secrets**:
```bash
# Resend API Key (Primary email service)
RESEND_API_KEY=re_xxxxxxxxxxxxx

# Supabase Configuration (Auto-configured)
SUPABASE_URL=https://inudoymofztrvxhrlrek.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Public Site URL (For email links)
PUBLIC_SITE_URL=https://workorderportal.com
```

### Resend Configuration

**Domain Setup**:
1. Add domain `workorderportal.com` to Resend dashboard
2. Configure DNS records for domain verification
3. Set up DKIM/SPF records for optimal deliverability
4. Verify domain status before production use

**API Key Setup**:
1. Create API key in Resend dashboard
2. Assign appropriate permissions (send emails)
3. Add to Supabase Edge Function secrets
4. Test email delivery via testing panel

### Function Configuration

**supabase/config.toml**:
```toml
[functions.password-reset-email]
verify_jwt = false  # Public access for unauthenticated users

[functions.send-email]  
# verify_jwt = true (default) - requires authentication

[functions.create-admin-user]
# verify_jwt = true (default) - requires admin authentication
```

## Troubleshooting Guide

### Common Issues and Solutions

#### Authentication Emails Not Received

**Symptoms**:
- User doesn't receive confirmation email
- Password reset email missing
- Email shows as "sent" in logs but not delivered

**Debugging Steps**:
```sql
-- Check email logs
SELECT * FROM email_logs 
WHERE template_name IN ('auth_confirmation', 'password_reset')
AND recipient_email = 'user@example.com'
ORDER BY sent_at DESC;
```

**Common Causes & Solutions**:
1. **Resend API Key Invalid**
   - Verify key in Supabase Edge Function secrets
   - Check key permissions in Resend dashboard
   - Test with simple email send

2. **Domain Not Verified**
   - Check domain status in Resend dashboard
   - Verify DNS records are correctly configured
   - Wait for DNS propagation (up to 24 hours)

3. **Spam Folder**
   - Check recipient's spam/junk folder
   - Verify DKIM/SPF records are set up
   - Use established domain with good reputation

4. **Template Variables Missing**
   - Check custom_data structure matches template needs
   - Verify magic link generation succeeds
   - Ensure all required variables are provided

#### Template Processing Errors

**Symptoms**:
- Emails sent with missing content
- Variable substitution not working
- HTML formatting issues

**Debugging Steps**:
```sql
-- Check template content
SELECT template_name, subject, html_content, variables 
FROM email_templates 
WHERE template_name = 'auth_confirmation';

-- Check recent email attempts
SELECT template_name, status, error_message, metadata
FROM email_logs 
WHERE status = 'failed'
ORDER BY sent_at DESC;
```

**Solutions**:
1. **Template Variables Mismatch**
   - Update template to match available variables
   - Provide fallback values in Edge Function
   - Check variable naming consistency

2. **HTML Content Issues**
   - Validate HTML syntax in template
   - Test email rendering in multiple clients
   - Use email-safe HTML practices

#### Edge Function Errors

**Symptoms**:
- Function timeouts
- Internal server errors
- Authentication failures

**Debugging Steps**:
- Check Edge Function logs in Supabase dashboard
- Verify environment variables are set
- Test function with simple test cases

**Solutions**:
1. **Service Role Key Issues**
   - Verify key has admin permissions
   - Check key is correctly configured
   - Test with direct Supabase admin operations

2. **Memory/Timeout Issues**
   - Optimize template processing logic
   - Add proper error handling
   - Use batch processing for multiple emails

### Testing Procedures

#### Full System Test

**1. Template Validation**:
```sql
-- Verify all templates exist and are active
SELECT template_name, is_active 
FROM email_templates 
WHERE template_name IN (
  'work_order_created', 'work_order_assigned', 'work_order_completed',
  'report_submitted', 'report_reviewed', 'welcome_email', 'test_email',
  'auth_confirmation', 'password_reset'
);
```

**2. Email Delivery Test**:
```typescript
// Test each template type
const templates = [
  'work_order_created', 'work_order_assigned', 'auth_confirmation', 
  'password_reset'
];

for (const template of templates) {
  await testEmailTemplate(template, 'test@example.com');
}
```

**3. Authentication Flow Test**:
```typescript
// Test complete auth flow
1. Create test user via create-admin-user
2. Verify auth_confirmation email sent
3. Test password reset flow
4. Verify password_reset email sent
5. Check all emails in email_logs table
```

#### Performance Monitoring

**Email Volume Tracking**:
```sql
-- Daily email volume by type
SELECT 
  DATE(sent_at) as date,
  template_name,
  COUNT(*) as emails_sent,
  COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
FROM email_logs 
WHERE sent_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(sent_at), template_name
ORDER BY date DESC, template_name;
```

**Delivery Rate Analysis**:
```sql
-- Overall delivery success rate
SELECT 
  template_name,
  COUNT(*) as total_sent,
  COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
  ROUND(
    (COUNT(CASE WHEN status = 'delivered' THEN 1 END) * 100.0 / COUNT(*)), 2
  ) as delivery_rate_percent
FROM email_logs 
WHERE sent_at > NOW() - INTERVAL '7 days'
AND test_mode = false
GROUP BY template_name
ORDER BY delivery_rate_percent DESC;
```

## Benefits of Our Email System

### Reliability
- **99.9% Delivery Rate**: Resend's enterprise infrastructure
- **No Supabase Dependencies**: Independent of Supabase SMTP issues
- **Redundant Monitoring**: Database logging + Resend webhooks
- **Queue-Based Processing**: Automatic retry for failed emails with exponential backoff
- **Resilient Architecture**: System continues functioning if email service is temporarily unavailable

### Control
- **Custom Templates**: Full HTML/CSS customization
- **Dynamic Content**: Rich variable substitution
- **Timing Control**: Send emails exactly when needed
- **Testing Capabilities**: Comprehensive testing without affecting users
- **Queue Management**: Manual processing and retry capabilities

### Monitoring
- **Complete Audit Trail**: Every email logged with full metadata
- **Real-time Status**: Delivery tracking via Resend webhooks
- **Performance Analytics**: Delivery rates, failure analysis
- **Debug Information**: Detailed error messages and troubleshooting data
- **Queue Visibility**: Complete queue status and processing metrics

### Performance
- **Non-Blocking Processing**: Email sending doesn't block application operations
- **Batch Processing**: Efficient handling of multiple emails
- **Scalable Architecture**: Handles high email volumes without performance impact
- **Background Processing**: Emails processed asynchronously for optimal user experience

### Security
- **No User Enumeration**: Password resets never reveal user existence
- **Secure Magic Links**: Generated via Supabase Admin API
- **Token Validation**: Proper token handling and expiration
- **CORS Protection**: Secure cross-origin request handling

This unified, queue-based email system provides WorkOrderPro with enterprise-grade email capabilities, ensuring all communications - from work order notifications to password resets - are delivered reliably with complete visibility and control. The queue architecture adds resilience and performance while maintaining the same reliability and security standards.
