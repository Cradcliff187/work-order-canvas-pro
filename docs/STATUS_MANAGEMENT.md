# Work Order Status Management

## ⚠️ CRITICAL: Never Update Status Directly

### ❌ FORBIDDEN - This breaks everything:
```typescript
// DON'T DO THIS - Bypasses audit logs, email triggers, and completion logic
await supabase.from('work_orders').update({ status: 'completed' })
```

### ✅ CORRECT - Use the status manager:
```typescript
const { changeStatus } = useWorkOrderStatusManager();
await changeStatus(workOrderId, 'completed', 'Manual completion by admin');
```

## How Status Management Works

### 1. Database Layer (Source of Truth)

- **Status stored in** `work_orders.status` column
- **Changed ONLY through** `transition_work_order_status()` function
- **Triggers handle** automatic progressions

### 2. Automatic Status Transitions (Database Triggers)

- **Assignment created** → status becomes `'assigned'`
- **First report submitted** → status becomes `'in_progress'`
- **All reports approved** → status becomes `'completed'`
- **Each transition** creates audit log and may send email

### 3. Display Layer (Role-Based)

- **Partners** see friendly labels (handled by `WorkOrderStatusBadge`)
- **Billing** shows computed statuses (handled by `BillingDashboard`)
- **Activity feed** translates for each user role

## Status Flow Diagram

```
┌─────────────┐    Assignment     ┌──────────┐    First Report    ┌─────────────┐    All Reports    ┌───────────┐
│  received   │ ─────────────────→ │ assigned │ ─────────────────→ │ in_progress │ ─────────────────→ │ completed │
└─────────────┘                   └──────────┘                   └─────────────┘                   └───────────┘
       │                                │                              │
       │                                │                              │
       ▼                                ▼                              ▼
┌─────────────────┐              ┌─────────────────┐         ┌─────────────────┐
│ estimate_needed │              │   cancelled     │         │   cancelled     │
└─────────────────┘              └─────────────────┘         └─────────────────┘
       │
       ▼
┌──────────────────┐
│ estimate_approved│
└──────────────────┘
```

## Why This Matters

Direct status updates bypass:

- ✋ **Audit logging** for compliance
- ✋ **Email notifications** to stakeholders  
- ✋ **Completion detection** logic
- ✋ **Status validation** rules

## Correct Usage Examples

### Using the Hook in Components

```typescript
import { useWorkOrderStatusManager } from '@/hooks/useWorkOrderStatusManager';

function WorkOrderActions({ workOrderId }: { workOrderId: string }) {
  const { changeStatus, isChangingStatus } = useWorkOrderStatusManager();

  const handleComplete = async () => {
    try {
      const result = await changeStatus(
        workOrderId, 
        'completed', 
        'Manually completed by admin'
      );
      
      if (result.success) {
        console.log('Status updated successfully');
      } else {
        console.error('Status update failed:', result.error);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
    }
  };

  return (
    <Button 
      onClick={handleComplete}
      disabled={isChangingStatus}
    >
      {isChangingStatus ? 'Updating...' : 'Mark Complete'}
    </Button>
  );
}
```

### Direct Database Function Call

```sql
-- Only use this in database functions/triggers
SELECT transition_work_order_status(
  'work-order-uuid',
  'completed'::work_order_status,
  'Completion reason',
  'admin-user-uuid'
);
```

## Database Triggers (Automatic)

### Assignment Trigger
```sql
-- Automatically runs when work_order_assignments record is created
CREATE TRIGGER auto_update_assignment_status
  AFTER INSERT ON work_order_assignments
  FOR EACH ROW EXECUTE FUNCTION auto_update_assignment_status();
```

### Report Status Trigger  
```sql
-- Automatically runs when work_order_reports.status changes to 'approved'
CREATE TRIGGER auto_update_report_status_enhanced
  AFTER UPDATE ON work_order_reports
  FOR EACH ROW EXECUTE FUNCTION auto_update_report_status_enhanced();
```

## Business Rules

### Automatic Progressions

| Trigger Event | Status Transition | Condition |
|---------------|------------------|-----------|
| Assignment created | `received` → `assigned` | First assignment for work order |
| Report submitted | `assigned` → `in_progress` | First report submitted |
| All reports approved | `in_progress` → `completed` | All required reports approved |

