# WorkOrderPro Audit System Documentation

## Overview

WorkOrderPro implements a comprehensive audit logging system that automatically tracks all database changes across 11 of the 12 core tables with **organization-level audit tracking**. This provides complete traceability for compliance, debugging, and accountability purposes while supporting company-level access patterns.

## System Architecture

### Audit Coverage

The audit system monitors the following 11 tables:
1. organizations
2. user_organizations
3. profiles
4. trades
5. work_orders
6. work_order_reports
7. work_order_attachments
8. email_templates
9. email_logs
10. email_settings
11. system_settings

**Note:** The `audit_logs` table itself is not audited to prevent infinite recursion.

### Audit Triggers

Each monitored table has an audit trigger that fires on INSERT, UPDATE, and DELETE operations:

```sql
CREATE TRIGGER audit_[table_name]
  AFTER INSERT OR UPDATE OR DELETE ON [table_name]
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
```

## audit_logs Table Structure

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| table_name | text | Name of the table that was modified |
| record_id | uuid | ID of the modified record |
| action | text | Type of operation: 'INSERT', 'UPDATE', 'DELETE' |
| old_values | jsonb | Previous values (NULL for INSERT) |
| new_values | jsonb | New values (NULL for DELETE) |
| user_id | uuid | ID of user who made the change (if available) |
| created_at | timestamptz | Timestamp of the change |

## The audit_trigger_function()

This PostgreSQL function handles all audit logging:

```sql
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Key Features

- **Automatic Operation**: No manual intervention required
- **Error Resilience**: Audit failures don't block main operations
- **User Tracking**: Links changes to authenticated users when possible
- **Complete Data Capture**: Stores full before/after state as JSON
- **Timestamp Precision**: Records exact change time

## Common Audit Queries

### View Recent Changes
```sql
SELECT 
  table_name,
  action,
  created_at,
  p.first_name || ' ' || p.last_name as user_name
FROM audit_logs al
LEFT JOIN profiles p ON p.id = al.user_id
ORDER BY created_at DESC
LIMIT 50;
```

### Track Changes to Specific Record
```sql
SELECT 
  action,
  old_values,
  new_values,
  created_at,
  p.first_name || ' ' || p.last_name as user_name
FROM audit_logs al
LEFT JOIN profiles p ON p.id = al.user_id
WHERE table_name = 'work_orders' 
  AND record_id = 'your-work-order-id'
ORDER BY created_at DESC;
```

### Find Changes by User
```sql
SELECT 
  table_name,
  record_id,
  action,
  created_at
FROM audit_logs
WHERE user_id = 'user-profile-id'
ORDER BY created_at DESC;
```

### Organization-Level Audit Queries

#### Track Organization Work Order Changes
```sql
SELECT 
  al.table_name,
  al.record_id,
  al.action,
  al.old_values->>'status' as old_status,
  al.new_values->>'status' as new_status,
  al.created_at,
  p.first_name || ' ' || p.last_name as changed_by,
  o.name as organization_name
FROM audit_logs al
LEFT JOIN profiles p ON p.id = al.user_id
LEFT JOIN work_orders wo ON wo.id = al.record_id::uuid
LEFT JOIN organizations o ON o.id = wo.organization_id
WHERE al.table_name = 'work_orders'
  AND wo.organization_id = 'your-organization-id'
ORDER BY al.created_at DESC;
```

#### Monitor Company-Level Invoice Activity
```sql
SELECT 
  al.table_name,
  al.action,
  al.old_values->>'status' as old_status,
  al.new_values->>'status' as new_status,
  al.new_values->>'total_amount' as amount,
  al.created_at,
  p.first_name || ' ' || p.last_name as changed_by
FROM audit_logs al
LEFT JOIN profiles p ON p.id = al.user_id
LEFT JOIN invoices inv ON inv.id = al.record_id::uuid
WHERE al.table_name = 'invoices'
  AND inv.subcontractor_organization_id = 'your-organization-id'
ORDER BY al.created_at DESC;
```

#### Organization Team Activity Summary
```sql
SELECT 
  p.first_name || ' ' || p.last_name as team_member,
  COUNT(*) as total_actions,
  COUNT(CASE WHEN al.table_name = 'work_orders' THEN 1 END) as work_order_changes,
  COUNT(CASE WHEN al.table_name = 'work_order_reports' THEN 1 END) as report_changes,
  COUNT(CASE WHEN al.table_name = 'invoices' THEN 1 END) as invoice_changes,
  MAX(al.created_at) as last_activity
