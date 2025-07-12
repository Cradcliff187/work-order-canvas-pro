# Lovable Development Prompts

## Table Actions Dropdown Component

### Usage
The `TableActionsDropdown` component provides a consistent dropdown pattern for table row actions across the application.

```typescript
import { TableActionsDropdown } from "@/components/ui/table-actions-dropdown";
import { Eye, Edit, Trash2 } from "lucide-react";

// In your table column definition
const actions = [
  { 
    label: 'View Details', 
    icon: Eye, 
    onClick: () => onView(item) 
  },
  { 
    label: 'Edit', 
    icon: Edit, 
    onClick: () => onEdit(item),
    show: canEdit // Optional conditional rendering
  },
  { 
    label: 'Delete', 
    icon: Trash2, 
    onClick: () => onDelete(item), 
    variant: 'destructive' as const,
    show: canDelete
  }
];

<TableActionsDropdown actions={actions} align="end" />
```

### Props
- `actions`: Array of action objects with `label`, `icon`, `onClick`, optional `variant` and `show`
- `align`: Dropdown alignment ('start', 'center', 'end') - defaults to 'end'

### Features
- Consistent MoreHorizontal trigger button styling
- Automatic filtering of hidden actions (show: false)
- Destructive styling for dangerous actions
- Proper icon sizing (mr-2 h-4 w-4)
- TypeScript interfaces for type safety

## Table Actions Pattern

### Standard Action Order
Actions should follow this consistent order for optimal UX:

1. **View Details** - Safest action, primary information access
2. **Edit** - Modification actions
3. **Other Actions** - Status changes, toggles, etc.
4. **Delete** - Destructive actions (always last)

```typescript
// ✅ CORRECT: Safe to dangerous order
const actions = [
  { label: 'View Details', icon: Eye, onClick: () => onView(item) },
  { label: 'Edit', icon: Edit, onClick: () => onEdit(item) },
  { label: 'Toggle Active', icon: Power, onClick: () => onToggle(item) },
  { label: 'Delete', icon: Trash2, onClick: () => onDelete(item), variant: 'destructive' }
];
```

### Standard Icons
Use these icons for consistent user experience:

- **View Details**: `Eye`
- **Edit**: `Edit`
- **Delete**: `Trash2`
- **Toggle Status**: `Power`
- **Approve**: `CheckCircle`
- **Reject**: `XCircle`
- **Download**: `Download`
- **Copy**: `Copy`

### Conditional Actions
Use the `show` property to conditionally render actions based on item state or user permissions:

```typescript
// Status-dependent actions
const getActions = (report: Report) => [
  { 
    label: 'View Details', 
    icon: Eye, 
    onClick: () => onView(report) 
  },
  { 
    label: 'Approve', 
    icon: CheckCircle, 
    onClick: () => onApprove(report),
    show: report.status === 'submitted' && canApprove
  },
  { 
    label: 'Reject', 
    icon: XCircle, 
    onClick: () => onReject(report),
    show: report.status === 'submitted' && canReject,
    variant: 'destructive'
  }
];
```

### Implementation Examples

#### Basic CRUD Actions
```typescript
import { TableActionsDropdown } from "@/components/ui/table-actions-dropdown";
import { Eye, Edit, Trash2 } from "lucide-react";

const userActions = [
  { label: 'View Profile', icon: Eye, onClick: () => onView(user) },
  { label: 'Edit User', icon: Edit, onClick: () => onEdit(user) },
  { 
    label: 'Delete User', 
    icon: Trash2, 
    onClick: () => onDelete(user),
    variant: 'destructive' as const,
    show: user.id !== currentUser.id // Don't allow self-deletion
  }
];
```

#### Status-Based Actions
```typescript
import { CheckCircle, XCircle, Eye } from "lucide-react";

const reportActions = [
  { label: 'View Report', icon: Eye, onClick: () => onView(report) },
  { 
    label: 'Approve', 
    icon: CheckCircle, 
    onClick: () => onApprove(report),
    show: report.status === 'submitted'
  },
  { 
    label: 'Reject', 
    icon: XCircle, 
    onClick: () => onReject(report),
    show: report.status === 'submitted',
    variant: 'destructive'
  }
];
```

### DO and DON'T Examples

#### ✅ DO
```typescript
// Consistent order, clear labels, proper icons
const actions = [
  { label: 'View Details', icon: Eye, onClick: () => onView(item) },
  { label: 'Edit', icon: Edit, onClick: () => onEdit(item) },
  { label: 'Delete', icon: Trash2, onClick: () => onDelete(item), variant: 'destructive' }
];
```

#### ❌ DON'T
```typescript
// Random order, vague labels, wrong icons
const actions = [
  { label: 'Remove', icon: Minus, onClick: () => onDelete(item) }, // Delete should be last
  { label: 'See', icon: Search, onClick: () => onView(item) }, // Use "View Details" and Eye icon
  { label: 'Change', icon: Settings, onClick: () => onEdit(item) } // Use "Edit" and Edit icon
];
```

### Column Definition Pattern
Add actions as the last column in your table definition:

```typescript
const columns = [
  // ... other columns
  {
    id: "actions",
    cell: ({ row }) => {
      const item = row.original;
      const actions = getActionsForItem(item);
      return <TableActionsDropdown actions={actions} align="end" />;
    },
  },
];
```

### Best Practices
- Always place actions column last
- Use `align="end"` for right-aligned dropdowns
- Implement conditional logic in a separate `getActions` function
- Use `variant: 'destructive'` for dangerous actions
- Keep action labels concise but descriptive
- Test keyboard navigation and screen reader accessibility