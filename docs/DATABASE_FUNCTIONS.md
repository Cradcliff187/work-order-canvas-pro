# WorkOrderPro Database Functions Documentation

## Overview

WorkOrderPro uses PostgreSQL functions to implement authentication helpers, audit logging, analytics, and utility operations. All functions are designed with security, performance, and maintainability in mind.

## Function Categories

### Auth Helper Functions (9)
SECURITY DEFINER functions that provide safe access to user context for RLS policies

### Trigger Functions (5)  
Functions executed by database triggers for audit logging, user profile creation, work order numbering, and status transitions

### Email Notification Functions (4)
SECURITY DEFINER functions that call edge functions for automated email notifications

### Database Seeding Functions (2)
SECURITY DEFINER functions for secure test data management and development workflow

### Utility Functions (6)
General-purpose functions for work order numbering, invoice numbering, analytics view management, and data cleanup

### Work Order Completion Functions (4)
Automatic completion detection and manual override functions for work order lifecycle management

### Analytics Functions (3)  
Business intelligence functions for reporting and performance metrics

## Auth Helper Functions

These functions avoid infinite recursion in RLS policies by providing secure access to user context through SECURITY DEFINER.

### auth_user_id()
**Purpose**: Safely retrieve the current authenticated user's UUID  
**Returns**: UUID of current user or NULL if not authenticated  
**Migration**: `20250711000000_fix_rls_infinite_recursion.sql`  
**Usage**: Primary function for getting user context in RLS policies

### auth_profile_id()
**Purpose**: Get the internal profile ID for the current user  
**Returns**: UUID of user's profile record or NULL  
**Migration**: `20250711000000_fix_rls_infinite_recursion.sql`  
**Usage**: Links Supabase Auth users to internal profile system

### auth_user_type()
**Purpose**: Determine the user type (role) of the current user  
**Returns**: 'admin', 'partner', 'subcontractor', or 'employee' (defaults to 'subcontractor')  
**Migration**: `20250711000000_fix_rls_infinite_recursion.sql`  
**Usage**: Core function for role-based access control

### auth_is_admin()
**Purpose**: Quick check if current user is an admin  
**Returns**: TRUE if user is admin, FALSE otherwise  
**Migration**: `20250711000000_fix_rls_infinite_recursion.sql`  
**Usage**: Simplified admin access checks in RLS policies

### auth_user_organizations()
**Purpose**: Get all organizations the current user belongs to  
**Returns**: Table of organization UUIDs  
**Migration**: `20250711000000_fix_rls_infinite_recursion.sql`  
**Usage**: Multi-tenant access control for partners

### auth_user_belongs_to_organization(org_id uuid)
**Purpose**: Check if current user belongs to a specific organization  
**Parameters**: `org_id` - UUID of organization to check  
**Returns**: TRUE if user belongs to organization  
**Migration**: `20250711000000_fix_rls_infinite_recursion.sql`  
**Usage**: Organization-scoped data access for partners

### auth_user_assigned_to_work_order(wo_id uuid)
**Purpose**: Check if current user is assigned to a specific work order  
**Parameters**: `wo_id` - UUID of work order to check  
**Returns**: TRUE if user is assigned to the work order  
**Migration**: `20250711000000_fix_rls_infinite_recursion.sql`  
**Usage**: Work order access control for subcontractors

### auth_user_organization_assignments()
**Purpose**: Get all work orders assigned to the current user's organizations  
**Returns**: Table of work order UUIDs assigned to user's organizations  
**Migration**: `20250711000000_fix_rls_infinite_recursion.sql`  
**Usage**: Organization-level work order access control enabling company-wide collaboration  
**Business Impact**: Enables team-based work orders where any organization member can work on assigned jobs

### auth_user_can_view_assignment(assignment_id uuid)
**Purpose**: Check if current user can view a specific work order assignment  
**Parameters**: `assignment_id` - UUID of assignment to check  
**Returns**: TRUE if user can view the assignment  
**Migration**: `20250711000000_fix_rls_infinite_recursion.sql`  
**Usage**: Assignment access control and UI permission checks  
**Logic**: 
- Admins can view all assignments
- Users can view assignments they are directly assigned to
- Partners can view assignments for their organization's work orders

## Email Notification Functions

These functions use `call_send_email_trigger()` to call the unified send-email Edge Function for automated email delivery through Resend API.

### notify_work_order_created()
**Purpose**: Send email notification when new work orders are created  
**Trigger**: `trigger_work_order_created_email` on `work_orders` table (AFTER INSERT)  
**Migration**: `20250710230712-6f4c4413-17f5-4e75-845b-4b51d7a6ecd1.sql`  
**Edge Function**: `send-email` (handles all email templates)  
**Recipients**: System administrators and relevant stakeholders  
**Usage**: Automatic notification when partners submit new work orders

### notify_report_submitted()
**Purpose**: Send email notification when subcontractors submit work order reports  
**Trigger**: `trigger_report_submitted_email` on `work_order_reports` table (AFTER INSERT)  
**Migration**: `20250710230712-6f4c4413-17f5-4e75-845b-4b51d7a6ecd1.sql`  
**Edge Function**: `send-email` (handles all email templates)  
**Recipients**: Administrators and report reviewers  
**Usage**: Immediate notification when work completion reports are submitted

### notify_report_reviewed()
**Purpose**: Send email notification when work order reports are reviewed  
**Trigger**: `trigger_report_reviewed_email` on `work_order_reports` table (AFTER UPDATE OF status)  
**Migration**: `20250710230712-6f4c4413-17f5-4e75-845b-4b51d7a6ecd1.sql`  
**Edge Function**: `send-email` (handles all email templates)  
**Recipients**: Subcontractor who submitted the report  
**Usage**: Notify subcontractors of report approval or rejection with admin notes

