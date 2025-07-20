# WorkOrderPro Edge Functions Documentation

## Overview

WorkOrderPro uses Supabase Edge Functions for secure server-side operations that require elevated privileges or external API integrations. Edge functions provide secure user creation capabilities that bypass RLS limitations while maintaining proper authentication and validation.

**Note**: Authentication emails (password reset, confirmation) use Supabase Auth with Resend SMTP. Transactional emails (work orders, reports) use Resend API via the unified send-email edge function.

## Available Edge Functions

### send-email

**Purpose**: Unified email handler for all transactional notifications

**File**: `supabase/functions/send-email/index.ts`

**Features**:
- Handles all email templates through single endpoint
- Database trigger integration via `call_send_email_trigger()`
- Resend API for reliable delivery
- Test mode for development
- Comprehensive email logging

**Supported Templates**:
- `work_order_created` - Notifies admins of new work orders
- `work_order_assigned` - Notifies assigned subcontractor
- `work_order_completed` - Notifies partner of completion
- `report_submitted` - Notifies admins of new reports
- `report_reviewed` - Notifies subcontractor of review status
- `welcome_email` - Welcome message for new users

**Usage**: Called automatically by database triggers when relevant events occur

### create-test-users

**Purpose**: Create authenticated test users for comprehensive role-based testing

**File**: `supabase/functions/create-test-users/index.ts`

**Function Features**:
- **Service Role Authentication**: Uses `SUPABASE_SERVICE_ROLE_KEY` for user creation
- **Multiple Security Validation Methods**: API key, Bearer token, or development mode bypass
- **Organization Integration**: Automatically links users to appropriate organizations  
- **Comprehensive User Creation**: Creates 5 test users across all roles and organizations
- **Error Resilience**: Continues processing on individual failures with detailed error reporting

#### Security Validation Methods

The function supports multiple admin authentication approaches:

**1. API Key Authentication (Primary)**
```typescript
// Request body validation
{
  "admin_key": "your-configured-admin-key"
}
```

**2. Bearer Token Authentication**
```typescript
// Header validation
Headers: {
  "Authorization": "Bearer your-configured-bearer-token"
}
```

**3. Development Mode Bypass**
```typescript
// Environment variable check
ENVIRONMENT=development
```

#### Created Test Users

The function creates 5 test users with specific roles and organization mappings:

| Email | Role | Organization | Password |
|-------|------|--------------|----------|
| partner1@abc.com | partner | ABC Property Management | Test123! |
| partner2@xyz.com | partner | XYZ Commercial Properties | Test123! |
| sub1@pipes.com | subcontractor | Pipes & More Plumbing | Test123! |
| sub2@sparks.com | subcontractor | Sparks Electric | Test123! |
| employee1@workorderpro.com | employee | WorkOrderPro Internal | Test123! |

#### Usage Examples

**Via DevTools UI (Recommended)**:
1. Navigate to `/dev-tools`
2. Click "Create Test Users" button  
3. Monitor results in real-time
4. Use created credentials for testing

**Direct API Call**:
```typescript
const response = await supabase.functions.invoke('create-test-users', {
  body: { 
    admin_key: 'your-admin-key' 
  }
});

if (response.error) {
  console.error('User creation failed:', response.error);
} else {
  console.log('Users created:', response.data.users);
}
```

**Using Bearer Token**:
```typescript
const response = await fetch(`${supabaseUrl}/functions/v1/create-test-users`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${bearerToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({})
});
```

#### Response Format