FROM audit_logs al
JOIN profiles p ON p.id = al.user_id
JOIN user_organizations uo ON uo.user_id = p.id
WHERE uo.organization_id = 'your-organization-id'
  AND al.created_at >= NOW() - INTERVAL '30 days'
GROUP BY p.id, p.first_name, p.last_name
ORDER BY total_actions DESC;
```

### Monitor Work Order Status Changes
```sql
SELECT 
  record_id,
  old_values->>'status' as old_status,
  new_values->>'status' as new_status,
  created_at,
  p.first_name || ' ' || p.last_name as changed_by
FROM audit_logs al
LEFT JOIN profiles p ON p.id = al.user_id
WHERE table_name = 'work_orders'
  AND action = 'UPDATE'
  AND old_values->>'status' != new_values->>'status'
ORDER BY created_at DESC;
```

### Compliance Report - All Changes in Date Range
```sql
SELECT 
  table_name,
  COUNT(*) as total_changes,
  COUNT(CASE WHEN action = 'INSERT' THEN 1 END) as inserts,
  COUNT(CASE WHEN action = 'UPDATE' THEN 1 END) as updates,
  COUNT(CASE WHEN action = 'DELETE' THEN 1 END) as deletes
FROM audit_logs
WHERE created_at BETWEEN '2025-01-01' AND '2025-01-31'
GROUP BY table_name
ORDER BY total_changes DESC;
```

### Detect Potential Data Issues
```sql
-- Find records that were deleted and recreated quickly
SELECT 
  table_name,
  record_id,
  COUNT(*) as change_count,
  MIN(created_at) as first_change,
  MAX(created_at) as last_change
FROM audit_logs
WHERE created_at > NOW() - INTERVAL '1 day'
GROUP BY table_name, record_id
HAVING COUNT(*) > 5
ORDER BY change_count DESC;
```

## Best Practices

### Querying Audit Data

1. **Use Indexes**: The audit_logs table has indexes on `table_name`, `record_id`, `user_id`, and `created_at`
2. **Limit Date Ranges**: Always include date filters for performance
3. **Join Carefully**: Use LEFT JOIN when linking to user profiles (user_id can be NULL)

### Data Retention

1. **Monitor Size**: Audit logs grow quickly in active systems
2. **Archive Old Data**: Consider archiving logs older than regulatory requirements
3. **Partition by Date**: For high-volume systems, consider table partitioning

### Performance Considerations

1. **Minimal Overhead**: Audit triggers are optimized for speed
2. **Asynchronous Options**: For extreme performance needs, consider async audit logging
3. **Index Strategy**: Current indexes cover most common queries

### Security

1. **RLS Protection**: Only admins can view audit logs
2. **User Privacy**: Consider data sensitivity when storing full JSON values
3. **Compliance**: Ensure audit retention meets regulatory requirements

## Troubleshooting

### Common Issues

**Problem**: Audit trigger failing
```sql
-- Check PostgreSQL logs for specific error messages
-- Triggers are designed to continue main operation even if audit fails
```

**Problem**: Missing user_id in audit logs
```sql
-- This is normal for:
-- 1. System-generated changes (migrations, functions)
-- 2. Unauthenticated operations
-- 3. Background processes
```

**Problem**: Large audit_logs table
```sql
-- Check table size
SELECT pg_size_pretty(pg_total_relation_size('audit_logs'));

-- Consider archiving old records
DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '2 years';
```

### Monitoring Queries

```sql
-- Check audit system health
SELECT 
  table_name,
  COUNT(*) as audit_count,
  MAX(created_at) as last_audit
FROM audit_logs
WHERE created_at > NOW() - INTERVAL '1 day'
GROUP BY table_name
ORDER BY table_name;
```

## Integration with Application

The audit system operates transparently at the database level. Application code doesn't need to explicitly create audit records - they're created automatically by the trigger system.

### Accessing Audit Data

```typescript
// Example: Get audit trail for a work order
const { data: auditTrail } = await supabase
  .from('audit_logs')
  .select(`
    *,
    user:profiles(first_name, last_name)
  `)
  .eq('table_name', 'work_orders')
  .eq('record_id', workOrderId)
  .order('created_at', { ascending: false });
```

## Related Documentation

- [RLS Policies](./RLS_POLICIES.md) - Who can access audit data
- [Database Functions](./DATABASE_FUNCTIONS.md) - Helper functions used by audit system
- [Database Schema](./DATABASE_SCHEMA.md) - Complete schema overview