### notify_user_welcome()
**Purpose**: Send welcome email when new user profiles are created  
**Trigger**: `trigger_user_welcome_email` on `profiles` table (AFTER INSERT)  
**Migration**: `20250710230712-6f4c4413-17f5-4e75-845b-4b51d7a6ecd1.sql`  
**Edge Function**: `send-email` (handles all email templates)  
**Recipients**: Newly created user  
**Usage**: Onboard new users with welcome message and account setup instructions

## Database Seeding Functions

### seed_test_data()
**Purpose**: Populate database with comprehensive test data for development and testing  
**Migration**: `20250710181921-900e8014-cac5-4d3f-982c-d62087a92d90.sql`  
**Security**: Admin-only access with safety checks  
**Usage**: `await supabase.rpc('seed_test_data')`  
**Returns**: JSON response with detailed creation counts and testing scenarios  
**Business Impact**: Enables rapid development and testing with realistic data scenarios

### clear_test_data()
**Purpose**: Safely remove test data while preserving production data  
**Migration**: `20250710181921-900e8014-cac5-4d3f-982c-d62087a92d90.sql`  
**Security**: Admin-only access with multiple safety checks  
**Usage**: `await supabase.rpc('clear_test_data')`  
**Returns**: Success status with detailed deletion counts and safety verification  
**Business Impact**: Clean slate for testing without affecting real data

## Trigger Functions

### handle_new_user_robust()
**Purpose**: Automatically create user profiles when new users sign up  
**Trigger**: `trigger_create_profile_on_signup` on `auth.users` table (AFTER INSERT)  
**Migration**: `20250711000000_fix_rls_infinite_recursion.sql`  
**Usage**: Seamless user onboarding with proper profile creation  
**Error Handling**: Race condition safe with conflict resolution

### audit_trigger_function()
**Purpose**: Comprehensive audit logging for all database changes  
**Migration**: `20250711000002_add_audit_triggers.sql`  
**Usage**: Automatic tracking of all INSERT, UPDATE, DELETE operations  
**Security**: Tracks user, timestamp, and data changes for compliance

### auto_populate_assignment_organization()
**Purpose**: Automatically set organization ID when assigning work orders  
**Trigger**: On `work_order_assignments` table (BEFORE INSERT)  
**Migration**: `20250711031041-b59d9270-6e16-4c67-86dc-92bb0ae89118.sql`  
**Usage**: Streamlines assignment workflow by auto-populating organization data

### auto_update_assignment_status()
**Purpose**: Transition work order status when assignments are created  
**Trigger**: On `work_order_assignments` table (AFTER INSERT)  
**Migration**: `20250711031041-b59d9270-6e16-4c67-86dc-92bb0ae89118.sql`  
**Usage**: Automatic status progression from 'received' to 'assigned'

### auto_update_report_status_enhanced()
**Purpose**: Enhanced status transitions based on report submissions  
**Trigger**: On `work_order_reports` table (AFTER INSERT/UPDATE)  
**Migration**: `20250711054041-e37d03d0-58b8-4a58-89af-a7060fdf1238.sql`  
**Usage**: Intelligent work order completion detection with assignment model support

## Utility Functions

### generate_work_order_number_v2(org_id uuid, location_number text)
**Purpose**: Generate partner-specific work order numbers with organization initials  
**Parameters**: Organization ID and optional location number  
**Returns**: JSON with work order number and metadata  
**Migration**: `20250711032635-88945574-99a3-4df1-b080-20b8d4f51598.sql`  
**Usage**: Automatic work order numbering during creation  
**Format**: `ORG-LOC-001` (e.g., `ABC-001-001`)

### generate_internal_invoice_number()
**Purpose**: Generate sequential internal invoice numbers  
**Returns**: String with year and sequence (e.g., `2025-0001`)  
**Migration**: `20250711042133-79b08133-7513-490e-913e-9b4adbc6db45.sql`  
**Usage**: Automatic invoice numbering for tracking and organization

### transition_work_order_status(work_order_id, new_status, reason, user_id)
**Purpose**: Safely transition work order status with audit logging  
**Parameters**: Work order ID, new status, optional reason and user ID  
**Returns**: Boolean success indicator  
**Migration**: `20250711031041-b59d9270-6e16-4c67-86dc-92bb0ae89118.sql`  
**Usage**: Centralized status management with proper validation and logging

### refresh_analytics_views()
**Purpose**: Refresh materialized views for analytics dashboards  
**Migration**: `20250710181921-900e8014-cac5-4d3f-982c-d62087a92d90.sql`  
**Usage**: Periodic refresh of performance metrics and reporting data  
**Business Impact**: Ensures analytics dashboards show current data

### get_user_type_secure(user_uuid)
**Purpose**: Securely get user type with UUID parameter  
**Parameters**: User UUID (optional, defaults to current user)  
**Returns**: User type enum  
**Migration**: `20250711000000_fix_rls_infinite_recursion.sql`  
**Usage**: Safe user type checking for administrative functions

### is_admin()
**Purpose**: Legacy admin check function (deprecated)  
**Migration**: `20250711000000_fix_rls_infinite_recursion.sql`  
**Usage**: Use `auth_is_admin()` instead for consistency

## Work Order Completion Functions

### check_assignment_completion_status_enhanced(work_order_id)
**Purpose**: Enhanced completion status check with assignment model support  
**Parameters**: Work order ID  
**Returns**: Boolean indicating if work order should be marked complete  
**Migration**: `20250711054041-e37d03d0-58b8-4a58-89af-a7060fdf1238.sql`  
**Usage**: Automatic completion detection supporting both legacy and new assignment models  
**Logic**: Checks for approved reports from all lead assignees

