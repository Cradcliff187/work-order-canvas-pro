# WorkOrderPortal Edge Functions Documentation

## Overview

WorkOrderPortal uses Supabase Edge Functions for secure server-side operations that require elevated privileges or external API integrations. All email communications use Resend API through unified edge functions, providing complete control over email delivery and bypassing Supabase's unreliable SMTP system.

**Email Architecture**: All emails (transactional + authentication) route through our custom `send-email` edge function using Resend API for 100% reliable delivery.

## Available Edge Functions

### process-email-queue

**Purpose**: Batch processes queued emails for reliable, asynchronous email delivery with automated scheduling

**File**: `supabase/functions/process-email-queue/index.ts`

**Features**:
- **Automated Processing**: Invoked every 5 minutes via pg_cron for continuous processing
- **Queue Management**: Processes pending emails from the `email_queue` table
- **Batch Processing**: Handles multiple emails efficiently in a single execution
- **Database Function Integration**: Calls the `process_email_queue()` database function
- **Admin Interface**: Provides API for manual queue processing and monitoring
- **Processing History**: Logs each processing run in `email_queue_processing_log` table
- **Error Handling**: Graceful error management with detailed logging
- **Status Tracking**: Updates queue status and retry information

**Automated Processing Schedule**:
```sql
-- pg_cron job runs every 5 minutes
SELECT cron.schedule(
  'process-email-queue-every-5-minutes',
  '*/5 * * * *',  -- Every 5 minutes
  $$ SELECT net.http_post(
    url := 'https://inudoymofztrvxhrlrek.supabase.co/functions/v1/process-email-queue',
    headers := '{"Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}',
    body := '{}'
  ); $$
);
```

**Queue Processing Flow**:
1. **Automated Trigger**: pg_cron invokes function every 5 minutes
2. **Queue Monitoring**: Checks `email_queue` table for pending emails
3. **Batch Selection**: Selects emails ready for processing (not in retry delay)
4. **Email Processing**: Calls `send-email` function for each queued email
5. **Status Updates**: Updates queue entries based on delivery results
6. **Retry Scheduling**: Schedules failed emails for retry with exponential backoff
7. **Processing Log**: Records processing run statistics and duration
8. **Cleanup**: Removes successfully processed emails from queue

**Request Format**:
```typescript
// No request body required - processes all pending emails
POST /functions/v1/process-email-queue
Authorization: Bearer <token>
```

**Response Format**:
```typescript
{
  success: boolean;
  processed_count: number;
  failed_count: number;
  message: string;
  details?: any;
}
```

**Usage**: Automated processing every 5 minutes via pg_cron, plus manual processing via admin interface

**Configuration**: 
```toml
[functions.process-email-queue]
# verify_jwt = true (default) - requires authentication
```

### send-email

**Purpose**: Unified email handler for ALL email types including transactional and authentication emails

**File**: `supabase/functions/send-email/index.ts`

**Features**:
- **Universal Email Handler**: Processes all 9 email templates (7 transactional + 2 authentication)
- **Resend API Integration**: Uses Resend for reliable email delivery
- **Template Processing**: Dynamic variable substitution with fallback handling
- **Authentication Email Support**: Handles `auth_confirmation` and `password_reset` with custom_data
- **Database Logging**: Comprehensive tracking in `email_logs` table
- **Test Mode**: Development testing with custom recipients
- **Error Resilience**: Graceful fallback for missing templates or data

**Supported Templates**:

*Transactional Templates*:
- `work_order_created` - Notifies admins of new work orders
- `work_order_assigned` - Notifies assigned subcontractor
- `work_order_completed` - Notifies partner of completion
- `report_submitted` - Notifies admins of new reports
- `report_reviewed` - Notifies subcontractor of review status
- `welcome_email` - Welcome message for new users
- `test_email` - System testing template

*Authentication Templates*:
- `auth_confirmation` - Account confirmation with activation link
- `password_reset` - Password reset with recovery link

**Authentication Email Handling**:
The function provides special handling for authentication emails that bypass Supabase's unreliable SMTP:

```typescript
// Enhanced auth email processing
if (template_name === 'auth_confirmation' || template_name === 'password_reset') {
  const customData = request.custom_data || {};
  variables = {
    ...variables,
    first_name: customData.first_name || 'User',
    email: customData.email || '',
    confirmation_link: customData.confirmation_link || '',
    reset_link: customData.reset_link || ''
  };
}
```

**Request Format**:
```typescript
interface SendEmailRequest {
  template_name: string;
  record_id: string;
  record_type?: string;
  test_mode?: boolean;
  test_recipient?: string;
  custom_data?: {
    email?: string;
    first_name?: string;
    confirmation_link?: string;
    reset_link?: string;
    [key: string]: any;
  };
}
```