**Success Response**:
```json
{
  "success": true,
  "message": "Successfully created 5 test users",
  "users": [
    {
      "email": "partner1@abc.com",
      "password": "Test123!",
      "user_type": "partner", 
      "organization": "ABC Property Management",
      "profile_id": "uuid-profile-id",
      "auth_id": "uuid-auth-id",
      "created": true
    }
  ],
  "summary": {
    "total_attempted": 5,
    "total_created": 5,
    "total_failed": 0,
    "failed_users": []
  },
  "organizations_found": {
    "ABC Property Management": "org-uuid-1",
    "XYZ Commercial Properties": "org-uuid-2",
    "Pipes & More Plumbing": "org-uuid-3", 
    "Sparks Electric": "org-uuid-4",
    "WorkOrderPro Internal": "org-uuid-5"
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Authentication failed",
  "message": "Valid admin authentication required",
  "details": "Invalid admin key, bearer token, or development mode not enabled"
}
```

#### Technical Implementation

**Service Role Operations**:
```typescript
// Using service role for bypassing RLS
const supabaseAdmin = createClient(
  supabaseUrl, 
  supabaseServiceKey, // Bypasses RLS
  { auth: { persistSession: false } }
);

// Create auth user
const { data: authUser } = await supabaseAdmin.auth.admin.createUser({
  email: user.email,
  password: DEFAULT_TEST_PASSWORD,
  email_confirm: true,
  user_metadata: { first_name, last_name, user_type }
});

// Create profile with service role
await supabaseAdmin.from('profiles').insert(profileData);

// Create organization relationship
await supabaseAdmin.from('user_organizations').insert({
  user_id: profileData.id,
  organization_id: organizationId
});
```

**Error Handling Strategy**:
- Individual user creation failures don't stop the overall process
- Detailed error tracking for each failed user
- Orphaned auth user cleanup for failed profile creation
- Comprehensive summary reporting

#### Security Considerations

**Why Edge Functions for User Creation?**

1. **RLS Bypass**: Service role key bypasses Row Level Security policies that prevent client-side user creation
2. **Authentication Control**: Multiple validation methods ensure only authorized admin access
3. **Atomic Operations**: Service role can perform complete user setup (auth + profile + organization) in sequence
4. **Error Isolation**: Failed operations don't affect existing users or compromise security

**Security Validation**:
```typescript
function validateAdminAccess(requestData: any, authHeader: string | null): boolean {
  // 1. Check API key in request body
  if (requestData.admin_key === ADMIN_SEEDING_KEY) return true;
  
  // 2. Check Bearer token in Authorization header  
  if (authHeader?.startsWith('Bearer ') && 
      authHeader.slice(7) === ADMIN_BEARER_TOKEN) return true;
  
  // 3. Development mode bypass
  if (ENVIRONMENT === 'development') return true;
  
  return false;
}
```

### Deployment and Configuration

**Environment Variables Required**:
```bash
# Edge Function Secrets (configured in Supabase Dashboard)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ADMIN_SEEDING_KEY=your-admin-api-key  
ADMIN_BEARER_TOKEN=your-bearer-token
ENVIRONMENT=development # Optional: for dev mode bypass
```

**Deployment**:
Edge functions are automatically deployed when code changes are made to `supabase/functions/create-test-users/index.ts`. No manual deployment required.

**Configuration in Supabase Dashboard**:
1. Navigate to **Functions** → **create-test-users** → **Settings**
2. Add required environment variables
3. Ensure function is enabled and properly configured

### Error Troubleshooting

#### Common Issues

**"Authentication failed" Error**:
- **Cause**: Invalid or missing admin credentials
- **Solution**: Verify `ADMIN_SEEDING_KEY` or `ADMIN_BEARER_TOKEN` environment variables
- **Debug**: Check development mode is enabled for testing

**"Service role key not configured" Error**:
- **Cause**: Missing or invalid `SUPABASE_SERVICE_ROLE_KEY`
- **Solution**: Configure service role key in edge function secrets
- **Verification**: Ensure key has admin privileges in Supabase

**"Organization not found" Errors**:
- **Cause**: Required organizations don't exist in database
- **Solution**: Run `seed_test_data()` database function first to create organizations
- **Order**: Always seed database before creating users

**Individual User Creation Failures**:
- **Profile Creation Failed**: Usually indicates database constraint violations
- **Organization Linking Failed**: Organization mapping issues
- **Auth User Creation Failed**: Email conflicts or auth service issues