### set_manual_completion_block(work_order_id, blocked)
**Purpose**: Allow administrators to manually block or unblock automatic completion  
**Parameters**: Work order ID and blocked status (default true)  
**Migration**: `20250711054041-e37d03d0-58b8-4a58-89af-a7060fdf1238.sql`  
**Usage**: Administrative override for work orders requiring manual review  
**Business Impact**: Prevents premature completion for complex work orders

### trigger_completion_email(work_order_id)
**Purpose**: Send completion email notification using edge function integration  
**Parameters**: Work order ID  
**Migration**: `20250711054041-e37d03d0-58b8-4a58-89af-a7060fdf1238.sql`  
**Usage**: Automatic notification when work orders are completed  
**Integration**: Calls `email-work-order-completed` edge function

## Analytics Functions

### calculate_completion_time_by_trade(start_date, end_date)
**Purpose**: Calculate average completion times grouped by trade  
**Parameters**: Date range (defaults to last 30 days)  
**Returns**: Table with trade name, average hours, and order counts  
**Migration**: `20250711054041-e37d03d0-58b8-4a58-89af-a7060fdf1238.sql`  
**Usage**: Performance analytics for trade-specific metrics  
**Business Impact**: Identifies efficient trades and optimization opportunities

### calculate_first_time_fix_rate(start_date, end_date)
**Purpose**: Calculate percentage of work orders completed on first visit  
**Parameters**: Date range (defaults to last 30 days)  
**Returns**: Numeric percentage (0-100)  
**Migration**: `20250711054041-e37d03d0-58b8-4a58-89af-a7060fdf1238.sql`  
**Usage**: Quality metrics for service delivery  
**Business Impact**: Measures efficiency and customer satisfaction

### get_geographic_distribution(start_date, end_date)
**Purpose**: Analyze work order distribution by location  
**Parameters**: Date range (defaults to last 30 days)  
**Returns**: Table with state, city, work order count, and average completion hours  
**Migration**: `20250711054041-e37d03d0-58b8-4a58-89af-a7060fdf1238.sql`  
**Usage**: Geographic analysis for resource allocation  
**Business Impact**: Informs regional staffing and service area decisions

## Edge Functions

### create-test-users
**Purpose**: Create authenticated test users for comprehensive role-based testing  
**Location**: `supabase/functions/create-test-auth-users/index.ts`  
**Security**: Multiple admin authentication methods (service role, bearer token, dev mode)  
**Usage**: DevTools integration or direct API calls  
**Features**: Creates 5 test users across all roles with proper organization linking  
**Returns**: Detailed user creation results with authentication credentials

## System Architecture

**Email Integration**: Automated email notifications using Supabase Auth through Edge Functions  
**Security Model**: SECURITY DEFINER functions prevent RLS recursion while maintaining access control  
**Audit System**: Comprehensive change tracking with user attribution and timestamp logging  
**Analytics**: Real-time business intelligence with materialized views for performance  
**Testing Framework**: Complete test data lifecycle with safety checks and realistic scenarios
  "users": [
    {
      "email": "partner1@abc.com",
      "password": "Test123!",
      "user_type": "partner",
      "organization": "ABC Property Management",
      "created": true
    }
  ],
  "summary": {
    "total_attempted": 5,
    "total_created": 5,
    "total_failed": 0
  }
}
```

### Troubleshooting Constraint Violations

**work_order_attachments_check Constraint**:
The constraint ensures attachments link to either a work order OR a report, but never both:

```sql
-- ✅ CORRECT: Link to work order only
INSERT INTO work_order_attachments (work_order_id, work_order_report_id, ...)
VALUES ('work-order-uuid', NULL, ...);

-- ✅ CORRECT: Link to report only  
INSERT INTO work_order_attachments (work_order_id, work_order_report_id, ...)
VALUES (NULL, 'report-uuid', ...);

-- ❌ WRONG: Link to both (violates constraint)
INSERT INTO work_order_attachments (work_order_id, work_order_report_id, ...)
VALUES ('work-order-uuid', 'report-uuid', ...);
```

**Common Seeding Errors**:
- **Constraint Violations**: Use the enhanced function that handles constraints properly
- **Admin Authentication**: Ensure you're logged in as an admin before seeding
- **RLS Violations**: Use SECURITY DEFINER functions, not client-side operations

## Trigger Functions

### audit_trigger_function()

**Purpose**: Comprehensive audit logging for all database changes

```sql
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Handle INSERT operations
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (
      table_name, record_id, action, new_values, user_id
    ) VALUES (
      TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW), public.auth_user_id()
    );
    RETURN NEW;
  END IF;

  -- Handle UPDATE operations  
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (
      table_name, record_id, action, old_values, new_values, user_id
    ) VALUES (
      TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), public.auth_user_id()
    );
    RETURN NEW;
  END IF;

  -- Handle DELETE operations
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (
      table_name, record_id, action, old_values, user_id
    ) VALUES (
      TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD), public.auth_user_id()
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the main operation
  RAISE WARNING 'Audit trigger failed for table %: %', TG_TABLE_NAME, SQLERRM;
  RETURN COALESCE(NEW, OLD);
END;
$$;
```

**Trigger Context**: Used by audit triggers on 11 tables  
**Features**: 
- Captures all INSERT, UPDATE, DELETE operations
- Stores complete before/after state as JSON
- Links changes to authenticated users
- Error-resilient (failures don't block main operations)

### handle_new_user_robust()

**Purpose**: Automatically create user profiles when new users sign up

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user_robust()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Insert profile with race condition handling
  INSERT INTO public.profiles (
    user_id, email, first_name, last_name, user_type
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(
      (NEW.raw_user_meta_data->>'user_type')::public.user_type, 
      'subcontractor'::public.user_type
    )
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the auth process
  RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;
```

