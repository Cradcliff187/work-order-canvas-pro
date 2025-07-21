# Database Seeding Guide

## Overview

WorkOrderPortal uses **database function-based seeding** for secure, server-side database initialization. This approach provides robust data seeding with proper authentication and RLS bypass capabilities through PostgreSQL SECURITY DEFINER functions.

## Why Database Functions for Seeding?

### Security Benefits
- **Service Role Privileges**: Functions run with elevated database permissions
- **RLS Bypass**: Can perform administrative operations that bypass Row Level Security
- **Server-Side Execution**: No browser security limitations or client-side vulnerabilities
- **Authentication Control**: Secure admin validation before any operations

### Performance Advantages
- **Atomic Transactions**: Complete rollback on any failure
- **Bulk Operations**: Efficient batch processing for large datasets
- **No Browser Limits**: Can handle large datasets without memory constraints
- **Direct Database Access**: Eliminates network overhead for data operations

### Reliability Features
- **Comprehensive Error Handling**: Detailed error reporting and debugging
- **SECURITY DEFINER**: Functions execute with proper privileges
- **Audit Trail**: Complete logging of all seeding operations
- **Idempotent Operations**: Safe to run multiple times

## Architecture Overview

```mermaid
graph TD
    A[Dev Tools UI] --> B[useDevTools Hook]
    B --> C[Database Functions]
    C --> D[Supabase Database]
    
    subgraph "Database Functions"
        E[seed_test_data()]
        F[clear_test_data()]
    end
    
    subgraph "Database Operations"
        G[Organizations]
        H[Users & Profiles]
        I[Work Orders]
        J[Reports & Attachments]
    end
    
    B --> E
    B --> F
    E --> G
    E --> H
    E --> I
    E --> J
    F --> G
    F --> H
    F --> I
    F --> J
```

## Available Database Functions

### 1. `seed_test_data()`

**Purpose**: Populate database with comprehensive test data using SECURITY DEFINER privileges

**Function Signature**:
```sql
CREATE OR REPLACE FUNCTION public.seed_test_data()
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
```

**Usage**:
```typescript
const { data, error } = await supabase.rpc('seed_test_data');
```

**Enhanced Seeding Approach (Updated July 2025)**:
- **Admin-Only Security**: Uses authenticated admin profile for all data relationships
- **Constraint Compliant**: Fixed work_order_attachments_check constraint violations
- **Comprehensive Business Data**: 12 work orders with varied statuses and historical dates
- **No User Creation**: Database function only creates business data, not user accounts
- **Idempotent Operations**: Safe to run multiple times with ON CONFLICT handling
- **Enhanced Error Handling**: Comprehensive constraint violation prevention

**Current Response Format (July 2025)**:
```json
{
  "success": true,
  "message": "Enhanced business test data seeded successfully (constraint-compliant)",
  "idempotent": true,
  "details": {
    "organizations_created": 8,
    "partner_locations_created": 5,
    "work_orders_created": 12,
    "work_order_assignments_created": 8,
    "work_order_reports_created": 6,
    "employee_reports_created": 2,
    "receipts_created": 2,
    "invoices_created": 3,
    "invoice_work_orders_created": 3,
    "work_order_attachments_created": 10,
    "admin_profile_used": "uuid-of-admin-profile",
    "approach": "comprehensive_testing_constraint_compliant"
  },
  "testing_scenarios": {
    "work_order_statuses": {
      "received": 4,
      "assigned": 0,
      "in_progress": 3,
      "completed": 3,
      "cancelled": 2
    },
    "invoice_statuses": {
      "draft": 1,
      "submitted": 1,
      "approved": 1
    },
    "attachment_types": {
      "work_order_attachments": 3,
      "report_attachments": 7,
      "total": 10
    },
    "date_distribution": "Past 30 days with realistic intervals",
    "assignment_coverage": "Both organization and individual assignments"
  },
  "constraint_fixes": {
    "work_order_attachments_check": "Fixed - attachments now properly link to either work_order_id OR work_order_report_id, never both",
    "error_handling": "Added comprehensive error handling for constraint violations"
  },
  "note": "Function is idempotent and constraint-compliant. All check constraints properly handled."
}
```

### 2. `clear_test_data()`

**Purpose**: Safely remove test data with comprehensive cleanup

**Function Signature**:
```sql
CREATE OR REPLACE FUNCTION public.clear_test_data()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
```

**Usage**:
```typescript
const { data, error } = await supabase.rpc('clear_test_data');
```

**Response Format**:
```json
{
  "success": true,
  "message": "Test data cleared successfully",
  "deleted_counts": {
    "work_orders": 16,
    "work_order_reports": 0,
    "profiles": 0,
    "organizations": 7,
    "email_logs": 0
  },
  "test_user_count": 0,
  "test_org_count": 7,
  "test_work_order_count": 16
}
```

## Complete Development Workflow

### Step 1: Database Seeding

1. **Access Dev Tools**: Navigate to `/dev-tools` in your application
2. **Seed Database**: Click "Seed Database" to populate with test data
3. **Monitor Progress**: Watch detailed results with constraint compliance confirmation