#### Debugging Tools

**DevTools Integration**:
The edge function integrates with the DevTools UI to provide:
- Real-time creation progress
- Detailed error reporting
- User credential display
- Success/failure summaries

**Manual Testing**:
```bash
# Test with cURL
curl -X POST "https://your-project.supabase.co/functions/v1/create-test-users" \
  -H "Authorization: Bearer your-bearer-token" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Integration with Development Workflow

**Complete Testing Setup**:
1. **Database Seeding**: Run `seed_test_data()` to create organizations and business data
2. **User Creation**: Run `create-test-users` to create authenticated test users  
3. **Role Testing**: Login with different user credentials to test role-based access
4. **Cleanup**: Use `clear_test_data()` to reset for next testing cycle

**DevTools Workflow**:
```typescript
// 1. Seed database
await supabase.rpc('seed_test_data');

// 2. Create users via DevTools UI click or programmatically
await supabase.functions.invoke('create-test-users', {
  body: { admin_key: 'admin-key' }
});

// 3. Test with real credentials
await supabase.auth.signIn({
  email: 'partner1@abc.com',
  password: 'Test123!'
});
```

This edge function provides a secure, comprehensive solution for creating authenticated test users while maintaining proper security and providing detailed feedback for development workflows.

### create-admin-user

**Purpose**: Create individual user accounts through the admin interface with conditional email sending

**File**: `supabase/functions/create-admin-user/index.ts`

**Function Features**:
- **Admin Authentication**: Requires authenticated admin user via Bearer token
- **Conditional Email Sending**: Control Supabase confirmation emails via `send_welcome_email` parameter
- **Organization Assignment**: Automatically assigns users to specified organizations
- **Profile Management**: Creates profiles with comprehensive user data including hourly rates
- **Email Logging**: Logs email events to `email_logs` table for tracking
- **Error Resilience**: Robust retry logic for profile creation and organization assignment

#### Authentication Requirements

The function requires an authenticated admin user:

**Bearer Token Authentication**:
```typescript
Headers: {
  "Authorization": "Bearer <supabase-session-token>",
  "Content-Type": "application/json"
}
```

The authenticated user must have `user_type = 'admin'` in their profile record.

#### Request Format

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
    is_employee?: boolean;
    organization_ids?: string[]; // Array of organization UUIDs
  };
  send_welcome_email?: boolean; // Default: true
}
```

**Example Request**:
```typescript
const response = await supabase.functions.invoke('create-admin-user', {
  body: {
    userData: {
      email: 'john.doe@company.com',
      first_name: 'John',
      last_name: 'Doe',
      user_type: 'partner',
      company_name: 'ABC Corp',
      phone: '555-0123',
      organization_ids: ['org-uuid-1', 'org-uuid-2']
    },
    send_welcome_email: true
  }
});
```

#### Response Format

**Success Response**:
```json
{
  "success": true,
  "user": {
    "id": "profile-uuid",
    "user_id": "auth-uuid",
    "email": "john.doe@company.com",
    "first_name": "John",
    "last_name": "Doe",
    "user_type": "partner",
    "company_name": "ABC Corp",
    "phone": "555-0123",
    "hourly_cost_rate": null,
    "hourly_billable_rate": null,
    "is_employee": false,
    "is_active": true,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  },
  "message": "User created successfully. They will receive a Supabase confirmation email to set up their account."
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Authentication failed",
  "message": "Admin profile not found"
}
```

#### Environment Variables

