# Test Data Cleanup Guide

## ⚠️ CRITICAL SAFETY WARNING

This guide covers the `clear-test-data` Edge Function, which **permanently deletes data** from the database. This function is designed with multiple safety layers, but improper use could result in data loss.

## Overview

The `clear-test-data` function safely removes test data created by the seed function while preserving all production data through ultra-conservative pattern matching and multiple safety checks.

## What Gets Deleted

### User Accounts (Exact Email Matches Only)
```
admin@workorderpro.com        - Admin test user
employee@workorderpro.com     - Employee test user  
senior@workorderpro.com       - Senior employee
midlevel@workorderpro.com     - Mid-level employee
junior@workorderpro.com       - Junior employee
partner1@abc.com              - ABC Property partner
partner2@xyz.com              - XYZ Commercial partner
partner3@premium.com          - Premium Facilities partner
plumber1@trade.com            - Plumbing contractor #1
plumber2@trade.com            - Plumbing contractor #2
electrician@trade.com         - Electrical contractor
hvac1@trade.com               - HVAC contractor #1
hvac2@trade.com               - HVAC contractor #2
carpenter@trade.com           - Carpentry contractor
```

### Organizations (Exact Name Matches Only)
```
WorkOrderPro Internal         - Internal company
ABC Property Management       - Partner organization
XYZ Commercial Properties     - Partner organization
Premium Facilities Group      - Partner organization
Pipes & More Plumbing         - Subcontractor
Sparks Electric               - Subcontractor
Cool Air HVAC                 - Subcontractor
Wood Works Carpentry          - Subcontractor
Brush Strokes Painting        - Subcontractor
Fix-It Maintenance            - Subcontractor
Green Thumb Landscaping       - Subcontractor
```

### Associated Data (FK-Safe Deletion Order)
1. **Email Logs** - Notifications sent for test work orders
2. **Work Order Attachments** - Files uploaded to test work orders
3. **Work Order Reports** - Completion reports by test contractors
4. **Work Order Assignments** - Multi-assignee records
5. **Employee Reports** - Time tracking by test employees
6. **Receipt Work Orders** - Expense allocations
7. **Receipts** - Employee expense records
8. **Invoice Work Orders** - Invoice line items
9. **Invoice Attachments** - Invoice supporting documents
10. **Invoices** - All invoices from test contractors
11. **Work Orders** - All work orders created by/assigned to test users
12. **Partner Locations** - Test organization locations
13. **User Organizations** - Test user-organization relationships
14. **Organizations** - Test organizations (after all references removed)
15. **Profiles** - Test user profiles (cascades to auth.users)

## What Does NOT Get Deleted

### System Data (Preserved)
- **Trades** - Plumbing, HVAC, Electrical, etc. (reusable)
- **Email Templates** - Notification templates (reusable)
- **System Settings** - Application configuration
- **Audit Logs** - Security and compliance records

### Production Data (Protected)
- Any user with email NOT in the exact test pattern list
- Any organization with name NOT in the exact test organization list
- Any work orders not linked to test users/organizations
- Any financial data not linked to test users/organizations

### Safety Validation
The function validates that NO production data would be affected by:
- Using exact string matching (never LIKE patterns)
- Cross-referencing all foreign key relationships
- Counting affected records before deletion
- Providing detailed impact reports

## Usage Instructions

### Step 1: Dry Run (ALWAYS START HERE)
```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/clear-test-data' \
  -H 'Content-Type: application/json' \
  -d '{
    "admin_key": "your-admin-key",
    "dry_run": true,
    "include_summary": true
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "mode": "dry_run",
  "safety_checks_passed": true,
  "deleted_counts": {
    "email_logs": 15,
    "work_orders": 16,
    "profiles": 14,
    "organizations": 11
  },
  "test_data_summary": {
    "users_found": 14,
    "organizations_found": 11,
    "work_orders_found": 16,
    "total_records_affected": 156
  },
  "message": "Dry run completed: 156 records would be deleted"
}
```

### Step 2: Review Dry Run Results
- Verify `safety_checks_passed: true`
- Check `test_data_summary` matches expectations
- Review `deleted_counts` for each table
- Ensure no unexpected numbers (e.g., thousands of records)

### Step 3: Actual Deletion (Only After Dry Run)
```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/clear-test-data' \
  -H 'Content-Type: application/json' \
  -d '{
    "admin_key": "your-admin-key",
    "dry_run": false,
    "confirm_deletion": true,
    "include_summary": true
  }'
```

## Safety Features

### Triple-Layer Authentication
1. **API Level**: Admin API key required
2. **Database Level**: Service role with admin privileges
3. **Pattern Level**: Ultra-conservative WHERE clauses

### Conservative Pattern Matching
- **Exact String Matching**: Never uses LIKE patterns
- **Explicit Lists**: All patterns hardcoded from seed function
- **No Wildcards**: Prevents accidental broader matches

### Transaction Safety
- **All-or-Nothing**: Complete success or complete rollback
- **Error Recovery**: Automatic rollback on any failure
- **Audit Trail**: All operations logged

### Default Safety Mode
- **Dry Run Default**: Must explicitly set `dry_run: false`
- **Confirmation Required**: Must set `confirm_deletion: true`
- **Impact Reporting**: Shows exactly what would be affected

