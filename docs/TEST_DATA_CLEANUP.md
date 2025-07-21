# Test Data Cleanup Guide

This guide provides instructions for safely clearing test data from the WorkOrderPortal database using the built-in database function approach.

## Overview

The WorkOrderPortal application includes a database function `clear_test_data()` that safely removes test data while preserving production data. This function is designed with multiple safety checks to prevent accidental deletion of real data.

## Data to be Deleted

The cleanup function will remove:

**Test User Accounts:**
- All user profiles except the real admin: `cradcliff@austinkunzconstruction.com`

**Test Organizations:**
- All organizations (considered test data)

**Related Data:**
- Email logs
- Work order attachments
- Work order reports  
- Work order assignments
- Employee reports
- Invoice work orders
- Invoice attachments
- Receipt work orders
- Receipts
- Invoices
- Work orders
- Partner locations
- User organization relationships (except real admin)
- Test email templates
- Test trades

**Deletion Order:**
Data is deleted in the correct order to respect foreign key constraints, starting with dependent records and ending with primary records.

## Usage Instructions

### Using the Dev Tools UI

1. Navigate to `/dev-tools` in your application
2. Click the "Clear Test Data" button
3. Confirm the action when prompted
4. Review the results displayed in the UI

### Programmatic Usage

```typescript
import { supabase } from "@/integrations/supabase/client";

const clearTestData = async () => {
  try {
    const { data, error } = await supabase.rpc('clear_test_data');
    
    if (error) {
      console.error('Error clearing test data:', error);
      return;
    }
    
    console.log('Test data cleared successfully:', data);
    return data;
  } catch (error) {
    console.error('Failed to clear test data:', error);
  }
};
```

### Expected Response

The function returns a JSON object with the following structure:

```json
{
  "success": true,
  "message": "Test data cleared successfully, preserved real admin",
  "deleted_counts": {
    "email_logs": 15,
    "work_order_attachments": 8,
    "work_order_reports": 12,
    "work_order_assignments": 10,
    "employee_reports": 5,
    "invoice_work_orders": 3,
    "invoice_attachments": 2,
    "receipt_work_orders": 4,
    "receipts": 4,
    "invoices": 3,
    "work_orders": 25,
    "partner_locations": 8,
    "user_organizations": 15,
    "organizations": 10,
    "email_templates": 2,
    "trades": 3,
    "profiles": 20
  },
  "preserved_admin": {
    "id": "admin-uuid-here",
    "email": "cradcliff@austinkunzconstruction.com",
    "verified": true
  },
  "safety_checks_passed": true
}
```

## Safety Features

### Triple-Layer Authentication
1. **Database Function Security:** `SECURITY DEFINER` with admin check
2. **RLS Policies:** Admin-only access to sensitive operations
3. **Application Logic:** UI restrictions for admin users only

### Conservative Pattern Matching
- Preserves the real admin account by email pattern
- Only deletes data that matches specific test patterns
- Multiple verification steps before deletion

### Transaction Safety
- All operations run in a single database transaction
- Automatic rollback if any step fails
- Atomic operation ensures data consistency

### Error Handling
- Comprehensive error catching and reporting
- Detailed logging of all operations
- Safe failure modes that preserve data integrity


## Troubleshooting

### Common Errors

**"Only administrators can clear test data"**
- Ensure you're logged in as an admin user
- Check that your user profile has `user_type = 'admin'`

**"Critical safety check failed"**
- The real admin profile was not found
- Verify the admin email exists in the profiles table
- Do not proceed until this is resolved

**Database Connection Errors**
- Check your Supabase connection
- Verify you have the correct permissions
- Ensure the database function exists

### Warning Messages

**"No test users found to delete"**
- This is normal if no test data exists
- The function will still run and report zero deletions

## Best Practices

1. **Always Use Dev Tools UI First**
   - The UI provides clear feedback and confirmations
   - Easier to verify results before proceeding

2. **Verify Admin Account**
   - Ensure the real admin account exists before running
   - Check that the admin email is correct in the function

3. **Monitor Results**
   - Review the deleted counts to ensure expected results
   - Check that the preserved admin account is correct

4. **Test Database Access**
   - Verify you can still access the application after cleanup
   - Confirm admin account can still log in

5. **Regular Cleanup Schedule**
   - Clean test data regularly during development
   - Don't let test data accumulate excessively

## Integration with Development Workflow

The cleanup function integrates with the complete development workflow:

**Complete Reset Workflow**:
```typescript
// 1. Clear existing test data
await supabase.rpc('clear_test_data');

// 2. Seed fresh database
await supabase.rpc('seed_test_data');

// 3. Create fresh test users
await supabase.functions.invoke('create-test-users', {
  body: { admin_key: 'admin-key' }
});
```

**CI/CD Integration**:
```bash
# Example CI/CD usage
curl -X POST "https://your-supabase-project.supabase.co/rest/v1/rpc/clear_test_data" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation"
```

## Database Function Details

The `clear_test_data()` function is implemented as a PostgreSQL function with:
- `SECURITY DEFINER` privileges for elevated access
- Admin-only execution restrictions
- Comprehensive error handling
- Detailed operation logging
- Atomic transaction safety

For technical details about the function implementation, see the database migration files.