**Trigger**: Fires after INSERT on auth.users  
**Features**:
- Extracts user data from Supabase Auth metadata
- Handles race conditions with ON CONFLICT
- Defaults user_type to 'subcontractor'
- Error-resilient (doesn't block user signup)

## Database Seeding Functions

WorkOrderPro includes secure database seeding functions that use SECURITY DEFINER privileges to bypass RLS policies and provide comprehensive test data management for development workflows.

### seed_test_data()

**Purpose**: Securely populate database with comprehensive test data for development and testing

```sql
CREATE OR REPLACE FUNCTION public.seed_test_data()
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result json;
  v_user_id uuid;
  existing_admin_profile_id uuid;
  -- ... additional variables
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  -- Verify user is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = v_user_id 
    AND user_type = 'admin'
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Unauthorized: Admin access required'
    );
  END IF;

  -- Create comprehensive test data
  -- ... implementation details
END;
$$;
```

**Security Model**:
- **SECURITY DEFINER**: Executes with owner privileges, bypassing RLS
- **Admin Validation**: Requires authenticated admin user
- **Atomic Operations**: Complete transaction rollback on any failure
- **Audit Trail**: All operations logged in audit_logs table

**Usage**:
```typescript
const { data, error } = await supabase.rpc('seed_test_data');

if (error) {
  console.error('Seeding failed:', error);
} else {
  console.log('Seeding successful:', data.details);
}
```

**Return Value**:
```json
{
  "success": true,
  "message": "Test data seeded successfully (admin user only)",
  "details": {
    "organizations": 8,
    "trades": 10,
    "email_templates": 5,
    "profiles": 1,
    "user_organizations": 1,
    "partner_locations": 10,
    "work_orders": 16
  }
}
```

### clear_test_data()

**Purpose**: Safely remove test data with comprehensive cleanup and foreign key safety

```sql
CREATE OR REPLACE FUNCTION public.clear_test_data()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  result jsonb := '{}';
  deleted_counts jsonb := '{}';
  test_user_ids uuid[];
  test_org_ids uuid[];
  test_work_order_ids uuid[];
BEGIN
  -- Only allow admins to execute this function
  IF NOT public.auth_is_admin() THEN
    RAISE EXCEPTION 'Only administrators can clear test data';
  END IF;

  -- Safely identify test data using patterns
  -- ... comprehensive cleanup implementation
END;
$$;
```

**Safety Features**:
- **Pattern-Based Identification**: Uses email patterns and known test names
- **Foreign Key Safety**: Deletes in proper order to avoid violations
- **Admin-Only Access**: Restricted to authenticated admin users
- **Comprehensive Cleanup**: Removes all related data across tables

**Test Data Patterns**:
- Emails: `%@testcompany%`, `%@example.com`, `%test%`
- Organizations: Known test organization names
- Users: First name = 'Test'

**Usage**:
```typescript
const { data, error } = await supabase.rpc('clear_test_data');

if (error) {
  console.error('Cleanup failed:', error);
} else {
  console.log('Cleanup successful:', data.deleted_counts);
}
```

**Return Value**:
```json
{
  "success": true,
  "message": "Test data cleared successfully",
  "deleted_counts": {
    "email_logs": 0,
    "work_order_attachments": 0,
    "work_order_reports": 0,
    "work_order_assignments": 0,
    "employee_reports": 0,
    "work_orders": 16,
    "partner_locations": 10,
    "user_organizations": 1,
    "organizations": 7,
    "profiles": 0
  },
  "test_user_count": 0,
  "test_org_count": 7,
  "test_work_order_count": 16
}
```

**Business Impact**: 
- **Development Efficiency**: Quick database reset for testing
- **Data Integrity**: Safe cleanup without breaking foreign key constraints
- **Team Collaboration**: Consistent test data across development environments

## Utility Functions

### generate_work_order_number()

**Purpose**: Generate unique, sequential work order numbers by year

```sql
CREATE OR REPLACE FUNCTION public.generate_work_order_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  current_year TEXT;
  sequence_num INTEGER;
  work_order_num TEXT;
BEGIN
  current_year := EXTRACT(YEAR FROM now())::TEXT;
  
  SELECT COALESCE(MAX(
    CASE 
      WHEN work_order_number ~ ('^WO-' || current_year || '-[0-9]+$')
      THEN CAST(SUBSTRING(work_order_number FROM LENGTH('WO-' || current_year || '-') + 1) AS INTEGER)
      ELSE 0
    END
  ), 0) + 1
  INTO sequence_num
  FROM public.work_orders;
  
  work_order_num := 'WO-' || current_year || '-' || LPAD(sequence_num::TEXT, 4, '0');
  
  RETURN work_order_num;
END;
$$;
```

**Returns**: Formatted work order number (e.g., "WO-2025-0001")  
**Usage**: Called when creating new work orders  
**Format**: WO-{YEAR}-{4-digit-sequence}

### generate_work_order_number_v2()

**Purpose**: Generate partner-specific work order numbers using organization initials and location with enhanced error handling

```sql
CREATE OR REPLACE FUNCTION public.generate_work_order_number_v2(
  org_id uuid,
  location_number text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  org_initials text;
  sequence_num integer;
  work_order_num text;
  fallback_num text;
  org_name text;
BEGIN
  -- Get organization details and lock row for sequence update
  SELECT initials, name INTO org_initials, org_name
  FROM public.organizations 
  WHERE id = org_id AND is_active = true
  FOR UPDATE;
  
  -- If organization not found
  IF org_name IS NULL THEN
    RAISE EXCEPTION 'Organization not found or inactive: %', org_id;
  END IF;
  
  -- Get and increment sequence number atomically
  UPDATE public.organizations 
  SET next_sequence_number = next_sequence_number + 1
  WHERE id = org_id
  RETURNING next_sequence_number - 1 INTO sequence_num;
  
  -- Generate fallback number
  fallback_num := public.generate_work_order_number();
  
  -- If initials are missing or empty, return warning with fallback
  IF org_initials IS NULL OR org_initials = '' THEN
    RETURN jsonb_build_object(
      'work_order_number', fallback_num,
      'is_fallback', true,
      'warning', 'Organization "' || org_name || '" needs initials for smart numbering. Using fallback number.',
      'organization_name', org_name,
      'requires_initials', true
    );
  END IF;
  
  -- Build work order number based on location presence
  IF location_number IS NOT NULL AND location_number != '' THEN
    work_order_num := org_initials || '-' || location_number || '-' || LPAD(sequence_num::text, 3, '0');
  ELSE
    work_order_num := org_initials || '-' || LPAD(sequence_num::text, 4, '0');
  END IF;
  
  RETURN jsonb_build_object(
    'work_order_number', work_order_num,
    'is_fallback', false,
    'organization_name', org_name,
    'requires_initials', false
  );
EXCEPTION
  WHEN NO_DATA_FOUND THEN
    RAISE EXCEPTION 'Organization not found or inactive: %', org_id;
  WHEN OTHERS THEN
    -- If anything else fails, return fallback with error info
    RAISE WARNING 'Work order numbering failed for org %: %, using fallback', org_id, SQLERRM;
    RETURN jsonb_build_object(
      'work_order_number', public.generate_work_order_number(),
      'is_fallback', true,
      'warning', 'Work order numbering system encountered an error. Using fallback number.',
      'error', SQLERRM,
      'requires_initials', false
    );
END;
$$;
```

**Parameters:**
- `org_id` (uuid) - Organization ID for initials lookup
- `location_number` (text, optional) - Location number for location-specific numbering

**Returns**: Structured JSON response with enhanced error handling  
**Response Format:**
```json
{
  "work_order_number": "ABC-504-001",
  "is_fallback": false,
  "organization_name": "Organization Name",
  "requires_initials": false
}
```

**Response Fields:**
- `work_order_number` (text) - The generated work order number
- `is_fallback` (boolean) - Whether fallback numbering was used
- `organization_name` (text) - Name of the organization
- `requires_initials` (boolean) - Whether organization needs initials set
- `warning` (text, optional) - User-friendly warning message
- `error` (text, optional) - Technical error details

**Number Format:**
- With location: `INITIALS-LOCATION-SEQUENCE` (e.g., "ABC-504-001")
- Without location: `INITIALS-SEQUENCE` (e.g., "ABC-0001")
- Fallback: `WO-YYYY-NNNN` (e.g., "WO-2025-0001")

**Features:**
- Uses per-organization sequence numbers from `organizations.next_sequence_number`
- Atomic sequence increment with SELECT...FOR UPDATE for concurrency safety
- Graceful fallback to legacy numbering when organization initials are missing
- Structured error responses for better user experience
- Enhanced logging for troubleshooting

**Usage Examples:**
```sql
-- With location and organization initials
SELECT generate_work_order_number_v2('org-uuid', '504');
-- Returns: {"work_order_number": "ABC-504-001", "is_fallback": false, ...}

-- Without location  
SELECT generate_work_order_number_v2('org-uuid', NULL);
-- Returns: {"work_order_number": "ABC-0001", "is_fallback": false, ...}

-- Organization without initials (fallback)
SELECT generate_work_order_number_v2('no-initials-org-uuid', '504');
-- Returns: {"work_order_number": "WO-2025-0001", "is_fallback": true, "warning": "...", ...}
```

**Error Handling:**
- Returns structured warnings for missing organization initials
- Graceful fallback to legacy numbering system
- Comprehensive error logging for monitoring
- User-friendly error messages for UI display

### update_updated_at_column()

**Purpose**: Trigger function to automatically update timestamp columns

```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
```

**Usage**: Applied to tables with updated_at columns  
**Trigger**: BEFORE UPDATE on multiple tables

### generate_work_order_number_simple()

**Purpose**: Simple wrapper function for backward compatibility

```sql
CREATE OR REPLACE FUNCTION public.generate_work_order_number_simple(
  org_id uuid,
  location_number text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  result jsonb;
BEGIN
  result := public.generate_work_order_number_v2(org_id, location_number);
  RETURN result->>'work_order_number';
END;
$$;
```

**Parameters:**
- `org_id` (uuid) - Organization ID for initials lookup
- `location_number` (text, optional) - Location number for location-specific numbering

**Returns**: Work order number as text (extracts from v2 JSON response)  
**Usage**: For code that needs simple text return instead of structured JSON

### trigger_generate_work_order_number_v2()

**Purpose**: Enhanced trigger function for automatic work order number generation with structured error handling

```sql
CREATE OR REPLACE FUNCTION public.trigger_generate_work_order_number_v2()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  numbering_result jsonb;
BEGIN
  -- Only generate if work_order_number is not already set
  IF NEW.work_order_number IS NULL OR NEW.work_order_number = '' THEN
    BEGIN
      -- Use organization_id (submitter) for numbering by default
      -- Use partner_location_number if provided
      numbering_result := public.generate_work_order_number_v2(
        NEW.organization_id,
        NEW.partner_location_number
      );
      
      -- Extract the work order number from the result
      NEW.work_order_number := numbering_result->>'work_order_number';
      
      -- Log warnings or errors for monitoring
      IF numbering_result->>'is_fallback' = 'true' THEN
        RAISE WARNING 'Work order % using fallback numbering: %', 
          NEW.id, numbering_result->>'warning';
      END IF;
      
    EXCEPTION
      WHEN OTHERS THEN
        -- Ultimate fallback to legacy system
        RAISE WARNING 'Advanced work order numbering failed (%), falling back to legacy numbering', SQLERRM;
        NEW.work_order_number := public.generate_work_order_number();
    END;
  END IF;
  
  RETURN NEW;
END;
$$;
```

**Trigger**: `trigger_work_order_number_v2` on `work_orders` table BEFORE INSERT  
**Features:**
- Automatic work order number generation on insert
- Uses enhanced v2 numbering with structured error handling
- Extracts work order number from JSON response
- Logs fallback warnings for monitoring and troubleshooting
- Falls back to legacy WO-YYYY-NNNN format if advanced numbering fails
- Only generates numbers if not already provided
- Multiple layers of error resilience

### refresh_analytics_views()

**Purpose**: Refresh materialized views for analytics

```sql
CREATE OR REPLACE FUNCTION public.refresh_analytics_views()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW public.mv_work_order_analytics;
  REFRESH MATERIALIZED VIEW public.mv_subcontractor_performance;
END;
$$;
```

**Usage**: Called periodically to update analytics data  
**Performance**: Should be run during off-peak hours

### clear_test_data()

**Purpose**: Securely clear all test data with proper cascading deletion order and admin-only access

```sql
CREATE OR REPLACE FUNCTION public.clear_test_data()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  result jsonb := '{}';
  deleted_counts jsonb := '{}';
  test_user_ids uuid[];
  test_org_ids uuid[];
  test_work_order_ids uuid[];
BEGIN
  -- Only allow admins to execute this function
  IF NOT public.auth_is_admin() THEN
    RAISE EXCEPTION 'Only administrators can clear test data';
  END IF;

  -- Get test user IDs (based on test email patterns)
  SELECT array_agg(id) INTO test_user_ids
  FROM public.profiles 
  WHERE email LIKE '%@testcompany%' 
     OR email LIKE '%@example.com' 
     OR email LIKE '%test%'
     OR first_name = 'Test';

  -- Get test organization IDs (based on test name patterns)
  SELECT array_agg(id) INTO test_org_ids
  FROM public.organizations 
  WHERE name IN (
    'ABC Property Management', 'XYZ Commercial Properties', 
    'Premium Facilities Group', 'Pipes & More Plumbing',
    'Sparks Electric', 'Cool Air HVAC', 'Wood Works Carpentry',
    'Brush Strokes Painting', 'Fix-It Maintenance', 
    'Green Thumb Landscaping'
  );

  -- Delete in proper cascading order
  -- [Deletion steps omitted for brevity - see function implementation]

  -- Return summary
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Test data cleared successfully',
    'deleted_counts', deleted_counts,
    'test_user_count', array_length(test_user_ids, 1),
    'test_org_count', array_length(test_org_ids, 1),
    'test_work_order_count', array_length(test_work_order_ids, 1)
  );

EXCEPTION WHEN OTHERS THEN
  -- Return error details
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'message', 'Failed to clear test data'
  );
END;
$$;
```

**Returns**: Structured JSON response with deletion summary  
**Response Format:**
```json
{
  "success": true,
  "message": "Test data cleared successfully",
  "deleted_counts": {
    "email_logs": 45,
    "work_order_reports": 12,
    "work_orders": 8,
    "profiles": 5
  },
  "test_user_count": 5,
  "test_org_count": 3,
  "test_work_order_count": 8
}
```

**Security Features:**
- **Admin-only access**: Restricted to administrators using `auth_is_admin()`
- **SECURITY DEFINER**: Runs with elevated privileges to bypass RLS restrictions
- **Pattern-based filtering**: Only deletes data matching specific test patterns
- **Cascading deletion**: Removes child records before parents to avoid foreign key conflicts

**Deletion Order (Cascade-Safe):**
1. Email logs (references work_orders)
2. Work order attachments (references work_orders, users)
3. Work order reports (references work_orders, users)
4. Work order assignments (references work_orders, users, organizations)
5. Employee reports (references work_orders, users)
6. Invoice work orders (references invoices, work_orders - CRITICAL: before work_orders)
7. Invoice attachments (references invoices, users)
8. Receipt allocations and receipts (references users)
9. Invoices (references organizations, users - after invoice_work_orders and invoice_attachments)
10. Work orders (references users, organizations - safe after invoice tables cleared)
11. Partner locations (references organizations)
12. User organization relationships (references users, organizations)
13. Organizations (test organizations)
14. Profiles (test users - cascade deletes auth.users)

**Test Data Patterns:**
- **Users**: Emails containing `@testcompany`, `@example.com`, `test`, or first name `Test`
- **Organizations**: Specific test organization names used in seeding
- **Work Orders**: All work orders created by, assigned to, or belonging to test entities

**Error Handling:**
- Returns structured error response on failure
- Logs technical error details for debugging
- Graceful handling of missing test data (no-op)
- Transaction rollback on any deletion failure

**Usage Examples:**
```sql
-- Clear all test data (admin only)
SELECT clear_test_data();

-- In application code
const { data } = await supabase.rpc('clear_test_data');
if (data.success) {
  console.log('Deleted:', data.deleted_counts);
} else {
  console.error('Error:', data.message);
}
```

**Related Functions:**
- Uses `auth_is_admin()` for access control
- Complements seeding functions for complete test lifecycle management
- Works with newly added DELETE RLS policies on `email_logs` and `profiles`

## Work Order Completion Functions

These functions manage automatic work order completion detection, email notifications, and manual overrides for completion behavior.

### 1. check_assignment_completion_status_enhanced(work_order_id uuid)

**Purpose**: Enhanced completion status check with both legacy and new assignment model support

```sql
CREATE OR REPLACE FUNCTION public.check_assignment_completion_status_enhanced(work_order_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  current_status work_order_status;
  lead_assignments_count INTEGER;
  completed_lead_reports INTEGER;
  total_assignments_count INTEGER;
  is_legacy_model boolean DEFAULT false;
  work_order_rec RECORD;
BEGIN
  -- Get current work order details
  SELECT status, auto_completion_blocked, assigned_to 
  INTO work_order_rec
  FROM work_orders 
  WHERE id = work_order_id;
  
  -- Exit early if work order not found
  IF work_order_rec IS NULL THEN
    RETURN FALSE;
  END IF;
  
  current_status := work_order_rec.status;
  
  -- Only check completion for in_progress work orders
  IF current_status != 'in_progress' THEN
    RETURN FALSE;
  END IF;
  
  -- Don't auto-complete if manually blocked
  IF work_order_rec.auto_completion_blocked = true THEN
    RETURN FALSE;
  END IF;
  
  -- Check if work order should be completed and trigger transition
  PERFORM public.transition_work_order_status(
    work_order_id,
    'completed'::work_order_status,
    'Auto-completed: All required assignees submitted approved reports'
  );
  
  -- Trigger completion email notification
  PERFORM public.trigger_completion_email(work_order_id);
  
  RETURN TRUE;
END;
$$;
```

**Parameters**: `work_order_id` - UUID of work order to check
**Returns**: TRUE if work order was completed, FALSE otherwise
**Features**:
- Handles both legacy (single assignee) and new (multi-assignee) models
- Checks for manually blocked auto-completion
- Only processes work orders in 'in_progress' status
- Automatically transitions to 'completed' status when requirements met
- Triggers email notifications upon completion
- Updates completion tracking fields

### 2. trigger_completion_email(work_order_id uuid)

**Purpose**: Send completion email notification using edge function integration

```sql
CREATE OR REPLACE FUNCTION public.trigger_completion_email(work_order_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Use pg_net to call the completion email edge function
  PERFORM net.http_post(
    url := 'https://inudoymofztrvxhrlrek.supabase.co/functions/v1/email-work-order-completed',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object('work_order_id', work_order_id)
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the completion process
    RAISE WARNING 'Failed to trigger completion email for work order %: %', work_order_id, SQLERRM;
END;
$$;
```

**Parameters**: `work_order_id` - UUID of completed work order
**Returns**: void
**Features**:
- Uses `pg_net.http_post` to call edge function
- Error-resilient (email failures don't block completion)
- Includes proper authorization headers
- Comprehensive error logging

### 3. auto_update_report_status_enhanced()

**Purpose**: Enhanced trigger function for automatic work order status transitions based on report submissions and approvals

```sql
CREATE OR REPLACE FUNCTION public.auto_update_report_status_enhanced()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  current_status work_order_status;
BEGIN
  -- Get current work order status
  SELECT status INTO current_status 
  FROM work_orders 
  WHERE id = NEW.work_order_id;
  
  -- When first report is submitted, transition to in_progress
  IF TG_OP = 'INSERT' AND current_status = 'assigned' THEN
    PERFORM public.transition_work_order_status(
      NEW.work_order_id,
      'in_progress'::work_order_status,
      'First report submitted by: ' || NEW.subcontractor_user_id
    );
  END IF;
  
  -- When report is approved, check if work order should be completed
  IF TG_OP = 'UPDATE' AND NEW.status = 'approved' AND OLD.status != 'approved' THEN
    PERFORM public.check_assignment_completion_status_enhanced(NEW.work_order_id);
  END IF;
  
  RETURN NEW;
END;
$$;
```

**Trigger Context**: Used by `trigger_auto_report_status` on work_order_reports table
**Features**:
- Transitions work orders from 'assigned' to 'in_progress' on first report submission
- Checks for completion eligibility when reports are approved
- Uses enhanced completion checking function
- Maintains audit trail through transition functions

### 4. set_manual_completion_block(work_order_id uuid, blocked boolean)

**Purpose**: Allow administrators to manually block or unblock automatic completion

```sql
CREATE OR REPLACE FUNCTION public.set_manual_completion_block(
  work_order_id uuid, 
  blocked boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Only admins can block/unblock auto-completion
  IF NOT public.auth_is_admin() THEN
    RAISE EXCEPTION 'Only administrators can modify completion settings';
  END IF;
  
  UPDATE work_orders 
  SET auto_completion_blocked = blocked,
      completion_method = CASE WHEN blocked THEN 'manual_override' ELSE completion_method END
  WHERE id = work_order_id;
  
  -- Log the action
  INSERT INTO audit_logs (
    table_name, record_id, action, new_values, user_id
  ) VALUES (
    'work_orders', work_order_id, 'COMPLETION_BLOCK_CHANGE',
    jsonb_build_object('auto_completion_blocked', blocked, 'changed_by', public.auth_profile_id()),
    public.auth_user_id()
  );
END;
$$;
```

**Parameters**: 
- `work_order_id` - UUID of work order to modify
- `blocked` - Whether to block automatic completion (default: true)
**Returns**: void
**Security**: Admin-only access
**Features**:
- Prevents automatic completion when blocked
- Updates completion method when blocking
- Creates audit log entry for the action
- Only accessible to administrators

**Completion Detection Logic**:

1. **Legacy Model Support**: Handles work orders with single assignee in `work_orders.assigned_to`
2. **New Assignment Model**: Supports multiple assignees with lead/support roles
3. **Automatic Triggers**: Reports approval automatically triggers completion checks
4. **Manual Override**: Administrators can block automatic completion
5. **Email Integration**: Completed work orders trigger notification emails
6. **Audit Trail**: All completion actions are logged for tracking

## Analytics Functions

### calculate_completion_time_by_trade()

**Purpose**: Calculate average completion times grouped by trade

```sql
CREATE OR REPLACE FUNCTION public.calculate_completion_time_by_trade(
  start_date date DEFAULT (CURRENT_DATE - '30 days'::interval), 
  end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  trade_name text, 
  avg_completion_hours numeric, 
  total_orders bigint, 
  completed_orders bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.name as trade_name,
    AVG(CASE 
      WHEN wo.completed_at IS NOT NULL AND wo.date_assigned IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (wo.completed_at - wo.date_assigned))/3600 
    END) as avg_completion_hours,
    COUNT(wo.id) as total_orders,
    COUNT(CASE WHEN wo.status = 'completed' THEN 1 END) as completed_orders
  FROM trades t
  LEFT JOIN work_orders wo ON wo.trade_id = t.id
  WHERE wo.date_submitted BETWEEN start_date AND end_date
  GROUP BY t.id, t.name
  ORDER BY avg_completion_hours ASC;
END;
$$;
```

**Parameters**: Optional date range (defaults to last 30 days)  
**Returns**: Trade performance metrics  
**Usage**: Performance reporting and trade analysis

### calculate_first_time_fix_rate()

**Purpose**: Calculate percentage of work orders completed on first visit

```sql
CREATE OR REPLACE FUNCTION public.calculate_first_time_fix_rate(
  start_date date DEFAULT (CURRENT_DATE - '30 days'::interval), 
  end_date date DEFAULT CURRENT_DATE
)
RETURNS numeric
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  fix_rate NUMERIC;
BEGIN
  SELECT 
    COUNT(CASE 
      WHEN report_count = 1 AND first_report_approved THEN 1 
    END) * 100.0 / NULLIF(COUNT(*), 0)
  INTO fix_rate
  FROM (
    SELECT 
      wo.id,
      COUNT(wor.id) as report_count,
      BOOL_AND(wor.status = 'approved') as first_report_approved
    FROM work_orders wo
    LEFT JOIN work_order_reports wor ON wor.work_order_id = wo.id
    WHERE wo.date_submitted BETWEEN start_date AND end_date
      AND wo.status = 'completed'
    GROUP BY wo.id
  ) report_stats;
  
  RETURN COALESCE(fix_rate, 0);
END;
$$;
```

**Parameters**: Optional date range (defaults to last 30 days)  
**Returns**: Percentage (0-100) of first-time fixes  
**Usage**: Quality metrics and performance KPIs

### get_geographic_distribution()

**Purpose**: Analyze work order distribution by location

```sql
CREATE OR REPLACE FUNCTION public.get_geographic_distribution(
  start_date date DEFAULT (CURRENT_DATE - '30 days'::interval), 
  end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  state text, 
  city text, 
  work_order_count bigint, 
  avg_completion_hours numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wo.state,
    wo.city,
    COUNT(wo.id) as work_order_count,
    AVG(CASE 
      WHEN wo.completed_at IS NOT NULL AND wo.date_assigned IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (wo.completed_at - wo.date_assigned))/3600 
    END) as avg_completion_hours
  FROM work_orders wo
  WHERE wo.date_submitted BETWEEN start_date AND end_date
    AND wo.state IS NOT NULL 
    AND wo.city IS NOT NULL
  GROUP BY wo.state, wo.city
  ORDER BY work_order_count DESC;
END;
$$;
```

**Parameters**: Optional date range (defaults to last 30 days)  
**Returns**: Geographic work order distribution  
**Usage**: Territory analysis and resource planning

## Function Usage Examples

### In RLS Policies
```sql
-- Example: Work order access policy
CREATE POLICY "Partners can view their organization work orders" 
ON work_orders FOR SELECT
USING (auth_user_type() = 'partner' AND auth_user_belongs_to_organization(organization_id));
```

### In Application Code
```typescript
// Example: Get trade performance data
const { data: tradeMetrics } = await supabase.rpc('calculate_completion_time_by_trade', {
  start_date: '2025-01-01',
  end_date: '2025-01-31'
});

// Example: Generate work order number
const { data: workOrderNumber } = await supabase.rpc('generate_work_order_number');
```

### In Triggers
```sql
-- Example: Audit trigger on work_orders table
CREATE TRIGGER audit_work_orders
  AFTER INSERT OR UPDATE OR DELETE ON work_orders
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
```

## Performance Considerations

### Function Optimization
1. **STABLE qualifier**: All read-only functions are marked STABLE for caching
2. **SECURITY DEFINER**: Used judiciously to avoid performance penalties
3. **Exception handling**: Prevents function failures from blocking operations

### Index Support
Functions that query large tables are supported by appropriate indexes:
- auth_profile_id() → profiles(user_id)
- auth_user_organizations() → user_organizations(user_id)
- Analytics functions → date-based indexes

### Caching Strategy
- Helper functions results are cached within transaction
- Materialized views cache complex analytics queries
- refresh_analytics_views() should be scheduled regularly

## Security Considerations

### SECURITY DEFINER Usage
- **Auth helpers**: Use SECURITY DEFINER to bypass RLS safely
- **Audit function**: Uses SECURITY DEFINER for reliable logging
- **Analytics**: Uses SECURITY DEFINER for cross-table access

### Input Validation
- UUID parameters are type-safe
- Date parameters have sensible defaults
- Error handling prevents information disclosure

### Access Control
- Analytics functions accessible to all authenticated users
- Audit functions only used by triggers
- Helper functions support RLS but don't enforce it

## Related Documentation

- [RLS Policies](./RLS_POLICIES.md) - How these functions support RLS
- [Audit System](./AUDIT_SYSTEM.md) - Audit function implementation details
- [Database Schema](./DATABASE_SCHEMA.md) - Complete schema overview
- [Migration History](./MIGRATION_HISTORY.md) - When functions were added