**Usage**: Called automatically by database triggers and manually by other edge functions

### password-reset-email

**Purpose**: Handle password reset requests bypassing Supabase's unreliable auth email system

**File**: `supabase/functions/password-reset-email/index.ts`

**Function Features**:
- **Security First**: Always returns success to prevent user enumeration attacks
- **Magic Link Generation**: Uses `supabase.auth.admin.generateLink()` for secure reset links
- **Resend Integration**: Calls `send-email` function with `password_reset` template
- **Profile Lookup**: Retrieves user's first name for personalization while maintaining security
- **Public Access**: No authentication required (configured with `verify_jwt = false`)
- **CORS Enabled**: Supports web application calls

**Security Model**:
```typescript
// Always return success for security (never reveal user existence)
return createCorsResponse({
  success: true,
  message: 'If an account with that email exists, a password reset link has been sent.'
});
```

**Request Format**:
```typescript
interface PasswordResetRequest {
  email: string;
}
```

**Email Flow**:
1. Receives password reset request with email
2. Looks up user profile (doesn't reveal if user exists)
3. Generates secure magic link via Supabase Admin API
4. Calls `send-email` function with `password_reset` template
5. Passes reset link and user data via `custom_data`
6. Always returns success message for security

**Usage Example**:
```typescript
const response = await fetch(`${supabaseUrl}/functions/v1/password-reset-email`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@example.com' })
});
```

**Configuration**: 
```toml
[functions.password-reset-email]
verify_jwt = false  # Public access for unauthenticated users
```

### create-admin-user

**Purpose**: Create individual user accounts through admin interface with manual confirmation email handling

**File**: `supabase/functions/create-admin-user/index.ts`

**Function Features**:
- **Admin Authentication**: Requires authenticated admin user via Bearer token
- **Manual Email Confirmation**: Bypasses Supabase SMTP, uses Resend via `send-email` function
- **Magic Link Generation**: Creates secure confirmation links using Supabase Admin API
- **Organization Assignment**: Automatically assigns users to specified organizations
- **Profile Management**: Creates comprehensive user profiles with business data
- **Email Control**: Optional email sending via `send_welcome_email` parameter
- **Audit Logging**: Tracks email events in `email_logs` table
- **Error Resilience**: User creation succeeds even if email fails

**Enhanced Email Flow**:
```typescript
// Generate confirmation link
const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
  type: 'signup',
  email: userData.email,
  options: {
    redirectTo: `${Deno.env.get('PUBLIC_SITE_URL')}/auth/callback`
  }
});

// Send via our unified email system
if (linkData?.properties?.action_link) {
  await supabaseAdmin.functions.invoke('send-email', {
    body: {
      template_name: 'auth_confirmation',
      record_id: profileData.id,
      record_type: 'user',
      custom_data: {
        email: userData.email,
        first_name: userData.first_name,
        confirmation_link: linkData.properties.action_link
      }
    }
  });
}
```

**Request Format**:
```typescript
interface CreateAdminUserRequest {
  userData: {
    email: string;
    first_name: string;
    last_name: string;
    user_type: 'admin' | 'partner' | 'subcontractor' | 'employee';
    company_name?: string;
    phone?: string;
    hourly_cost_rate?: number;
    hourly_billable_rate?: number;
    organization_ids?: string[];
  };
  send_welcome_email?: boolean; // Default: true
}
```

**Email Confirmation Process**:
1. Creates Supabase auth user with `email_confirm: false` (compatibility)
2. Generates secure magic link via Admin API
3. Calls `send-email` function with `auth_confirmation` template
4. User receives Resend-delivered email with confirmation link
5. Logs email delivery attempt in `email_logs` table
6. User creation succeeds regardless of email delivery status

### create-test-users

**Purpose**: Create authenticated test users for comprehensive role-based testing

**File**: `supabase/functions/create-test-users/index.ts`

**Function Features**:
- **Service Role Authentication**: Uses `SUPABASE_SERVICE_ROLE_KEY` for user creation
- **Multiple Security Validation Methods**: API key, Bearer token, or development mode bypass
- **Organization Integration**: Automatically links users to appropriate organizations  
- **Comprehensive User Creation**: Creates 5 test users across all roles and organizations
- **Error Resilience**: Continues processing on individual failures with detailed error reporting

**Created Test Users**:
| Email | Role | Organization | Password |
|-------|------|--------------|----------|
| partner1@abc.com | partner | ABC Property Management | Test123! |
| partner2@xyz.com | partner | XYZ Commercial Properties | Test123! |
| sub1@pipes.com | subcontractor | Pipes & More Plumbing | Test123! |
| sub2@sparks.com | subcontractor | Sparks Electric | Test123! |
| employee1@workorderportal.com | employee | WorkOrderPortal Internal | Test123! |

**Usage**: Integrated with DevTools UI for easy test environment setup

## Email System Configuration

### Environment Variables

**Required Edge Function Secrets**:
```bash
# Resend API (for all email delivery)
RESEND_API_KEY=your-resend-api-key

# Supabase Configuration (auto-configured)
SUPABASE_URL=https://inudoymofztrvxhrlrek.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Admin Access (for create-test-users)
ADMIN_SEEDING_KEY=your-admin-api-key  
ADMIN_BEARER_TOKEN=your-bearer-token

# Public Site URL (for email links)
PUBLIC_SITE_URL=https://workorderportal.com
```

### Function Configuration (supabase/config.toml)

```toml
[functions.password-reset-email]
verify_jwt = false  # Public access for password resets

[functions.send-email]
# verify_jwt = true (default) - requires authentication

[functions.create-admin-user]  
# verify_jwt = true (default) - requires admin authentication

[functions.create-test-users]
# verify_jwt = true (default) - requires admin authentication
```

## Email Testing and Monitoring

### Email Testing Panel
Located at `/admin/test-email`, provides comprehensive testing for all email templates:

**Available Tests**:
- All 7 transactional email templates
- Both authentication email templates (`auth_confirmation`, `password_reset`)
- Custom recipient override for testing
- Real-time delivery status monitoring

**Testing Features**:
```typescript
// Test authentication emails
await testEmailTemplate('auth_confirmation', 'test@example.com');
await testEmailTemplate('password_reset', 'test@example.com');

// Monitor delivery in email_logs table
SELECT * FROM email_logs WHERE test_mode = true ORDER BY sent_at DESC;
```

### Email Monitoring

**Database Tracking**:
All emails are logged in the `email_logs` table with:
- Resend message ID for delivery tracking
- Template name and recipient
- Success/failure status with error details
- Test mode flag for development emails
- Complete metadata for debugging

**Monitoring Queries**:
```sql
-- Check recent email delivery status
SELECT template_name, status, COUNT(*) 
FROM email_logs 
WHERE sent_at > NOW() - INTERVAL '24 hours'
GROUP BY template_name, status;

-- Find failed authentication emails
SELECT * FROM email_logs 
WHERE template_name IN ('auth_confirmation', 'password_reset') 
AND status = 'failed'
ORDER BY sent_at DESC;
```

## Troubleshooting

### Common Issues

**Authentication Email Not Received**:
1. Check `email_logs` table for delivery status
2. Verify Resend API key is configured
3. Check spam folder (Resend has high deliverability)
4. Confirm domain is verified in Resend dashboard

**Template Not Found Errors**:
- Verify template exists in `email_templates` table
- Check template name spelling in function calls
- Ensure template is marked as `is_active = true`

**Variable Substitution Issues**:
- Check template variables match provided data
- Fallback values are provided for missing variables
- Custom_data structure matches template expectations

### Email System Architecture Benefits

**Why We Bypassed Supabase Auth Emails**:
1. **Reliability**: Supabase SMTP has delivery issues and limitations
2. **Control**: Complete customization of email content and timing
3. **Monitoring**: Full audit trail and delivery tracking
4. **Consistency**: Single email service (Resend) for all communications
5. **Testing**: Comprehensive testing capabilities with custom recipients

**Queue-Based Architecture Advantages**:
1. **Performance**: Non-blocking email processing doesn't slow down application
2. **Resilience**: System continues functioning if email service is temporarily unavailable
3. **Retry Logic**: Automatic retry with exponential backoff for failed emails
4. **Scalability**: Efficient batch processing handles high email volumes
5. **Monitoring**: Complete queue visibility and processing metrics
6. **Admin Control**: Manual queue processing and retry management

**Queue Processing Features**:
- **Automated Processing**: pg_cron schedule ensures continuous 5-minute processing
- **Processing History**: `email_queue_processing_log` tracks all processing runs with metrics
- **Failed Email Management**: Admin interface for emails with retry_count >= 3
- **Exponential Backoff**: 5 minutes → 30 minutes → 2 hours retry intervals
- **Maximum Attempts**: 3 total retry attempts before permanent failure
- **Batch Processing**: Efficient handling of multiple emails simultaneously
- **Status Tracking**: Real-time queue monitoring and processing metrics
- **Manual Control**: Admin interface for queue management and troubleshooting

**Result**: 100% reliable email delivery with complete control over all email communications through a unified, queue-based, well-monitored system that provides both reliability and performance.

This architecture ensures that all emails - from work order notifications to password resets - are delivered reliably through Resend's robust infrastructure while providing comprehensive monitoring, automatic retry capabilities, and optimal performance through asynchronous processing.
