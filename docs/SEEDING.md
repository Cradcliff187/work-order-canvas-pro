# Database Seeding Guide

## Overview

WorkOrderPro uses **database function-based seeding** for secure, server-side database initialization. This approach provides robust data seeding with proper authentication and RLS bypass capabilities through PostgreSQL SECURITY DEFINER functions.

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

**Response Format**:
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

## How to Use Database Function Seeding

### Local Development

1. **Access Dev Tools**: Navigate to `/dev-tools` in your application
2. **Seed Database**: Click "Seed Database" to populate with test data
3. **Clear Data**: Click "Clear Test Data" to remove test data
4. **Monitor Progress**: Watch console output for real-time feedback

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
  (org_internal_id, 'WorkOrderPro Internal', 'admin@workorderpro.com', 'internal', 'WOP', true),
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

## Error Handling

### Common Issues and Solutions

#### Authentication Errors
```
Error: Only administrators can seed test data
```
**Solution**: Ensure you're logged in as an admin user before running seeding functions

#### Database Errors
```
Error: Foreign key constraint violation
```
**Solution**: The functions handle foreign key relationships automatically. If issues persist, run `clear_test_data()` first

#### RLS Errors
```
Error: new row violates row-level security policy
```
**Solution**: The SECURITY DEFINER functions bypass RLS automatically. This error indicates the function isn't being used correctly.

### Error Recovery

1. **Partial Seeding Failures**: Functions use transactions - partial failures are automatically rolled back
2. **Data Conflicts**: Run `clear_test_data()` first, then re-seed
3. **Permission Issues**: Verify admin user authentication

## Security Model

### SECURITY DEFINER Functions

Both seeding functions use `SECURITY DEFINER` which means:
- Functions execute with the privileges of their owner (admin)
- Bypass Row Level Security policies
- Can perform operations regular users cannot
- Provide secure, controlled access to administrative operations

### Admin-Only Access

```sql
-- Only allow admins to execute seeding functions
IF NOT public.auth_is_admin() THEN
  RAISE EXCEPTION 'Only administrators can seed test data';
END IF;
```

### Safe Data Identification

The `clear_test_data()` function safely identifies test data using:
- Email patterns: `%@testcompany%`, `%@example.com`, `%test%`
- Organization names: Known test organization names
- User names: First name = 'Test'

## Troubleshooting Guide

### Debug Mode

Monitor seeding progress in browser console:

```
🌱 Starting database seeding using secure function...
🎉 Database seeding completed successfully!
📋 Summary: Created organizations: 8, trades: 10, work_orders: 16
```

### Function Logs

View function execution in Supabase Dashboard:
1. Go to **SQL Editor**
2. Run: `SELECT * FROM audit_logs WHERE table_name = 'profiles' ORDER BY created_at DESC;`
3. Check for seeding-related audit entries

### Performance Monitoring

Track seeding performance:

```typescript
const startTime = Date.now();
const { data, error } = await supabase.rpc('seed_test_data');
const executionTime = Date.now() - startTime;
console.log(`Seeding completed in ${executionTime}ms`);
```

## Implementation History

### Current Approach: Database Functions

**CURRENT PRODUCTION APPROACH**:
```typescript
// ✅ Database function seeding (current)
const { data, error } = await supabase.rpc('seed_test_data');
```

### Implementation Benefits

1. **Security**: Server-side execution with proper SECURITY DEFINER privileges
2. **Reliability**: Direct database access with atomic transactions
3. **Performance**: No network overhead for database operations
4. **Maintenance**: Centralized seeding logic in the database
5. **Simplicity**: No external function deployment or management required

### Technical Implementation

- **Database Functions**: `seed_test_data()`, `clear_test_data()` with SECURITY DEFINER privileges
- **API Usage**: Uses `supabase.rpc()` for direct database function calls
- **Authentication**: Uses existing user authentication with admin validation
- **Error Handling**: Comprehensive error response format from database functions

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

This database function approach provides a secure, reliable, and maintainable solution for test data management in WorkOrderPro.