**Required Environment Variables**:
```bash
# Supabase Configuration (automatically available in Edge Functions)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

These environment variables are automatically configured in the Supabase Edge Function environment and do not need manual setup.

#### Email Handling

**Supabase Email Confirmation System**:
- Uses Supabase's built-in email confirmation when `send_welcome_email: true`
- Sets `email_confirm: true` in `auth.admin.createUser()` to trigger confirmation email
- User receives email with link to set their password and confirm account
- Email delivery is handled entirely by Supabase's email service

**Email Logging**:
- Logs email events to `email_logs` table for audit trail
- Records email recipient, template type, and status
- Provides tracking for email delivery and troubleshooting

**Email Control**:
```typescript
// Send welcome email (default behavior)
{
  "send_welcome_email": true  // Triggers Supabase confirmation email
}

// Skip welcome email
{
  "send_welcome_email": false  // No confirmation email sent
}
```

#### Usage Examples

**Frontend Integration**:
```typescript
import { supabase } from '@/integrations/supabase/client';

const createUser = async (userData) => {
  try {
    const { data, error } = await supabase.functions.invoke('create-admin-user', {
      body: {
        userData: {
          email: userData.email,
          first_name: userData.firstName,
          last_name: userData.lastName,
          user_type: userData.userType,
          organization_ids: userData.selectedOrganizations
        },
        send_welcome_email: userData.sendWelcomeEmail ?? true
      }
    });

    if (error) {
      console.error('User creation failed:', error);
      return { success: false, error };
    }

    console.log('User created successfully:', data.user);
    return { success: true, user: data.user };
  } catch (err) {
    console.error('Request failed:', err);
    return { success: false, error: err.message };
  }
};
```

**Direct API Call**:
```typescript
const response = await fetch(`https://your-project.supabase.co/functions/v1/create-admin-user`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${sessionToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userData: {
      email: 'user@example.com',
      first_name: 'Jane',
      last_name: 'Smith',
      user_type: 'subcontractor',
      company_name: 'Smith Contracting'
    },
    send_welcome_email: true
  })
});

const result = await response.json();
```

#### Troubleshooting

**Authentication Errors**:

*"Admin profile not found"*:
- **Cause**: Current user is not authenticated or doesn't have admin privileges
- **Solution**: Ensure user is logged in and has `user_type = 'admin'` in profiles table
- **Debug**: Check `auth.uid()` returns valid UUID and profile exists

*"Authentication failed"*:
- **Cause**: Missing or invalid Bearer token in request headers
- **Solution**: Include valid Supabase session token in Authorization header
- **Verification**: Test authentication with `supabase.auth.getSession()`

**Email Delivery Issues**:

*"Email confirmation failed"*:
- **Cause**: Supabase email service issues or configuration problems
- **Solution**: Check Supabase dashboard for email delivery status and logs
- **Verification**: Ensure email templates and delivery settings are properly configured

**Profile Creation Issues**:

*"Profile creation failed"*:
- **Cause**: Database constraint violations or validation errors
- **Solution**: Verify all required fields are provided and email is unique
- **Debug**: Check database logs for specific constraint violations

**Organization Assignment Issues**:

*"Organization assignment failed"*:
- **Cause**: Invalid organization IDs or permission issues
- **Solution**: Verify organization IDs exist and user has permission to assign
- **Debug**: Check user_organizations table constraints and RLS policies

#### Error Handling Patterns

**Comprehensive Error Handling Example**:
```typescript
try {
  const { data, error } = await supabase.functions.invoke('create-admin-user', {
    body: { userData, send_welcome_email: true }
  });

  if (error) {
    // Handle specific error types
    switch (error.message) {
      case 'Authentication failed':
        console.error('User not authorized to create accounts');
        break;
      case 'Email already exists':
        console.error('User with this email already exists');
        break;
      case 'Organization assignment failed':
        console.error('Failed to assign user to organization');
        break;
      default:
        console.error('Unknown error:', error.message);
    }
    return { success: false, error: error.message };
  }

  return { success: true, user: data.user };
} catch (networkError) {
  console.error('Network or request error:', networkError);
  return { success: false, error: 'Failed to connect to user creation service' };
}
```

This edge function provides secure, authenticated user creation with proper error handling, email management, and comprehensive audit logging for administrative user management workflows.