### Step 2: User Creation (NEW)

1. **Create Test Users**: Click "Create Test Users" in DevTools
2. **Real Authentication**: Creates 5 actual authenticated users across all roles
3. **Organization Integration**: Users are automatically linked to appropriate organizations
4. **Test Credentials**: Use password `Test123!` for all created users

### Step 3: Role-Based Testing

1. **Login with Different Users**: Test with real authentication credentials
2. **Verify Permissions**: Test organization-level access and role restrictions
3. **Team Collaboration**: Test multi-user workflows and assignments

### Programmatic Usage

```typescript
import { supabase } from '@/integrations/supabase/client';

// Seed the database
const seedDatabase = async () => {
  const { data, error } = await supabase.rpc('seed_test_data');
  
  if (error) {
    console.error('Seeding failed:', error);
    return;
  }
  
  console.log('Seeding completed:', data.details);
};

// Clear test data
const clearTestData = async () => {
  const { data, error } = await supabase.rpc('clear_test_data');
  
  if (error) {
    console.error('Clear operation failed:', error);
    return;
  }
  
  console.log('Clear operation result:', data.deleted_counts);
};
```

## Modifying Seed Data

### Organizations
Edit the organizations section in the `seed_test_data()` function:

```sql
-- Insert Organizations
INSERT INTO organizations (id, name, contact_email, organization_type, initials, is_active) VALUES
  (org_internal_id, 'WorkOrderPortal Internal', 'admin@workorderpro.com', 'internal', 'WOP', true),
  (org_abc_id, 'ABC Property Management', 'contact@abc-property.com', 'partner', 'ABC', true),
  -- Add more organizations here
```

### Users
The current implementation creates only the admin profile to avoid RLS violations:

```sql
-- Update/Insert ONLY Admin Profile
INSERT INTO profiles (id, user_id, email, first_name, last_name, user_type, is_active, is_employee) 
VALUES (admin_user_id, v_user_id, 'admin@workorderpro.com', 'System', 'Administrator', 'admin', true, true)
ON CONFLICT (user_id) 
DO UPDATE SET 
  email = EXCLUDED.email,
  first_name = EXCLUDED.first_name,
  -- ... update fields
```

### Work Orders
Customize work order generation parameters:

```sql
INSERT INTO work_orders (id, work_order_number, title, description, organization_id, trade_id, status, created_by)
VALUES
  (wo1_id, 'ABC-001-001', 'Leaky Faucet Repair', 'Kitchen faucet dripping constantly', org_abc_id, trade_plumbing_id, 'received', admin_user_id),
  -- Add more work orders here
```

## Additional Resources

For comprehensive troubleshooting guides, error handling, and security considerations, see:
- **[Development Guide](./DEVELOPMENT_GUIDE.md)** - Complete development workflow and troubleshooting
- **[Database Functions](./DATABASE_FUNCTIONS.md)** - Database function reference
- **[RLS Policies](./RLS_POLICIES.md)** - Row Level Security documentation

## Implementation History

### Current Approach: Database Functions + Edge Functions (July 2025)

**CURRENT PRODUCTION APPROACH**:
```typescript
// ✅ Database function seeding (business data)
const { data, error } = await supabase.rpc('seed_test_data');

// ✅ Edge function user creation (real users)
const response = await supabase.functions.invoke('create-test-users', {
  body: { admin_key: 'your-admin-key' }
});
```

### Implementation Benefits

1. **Security**: Server-side execution with SECURITY DEFINER privileges + admin validation
2. **Reliability**: Direct database access with atomic transactions and constraint compliance
3. **Performance**: No network overhead for database operations
4. **Real Authentication**: Creates actual authenticated users for comprehensive testing
5. **Comprehensive Testing**: Complete workflow from data seeding to user authentication
6. **Constraint Compliance**: Fixed attachment constraints and enhanced error handling

### Technical Implementation

- **Database Functions**: `seed_test_data()`, `clear_test_data()` with SECURITY DEFINER privileges  
- **Edge Functions**: `create-test-users` with service role authentication and multi-method validation
- **API Usage**: Uses `supabase.rpc()` for database functions and `supabase.functions.invoke()` for user creation
- **Authentication**: Admin validation for all operations with multiple security layers
- **Constraint Compliance**: Enhanced error handling with work_order_attachments_check constraint fixes
- **DevTools Integration**: Seamless UI experience for both database seeding and user creation

## Best Practices

### Development Workflow

1. **Start Fresh**: Always clear test data before seeding
2. **Verify Results**: Check table counts after seeding
3. **Test Permissions**: Verify RLS policies work correctly with test data
4. **Clean Up**: Clear test data when switching between development tasks

### Production Considerations

1. **Security**: Never run seeding functions in production
2. **Backup**: Always backup production data before any database operations
3. **Monitoring**: Set up alerts for unexpected data changes
4. **Access Control**: Limit admin access to seeding functions

This database function approach provides a secure, reliable, and maintainable solution for test data management in WorkOrderPortal.