### Manual Transitions (Admin Only)

| From Status | To Status | Use Case |
|-------------|-----------|----------|
| Any | `cancelled` | Work order cancelled |
| `received` | `estimate_needed` | Requires estimate |
| `estimate_needed` | `estimate_approved` | Estimate approved |
| `estimate_approved` | `assigned` | Ready for assignment |

## Status Display by Role

### Internal Users (Admin/Manager/Employee)
- See technical status names: `received`, `assigned`, `in_progress`, `completed`
- Full visibility into status progression

### Partners  
- See friendly labels via `WorkOrderStatusBadge`:
  - `received` → "Submitted" 
  - `assigned` → "Assigned"
  - `in_progress` → "In Progress"
  - `completed` → "Complete"

### Subcontractors
- See assignment-focused labels:
  - `assigned` → "Assigned to You"
  - `in_progress` → "Work Started" 
  - `completed` → "Work Complete"

## Migration Context

### What Changed (December 2024)

**Before:** Components directly updated `work_orders.status`
```typescript
// OLD WAY - Now forbidden
await supabase.from('work_orders').update({ status: 'completed' })
```

**After:** All changes go through centralized status manager
```typescript  
// NEW WAY - Required
const { changeStatus } = useWorkOrderStatusManager();
await changeStatus(workOrderId, 'completed', reason);
```

### Why We Changed

1. **Compliance Requirements** - Need complete audit trail
2. **Email Notifications** - Status changes trigger stakeholder emails
3. **Business Logic** - Complex completion detection rules
4. **Data Integrity** - Prevent invalid status transitions

## Troubleshooting

### Common Issues

#### ❌ Status not updating
**Cause:** Using direct database update
**Fix:** Use `useWorkOrderStatusManager` hook

#### ❌ Missing email notifications  
**Cause:** Bypassing `transition_work_order_status()` function
**Fix:** Always use the status manager

#### ❌ Audit logs missing
**Cause:** Direct status updates skip audit logging
**Fix:** Status manager automatically logs all changes

### Debug Status Issues

```typescript
// Check current status and recent changes
const { data: workOrder } = await supabase
  .from('work_orders')
  .select(`
    status,
    audit_logs!inner(
      action,
      new_values,
      created_at,
      user_id
    )
  `)
  .eq('id', workOrderId)
  .order('created_at', { foreignTable: 'audit_logs', ascending: false });
```

## Code Review Checklist

### ✅ Status Management Review

- [ ] No direct `work_orders.status` updates in application code
- [ ] All status changes use `useWorkOrderStatusManager` hook  
- [ ] Status change reasons provided for audit trail
- [ ] Error handling implemented for status change failures
- [ ] Loading states shown during status transitions

### ❌ Red Flags

- [ ] `supabase.from('work_orders').update({ status: ... })`
- [ ] Manual status field updates in forms
- [ ] Status changes without reason/context
- [ ] Missing error handling for status changes
- [ ] Bypassing the status manager "for performance"

## Developer Guidelines

### 1. Always Use the Hook
```typescript
const { changeStatus, isChangingStatus } = useWorkOrderStatusManager();
```

### 2. Provide Context
```typescript
await changeStatus(workOrderId, 'completed', 'All work verified complete');
```

### 3. Handle Errors
```typescript
const result = await changeStatus(workOrderId, newStatus, reason);
if (!result.success) {
  // Handle error appropriately
  toast.error(result.error || 'Status update failed');
}
```

### 4. Show Loading States
```typescript
<Button disabled={isChangingStatus}>
  {isChangingStatus ? 'Updating...' : 'Change Status'}
</Button>
```

## Related Documentation

- [Database Functions](./DATABASE_FUNCTIONS.md) - Complete function documentation
- [Email System](./EMAIL_SYSTEM.md) - How status changes trigger emails  
- [Audit Logging](./AUDIT_LOGGING.md) - Compliance and audit trail requirements
- [Component Architecture](./COMPONENT_ARCHITECTURE.md) - Status display components

---

**Last Updated:** December 2024  
**Next Review:** After any status workflow changes