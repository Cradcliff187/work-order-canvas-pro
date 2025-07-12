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