# API Reference

This document provides a quick reference for the WorkOrderPro API, including database functions and Edge Functions. For detailed implementation details, see [DATABASE_FUNCTIONS.md](./DATABASE_FUNCTIONS.md) and [EDGE_FUNCTIONS.md](./EDGE_FUNCTIONS.md).

## Database Functions

### Authentication & Authorization

Core functions that provide secure user context for RLS policies and permission checks.

- **`auth_user_id()`** - Safely retrieves the current user's UUID
- **`auth_profile_id()`** - Retrieves the internal profile ID for the current user
- **`auth_profile_id_safe()`** - Safe version with null checks and fallback logic
- **`get_current_user_id()`** - Gets current user ID with session validation
- **`jwt_is_admin()`** - Checks if the current user is an administrator
- **`has_internal_role(allowed_roles)`** - Verifies user has specific internal organization roles
- **`can_manage_work_orders()`** - Checks work order management permissions
- **`can_view_financial_data()`** - Checks financial data access permissions
- **`get_user_organizations_with_roles()`** - Returns user's organizations and roles

### Email System

Functions that trigger automated email notifications through the Edge Function integration.

- **`queue_message_notifications()`** - Queues email notifications for new work order messages
- **`call_send_email_trigger(template_name, record_id, record_type, context_data)`** - Calls the send-email Edge Function
- **`monitor_email_queue()`** - Returns email queue health status and metrics
- **`trigger_send_email(template_name, record_id, record_type)`** - Legacy email trigger function

### Work Order Management

Functions that automate work order completion detection and lifecycle management.

- **`generate_work_order_number_v2(org_id, location_code)`** - Generates partner-specific work order numbers
- **`transition_work_order_status(work_order_id, new_status, reason, user_id)`** - Safely transitions work order status
- **`sync_work_order_assignment()`** - Trigger function to sync assignment data
- **`auto_update_assignment_status()`** - Automatically updates status when assignments are created

### System Maintenance

Utility functions for numbering, analytics, and system management.

- **`generate_next_location_number(org_id)`** - Generates sequential location numbers for organizations
- **`refresh_analytics_views()`** - Refreshes materialized views for analytics
- **`get_user_type_secure(user_uuid)`** - Securely retrieves a user's type
- **`validate_security_setup()`** - Validates RLS configuration across all tables
- **`test_basic_db_operations()`** - Tests basic database connectivity and operations
- **`initialize_all_user_jwt_metadata()`** - Syncs JWT metadata for all users

### Database Seeding

Functions for managing test data in development environments.

- **`setup_bulletproof_test_data()`** - Populates the database with comprehensive test data
- **`complete_test_environment_setup()`** - Completes test environment setup with real admin context

### Audit & Triggers

Functions that handle change tracking and automated database operations.

- **`handle_new_user_bulletproof()`** - Creates user profiles and organization memberships for new auth users
- **`sync_auth_user_metadata()`** - Syncs user metadata to auth.users for JWT tokens
- **`trigger_work_order_created()`** - Triggers email notification when work orders are created
- **`trigger_work_order_assigned()`** - Triggers email notification when work orders are assigned
- **`validate_organization_role()`** - Validates organization role assignments

## Edge Functions

### send-email

**Endpoint:** `https://inudoymofztrvxhrlrek.supabase.co/functions/v1/send-email`

Unified email handler for all transactional and authentication emails.

**Features:**
- Integrates with Resend API for reliable delivery
- Supports 9+ email templates with dynamic variable substitution
- Logs all emails in the `email_logs` table
- Handles both test mode and production sending

**Request Format:**
```json
{
  "template_name": "work_order_created",
  "record_id": "uuid",
  "record_type": "work_order",
  "custom_data": {}
}
```

**Supported Templates:**
- `work_order_created` - New work order notifications
- `work_order_assigned` - Assignment notifications
- `work_order_completed` - Completion notifications
- `report_submitted` - Report submission notifications
- `report_reviewed` - Report review notifications
- `password_reset` - Password reset emails
- `user_welcome` - Welcome emails for new users

### process-email-queue

**Endpoint:** `https://inudoymofztrvxhrlrek.supabase.co/functions/v1/process-email-queue`

Batch processes queued emails for reliable, asynchronous delivery.

**Features:**
- Automated processing every 5 minutes via pg_cron
- Queue management with retry logic
- Database function integration
- Processing history logging

**Response Format:**
```json
{
  "success": true,
  "processed_count": 5,
  "failed_count": 0,
  "messages": ["Processed 5 emails successfully"]
}
```

### create-admin-user

**Endpoint:** `https://inudoymofztrvxhrlrek.supabase.co/functions/v1/create-admin-user`

Creates user accounts via the admin interface with role-based organization assignment.

**Features:**
- Requires admin authentication
- Generates confirmation links via Supabase Admin API
- Calls send-email for welcome emails
- Manages user profiles and organization memberships

**Request Format:**
```json
{
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "organization_id": "uuid",
  "role": "member",
  "send_welcome_email": true
}
```

### password-reset-email

**Endpoint:** `https://inudoymofztrvxhrlrek.supabase.co/functions/v1/password-reset-email`

Handles password reset requests, bypassing Supabase's default email system.

**Features:**
- Securely generates magic links using Supabase Admin API
- Calls send-email with the `password_reset` template
- Always returns success for security (prevents email enumeration)

**Request Format:**
```json
{
  "email": "user@example.com"
}
```

### setup-test-environment

**Endpoint:** `https://inudoymofztrvxhrlrek.supabase.co/functions/v1/setup-test-environment`

Sets up the complete test environment, including database seeding and user creation.

**Features:**
- Publicly accessible (verify_jwt = false)
- Performs comprehensive environment setup
- Includes detailed logging and error handling
- Creates organizations, users, work orders, and relationships

**Response Format:**
```json
{
  "success": true,
  "message": "Test environment setup completed",
  "data": {
    "organizations_created": 6,
    "users_created": 3,
    "work_orders_created": 5
  }
}
```

## Authentication

### Database Functions
Most database functions use Row Level Security (RLS) and require authenticated users. Functions check user permissions through:
- `auth.uid()` for current user context
- Organization membership verification
- Role-based access control

### Edge Functions
- Most Edge Functions require JWT authentication via `Authorization: Bearer <token>` header
- `setup-test-environment` is public (no JWT required)
- Admin-only functions verify internal organization membership with admin role

## Error Handling

### Database Functions
- Return structured JSONB responses with success/error status
- Include detailed error messages and context
- Use exception handling to prevent transaction rollbacks

### Edge Functions
- Return HTTP status codes (200, 400, 401, 500)
- Include CORS headers for web application integration
- Provide structured JSON error responses

## Integration Points

The database functions and Edge Functions work together to provide:
- **Email Notifications**: Database triggers call Edge Functions for email delivery
- **User Management**: Edge Functions create users and sync metadata to database
- **Work Order Lifecycle**: Database functions manage status while Edge Functions handle notifications
- **Queue Processing**: Edge Functions process email queues populated by database triggers

For detailed implementation examples and advanced usage, refer to the comprehensive documentation in [DATABASE_FUNCTIONS.md](./DATABASE_FUNCTIONS.md) and [EDGE_FUNCTIONS.md](./EDGE_FUNCTIONS.md).