## Common Scenarios

### Development Cycle Reset
```bash
# 1. Clear old test data
curl -X POST 'https://your-project.supabase.co/functions/v1/clear-test-data' \
  -d '{"admin_key": "key", "dry_run": false, "confirm_deletion": true}'

# 2. Reseed with fresh data  
curl -X POST 'https://your-project.supabase.co/functions/v1/seed-database' \
  -d '{"admin_key": "key"}'
```

### Pre-Production Cleanup
```bash
# Remove all test data before production deployment
curl -X POST 'https://your-project.supabase.co/functions/v1/clear-test-data' \
  -d '{"admin_key": "key", "dry_run": false, "confirm_deletion": true}'
```

### Testing Different Scenarios
```bash
# Clear → Seed → Test → Repeat
clear-test-data → seed-database → run-tests → clear-test-data
```

## Troubleshooting

### Error: "No test data found"
- **Cause**: Seed function hasn't been run
- **Solution**: Run seed function first
- **Verification**: Check dry run shows expected counts

### Error: "Safety checks failed"  
- **Cause**: Pattern matching detected potential production data risk
- **Solution**: Review patterns and database state
- **Action**: Never override safety checks

### Error: "Database admin validation failed"
- **Cause**: Service role lacks admin privileges
- **Solution**: Verify Supabase service role configuration
- **Check**: RLS policies and function permissions

### Warning: "Limited test data found"
- **Cause**: Partial seed data or previous cleanup
- **Solution**: Normal if intentional, investigate if unexpected
- **Action**: Review seed function execution logs

## Recovery Procedures

### If Production Data Was Accidentally Affected
1. **Immediate**: Check audit logs for affected records
2. **Assessment**: Determine scope of data loss
3. **Recovery**: Restore from most recent backup
4. **Prevention**: Review and improve safety patterns

### If Test Data Cleanup Failed Partially
1. **Investigation**: Review error logs and transaction state
2. **Cleanup**: May need manual cleanup of remaining test data
3. **Verification**: Run dry run to see current state
4. **Re-run**: Safe to re-run function (idempotent)

## Best Practices

### Before Each Use
- ✅ Always run dry run first
- ✅ Verify expected record counts
- ✅ Check no warnings about production data
- ✅ Confirm safety checks pass

### Regular Maintenance
- 🔄 Clear test data between development cycles
- 🔄 Reseed with fresh test data for testing
- 🔄 Monitor database size and performance impact
- 🔄 Update patterns when seed function changes

### Security
- 🔒 Protect admin API key
- 🔒 Monitor function execution logs
- 🔒 Regular backup verification
- 🔒 Audit trail review

## Example Test Queries

### Verify Test Data Scope
```sql
-- Count test users
SELECT COUNT(*) FROM profiles 
WHERE email IN ('admin@workorderpro.com', 'partner1@abc.com', 'plumber1@trade.com');

-- Count test organizations  
SELECT COUNT(*) FROM organizations
WHERE name IN ('ABC Property Management', 'Pipes & More Plumbing');

-- Count affected work orders
SELECT COUNT(*) FROM work_orders wo
JOIN profiles p ON p.id = wo.created_by
WHERE p.email LIKE '%@workorderpro.com' OR p.email LIKE '%@trade.com';
```

### Verify Clean State
```sql
-- Should return 0 after cleanup
SELECT COUNT(*) FROM profiles 
WHERE email IN (/* test email list */);

-- Should return 0 after cleanup  
SELECT COUNT(*) FROM organizations
WHERE name IN (/* test org list */);
```

### Check System Data Preserved
```sql
-- Should still exist after cleanup
SELECT COUNT(*) FROM trades WHERE is_active = true;
SELECT COUNT(*) FROM email_templates WHERE is_active = true;
```

## Integration with Development Workflow

### CI/CD Pipeline
```yaml
# Example GitHub Actions step
- name: Reset Test Database
  run: |
    # Clear old test data
    curl -X POST "$SUPABASE_URL/functions/v1/clear-test-data" \
      -H "Content-Type: application/json" \
      -d '{"admin_key": "${{ secrets.ADMIN_KEY }}", "dry_run": false, "confirm_deletion": true}'
    
    # Seed fresh test data
    curl -X POST "$SUPABASE_URL/functions/v1/seed-database" \
      -H "Content-Type: application/json" \
      -d '{"admin_key": "${{ secrets.ADMIN_KEY }}"}'
```

### Development Scripts
```bash
#!/bin/bash
# dev-reset.sh - Reset development database

echo "🧹 Clearing test data..."
curl -X POST 'http://localhost:54321/functions/v1/clear-test-data' \
  -d '{"admin_key": "dev-key", "dry_run": false, "confirm_deletion": true}'

echo "🌱 Seeding fresh test data..."  
curl -X POST 'http://localhost:54321/functions/v1/seed-database' \
  -d '{"admin_key": "dev-key"}'

echo "✅ Development database reset complete"
```

---

## ⚠️ Final Safety Reminder

This function is designed to be safe, but data deletion is permanent. Always:
- Start with dry runs
- Verify patterns match expectations  
- Maintain regular backups
- Test in development environments first
- Monitor audit logs for any unexpected patterns

The multiple safety layers are designed to prevent accidents, but careful usage is still required.