# WorkOrderPortal Audit System Documentation

## Business Overview

WorkOrderPortal implements a comprehensive audit logging system that automatically tracks all database changes for compliance, debugging, and accountability purposes. The system provides complete traceability of who made what changes when, with organization-level access control.

## What Gets Audited

### Monitored Tables

The audit system automatically tracks changes to 11 core business tables:

1. **organizations** - Company and partner information
2. **user_organizations** - User-to-organization relationships
3. **profiles** - User profile information
4. **trades** - Service categories and specializations
5. **work_orders** - Job requests and assignments
6. **work_order_reports** - Completion reports from contractors
7. **work_order_attachments** - Photos and documents
8. **email_templates** - System notification templates
9. **email_logs** - Email delivery tracking
10. **email_settings** - Email configuration
11. **system_settings** - Application configuration

**Note:** The `audit_logs` table itself is not audited to prevent infinite loops.

### What Actions Trigger Audit Logs

| Action | When It Occurs | What Gets Logged | Example Use Case |
|--------|----------------|------------------|------------------|
| **INSERT** | New record created | Complete new record data | New work order submitted |
| **UPDATE** | Existing record modified | Before and after values | Work order status changed |
| **DELETE** | Record removed | Complete deleted record data | Organization deactivated |
| **STATUS_CHANGE** | Special work order transitions | Status change with reason | Manual completion override |

## Audit Data Structure

The `audit_logs` table captures comprehensive change information:

| Field | Purpose | Example |
|-------|---------|---------|
| **table_name** | Which table was changed | "work_orders" |
| **record_id** | Which specific record | Work order UUID |
| **action** | Type of change | "UPDATE" |
| **old_values** | Data before change | `{"status": "assigned"}` |
| **new_values** | Data after change | `{"status": "completed"}` |
| **user_id** | Who made the change | User profile UUID |
| **created_at** | When change occurred | 2025-01-13 14:30:00 |

## Key Business Queries

### Recent Activity Summary
```sql
SELECT 
  table_name,
  action,
  COUNT(*) as change_count,
  p.first_name || ' ' || p.last_name as user_name
FROM audit_logs al
LEFT JOIN profiles p ON p.id = al.user_id
WHERE al.created_at >= NOW() - INTERVAL '7 days'
GROUP BY table_name, action, p.first_name, p.last_name
ORDER BY change_count DESC;
```

### Work Order Status Changes
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
  AND old_values->>'status' != new_values->>'status'
ORDER BY created_at DESC;
```

### Organization Activity Report
```sql
SELECT 
  al.action,
  COUNT(*) as total_changes,
  p.first_name || ' ' || p.last_name as team_member
FROM audit_logs al
JOIN profiles p ON p.id = al.user_id
JOIN user_organizations uo ON uo.user_id = p.id
WHERE uo.organization_id = 'your-organization-id'
  AND al.created_at >= NOW() - INTERVAL '30 days'
GROUP BY al.action, p.first_name, p.last_name
ORDER BY total_changes DESC;
```

### Compliance Report
```sql
SELECT 
  table_name,
  COUNT(*) as total_changes,
  COUNT(CASE WHEN action = 'INSERT' THEN 1 END) as created,
  COUNT(CASE WHEN action = 'UPDATE' THEN 1 END) as modified,
  COUNT(CASE WHEN action = 'DELETE' THEN 1 END) as deleted
FROM audit_logs
WHERE created_at BETWEEN '2025-01-01' AND '2025-01-31'
GROUP BY table_name
ORDER BY total_changes DESC;
```

## Implementation Details

### Database Implementation
The audit system is implemented through database triggers and functions. For technical implementation details, see these migration files:

- **Main audit system**: `supabase/migrations/20250711000002_add_audit_triggers.sql`
- **Status change support**: `supabase/migrations/20250713072539_bf55897b-5bcb-4696-aab8-640976405be9.sql`
- **Error handling updates**: `supabase/migrations/20250713072809_0e4f1b78-435b-4a93-8814-6e0e1d5109bd.sql`

### Application Integration
The audit system operates transparently at the database level. Application code doesn't need to explicitly create audit records - they're created automatically by the trigger system.

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

## Access & Security

### Who Can View Audit Data
- **Admins**: Full access to all audit logs across all organizations
- **Partners**: Can view audit logs for their organization's work orders
- **Subcontractors**: Cannot access audit logs directly
- **Employees**: Cannot access audit logs directly

### Data Privacy & Compliance
- Audit logs store complete record data as JSON for full traceability
- Consider data sensitivity when implementing custom audit queries
- Implement data retention policies to meet regulatory requirements
- Only administrators should have direct audit log access

## Related Documentation

- [RLS Policies](./RLS_POLICIES.md) - Row-level security for audit data access
- [Database Functions](./DATABASE_FUNCTIONS.md) - Helper functions used by audit system
- [Database Schema](./DATABASE_SCHEMA.md) - Complete schema overview
