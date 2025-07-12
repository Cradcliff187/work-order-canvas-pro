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

## Delete Confirmation Dialog Component

### Usage
The `DeleteConfirmationDialog` component provides a standardized confirmation pattern for destructive actions across the application.

```typescript
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";

// In your component
const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
const [deletingItem, setDeletingItem] = useState<Item | null>(null);
const [isDeleting, setIsDeleting] = useState(false);

const handleDelete = async () => {
  if (!deletingItem) return;
  
  setIsDeleting(true);
  try {
    await deleteItem(deletingItem.id);
    setDeleteDialogOpen(false);
    setDeletingItem(null);
    toast.success("Item deleted successfully");
  } catch (error) {
    toast.error("Failed to delete item");
  } finally {
    setIsDeleting(false);
  }
};

<DeleteConfirmationDialog
  open={deleteDialogOpen}
  onOpenChange={setDeleteDialogOpen}
  onConfirm={handleDelete}
  itemName={deletingItem ? `${deletingItem.first_name} ${deletingItem.last_name}` : ''}
  itemType="user"
  isLoading={isDeleting}
/>
```

### Props
- `open`: Dialog open state (boolean)
- `onOpenChange`: Function to control dialog open state
- `onConfirm`: Function called when user confirms deletion
- `itemName`: Name/identifier of the item being deleted
- `itemType`: Type of item (e.g., "user", "organization", "report")
- `isLoading`: Loading state for async deletion (optional, defaults to false)

### Features
- Consistent destructive action styling
- Loading state support with disabled buttons
- Clear confirmation messaging
- Proper keyboard navigation and focus management
- ARIA labels for accessibility

### Integration with Table Actions
```typescript
// In your table actions
const actions = [
  { label: 'View Details', icon: Eye, onClick: () => onView(item) },
  { label: 'Edit', icon: Edit, onClick: () => onEdit(item) },
  { 
    label: 'Delete', 
    icon: Trash2, 
    onClick: () => {
      setDeletingItem(item);
      setDeleteDialogOpen(true);
    },
    variant: 'destructive'
  }
];
```

## Empty Table State Component

### Usage
The `EmptyTableState` component provides consistent empty state messaging across all table implementations.

```typescript
import { EmptyTableState } from "@/components/ui/empty-table-state";
import { Users, Plus } from "lucide-react";

// In your table body when no data
{data.length === 0 && (
  <EmptyTableState
    icon={Users}
    title="No users found"
    description="Get started by creating your first user account."
    action={{
      label: "Create User",
      onClick: () => setCreateModalOpen(true),
      icon: Plus
    }}
    colSpan={columns.length}
  />
)}
```

### Props
- `icon`: Icon component to display (optional, defaults to FileX)
- `title`: Main empty state message (required)
- `description`: Additional context message (optional)
- `action`: Action button configuration with `label`, `onClick`, and optional `icon`
- `colSpan`: Number of table columns to span (required)

### Common Patterns

#### With Search/Filter Context
```typescript
<EmptyTableState
  icon={Search}
  title={searchTerm ? "No results found" : "No users found"}
  description={searchTerm 
    ? `No users match "${searchTerm}". Try adjusting your search.`
    : "Get started by creating your first user account."
  }
  action={!searchTerm ? {
    label: "Create User",
    onClick: () => setCreateModalOpen(true),
    icon: Plus
  } : undefined}
  colSpan={columns.length}
/>
```

#### Without Action (Read-only)
```typescript
<EmptyTableState
  icon={FileText}
  title="No reports available"
  description="Reports will appear here once submitted."
  colSpan={columns.length}
/>
```

### Standard Icons by Context
- **Users**: `Users`
- **Organizations**: `Building`
- **Reports**: `FileText`
- **Invoices**: `Receipt`
- **Work Orders**: `Wrench`
- **Search Results**: `Search`
- **Generic**: `FileX` (default)

## Accessibility Requirements

### ARIA Labels
All interactive elements must include proper ARIA labels:

```typescript
// Table checkboxes
<Checkbox 
  aria-label="Select all" 
  checked={table.getIsAllPageRowsSelected()} 
/>

<Checkbox 
  aria-label={`Select ${user.first_name} ${user.last_name}`}
  checked={row.getIsSelected()} 
/>

// Navigation elements
<nav aria-label="breadcrumb">
  <ol className="breadcrumb">...</ol>
</nav>

// Action buttons
<Button aria-label="Edit user profile">
  <Edit className="h-4 w-4" />
</Button>
```

### Keyboard Navigation
- **Tab Order**: Logical tab sequence through interactive elements
- **Enter/Space**: Activate buttons and toggles
- **Escape**: Close modals, dropdowns, and overlays
- **Arrow Keys**: Navigate through dropdown options

```typescript
// Dropdown with keyboard support
<DropdownMenuContent onKeyDown={(e) => {
  if (e.key === 'Escape') {
    e.preventDefault();
    setOpen(false);
  }
}}>
```

### Screen Reader Support
- **Semantic HTML**: Use proper heading hierarchy (h1, h2, h3)
- **Table Headers**: Associate data cells with headers
- **Form Labels**: Explicit labels for all form inputs
- **Status Updates**: Use `role="alert"` for important notifications

```typescript
// Table headers
<TableHead>
  <span className="sr-only">Select</span>
  <Checkbox aria-label="Select all" />
</TableHead>

// Status alerts
<div role="alert" aria-live="polite">
  {toast.message}
</div>

// Form inputs
<Label htmlFor="email">Email Address</Label>
<Input id="email" type="email" aria-required="true" />
```

### Focus Management
- **Modal Dialogs**: Trap focus within dialog
- **Page Navigation**: Restore focus after route changes
- **Dynamic Content**: Move focus to new content when appropriate

```typescript
// Focus trap in modals
useEffect(() => {
  if (open) {
    const focusableElements = dialog.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusableElements?.length) {
      (focusableElements[0] as HTMLElement).focus();
    }
  }
}, [open]);
```

## Component Reference

### Data Display Components
- **TableActionsDropdown**: Standardized table row actions
- **EmptyTableState**: Consistent empty state messaging
- **DataTable**: Reusable table with sorting, filtering, pagination

### User Feedback Components
- **DeleteConfirmationDialog**: Confirmation for destructive actions
- **Toast**: Notification system for user feedback
- **LoadingSpinner**: Loading states and skeleton screens

### Navigation Components
- **Sidebar**: Admin navigation with role-based sections
- **Breadcrumb**: Page hierarchy navigation
- **Pagination**: Table and list pagination controls

### Form Components
- **Form**: React Hook Form integration with validation
- **Input**: Text inputs with error states
- **Select**: Dropdown selection with search
- **Textarea**: Multi-line text input
- **Checkbox**: Selection controls with proper labeling

## ViewUserModal Component

### Usage
The `ViewUserModal` provides a read-only modal for displaying comprehensive user information with clean card-based layout.

```typescript
import { ViewUserModal } from "@/components/admin/users/ViewUserModal";

// In your component
const [viewModalOpen, setViewModalOpen] = useState(false);
const [viewingUser, setViewingUser] = useState<User | null>(null);

const handleView = (user: User) => {
  setViewingUser(user);
  setViewModalOpen(true);
};

<ViewUserModal
  user={viewingUser}
  open={viewModalOpen}
  onOpenChange={setViewModalOpen}
  onEdit={(user) => {
    setViewModalOpen(false);
    handleEdit(user);
  }}
/>
```

### Props
- `user`: User object to display (User | null)
- `open`: Modal open state (boolean)
- `onOpenChange`: Function to control modal open state
- `onEdit`: Function called when edit button is clicked (optional)

### Features
- Card-based layout for information organization
- User type badges with appropriate styling
- Organization associations display
- Account status indicators
- Edit transition functionality
- Responsive design

## Email Template View Mode

### Usage
The `EmailTemplateEditor` supports multiple modes including a read-only view mode for displaying template content.

```typescript
import { EmailTemplateEditor } from "@/components/admin/EmailTemplateEditor";

// View mode for displaying existing templates
<EmailTemplateEditor
  template={selectedTemplate}
  mode="view"
  onSave={() => {}} // Required but not used in view mode
  onCancel={() => setViewMode(false)}
/>

// Edit mode for modifications
<EmailTemplateEditor
  template={selectedTemplate}
  mode="edit"
  onSave={handleSave}
  onCancel={handleCancel}
/>

// Create mode for new templates
<EmailTemplateEditor
  template={null}
  mode="create"
  onSave={handleCreate}
  onCancel={handleCancel}
/>
```

### Mode Props
- `mode`: 'view' | 'edit' | 'create'
- `template`: EmailTemplate object or null for create mode
- `onSave`: Save handler function
- `onCancel`: Cancel handler function

### Mode-Specific Behavior
- **View Mode**: Read-only fields, disabled toolbar, preview tab default, edit button
- **Edit Mode**: Editable fields, full toolbar, save/cancel buttons
- **Create Mode**: Empty fields, full toolbar, create/cancel buttons

## Bulk Delete Dialog Pattern

### Usage
Standardized pattern for bulk deletion operations with proper count handling and loading states.

```typescript
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";

// Bulk delete state management
const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
const [isBulkDeleting, setIsBulkDeleting] = useState(false);
const selectedItems = table.getFilteredSelectedRowModel().rows.map(row => row.original);

const handleBulkDelete = async () => {
  setIsBulkDeleting(true);
  try {
    await Promise.all(selectedItems.map(item => deleteItem(item.id)));
    setBulkDeleteOpen(false);
    table.resetRowSelection();
    toast.success(`${selectedItems.length} items deleted successfully`);
  } catch (error) {
    toast.error("Failed to delete some items");
  } finally {
    setIsBulkDeleting(false);
  }
};

<DeleteConfirmationDialog
  open={bulkDeleteOpen}
  onOpenChange={setBulkDeleteOpen}
  onConfirm={handleBulkDelete}
  itemName={`${selectedItems.length} ${selectedItems.length === 1 ? 'item' : 'items'}`}
  itemType="selected"
  isLoading={isBulkDeleting}
/>
```

### Bulk Actions Integration
```typescript
// Bulk actions bar component
{selectedCount > 0 && (
  <div className="flex items-center gap-2 p-4 bg-muted">
    <span>{selectedCount} selected</span>
    <Button
      variant="destructive"
      size="sm"
      onClick={() => setBulkDeleteOpen(true)}
    >
      Delete Selected
    </Button>
  </div>
)}
```

## Password Reset with Loading States

### Usage
Async password reset functionality with proper loading state management and user feedback.

```typescript
import { useToast } from "@/hooks/use-toast";

// State management
const [isResetting, setIsResetting] = useState<string | null>(null);
const { toast } = useToast();

const handleResetPassword = async (userId: string, userEmail: string) => {
  setIsResetting(userId);
  try {
    const { error } = await supabase.auth.admin.inviteUserByEmail(userEmail, {
      redirectTo: `${window.location.origin}/auth?type=password-reset`
    });
    
    if (error) throw error;
    
    toast({
      title: "Password reset sent",
      description: `Reset instructions sent to ${userEmail}`,
    });
  } catch (error) {
    toast({
      title: "Error",
      description: "Failed to send password reset email",
      variant: "destructive",
    });
  } finally {
    setIsResetting(null);
  }
};

// Button with loading state
<Button
  variant="outline"
  size="sm"
  onClick={() => handleResetPassword(user.id, user.email)}
  disabled={isResetting === user.id}
  aria-busy={isResetting === user.id}
>
  {isResetting === user.id ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Sending...
    </>
  ) : (
    <>
      <RotateCcw className="mr-2 h-4 w-4" />
      Reset Password
    </>
  )}
</Button>
```

### Loading State Best Practices
- Use `aria-busy` attribute during loading
- Disable buttons to prevent double-clicks
- Show loading spinner with descriptive text
- Provide success/error feedback via toast

## Enhanced Accessibility Features

### Focus Management Hook
```typescript
// Custom hook for modal focus management
import { useFocusManagement } from "@/hooks/useFocusManagement";

const MyModal = ({ open, onOpenChange }) => {
  const { dialogRef } = useFocusManagement(open);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent ref={dialogRef}>
        {/* Modal content */}
      </DialogContent>
    </Dialog>
  );
};
```

### Keyboard Navigation Hook
```typescript
// Enhanced keyboard navigation
import { useKeyboardNavigation } from "@/hooks/useKeyboardNavigation";

const SearchableDropdown = () => {
  const { handleKeyDown } = useKeyboardNavigation({
    onEscape: () => setOpen(false),
    onEnter: handleSelect,
    onArrowUp: focusPrevious,
    onArrowDown: focusNext
  });
  
  return (
    <div onKeyDown={handleKeyDown}>
      {/* Dropdown content */}
    </div>
  );
};
```

### aria-busy Implementation
```typescript
// Loading states with aria-busy
<form aria-busy={isSubmitting}>
  <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
    {isSubmitting ? 'Saving...' : 'Save'}
  </Button>
</form>

// Table with loading state
<table aria-busy={isLoading}>
  <tbody>
    {isLoading ? (
      <tr>
        <td colSpan={columns.length}>
          <div className="text-center py-4">Loading...</div>
        </td>
      </tr>
    ) : (
      // Table rows
    )}
  </tbody>
</table>
```

### Live Regions for Status Updates
```typescript
// Status announcements for screen readers
<div 
  role="status" 
  aria-live="polite" 
  aria-atomic="true"
  className="sr-only"
>
  {searchResults.length} results found
</div>

// Critical alerts
<div 
  role="alert" 
  aria-live="assertive"
  className="sr-only"
>
  {errorMessage}
</div>
```

## Enhanced Component Reference

### Data Display Components
- **TableActionsDropdown**: Standardized table row actions with accessibility
- **EmptyTableState**: Consistent empty state messaging
- **DataTable**: Reusable table with sorting, filtering, pagination
- **ViewUserModal**: Read-only user information display

### User Feedback Components
- **DeleteConfirmationDialog**: Confirmation for destructive actions with bulk support
- **Toast**: Notification system for user feedback
- **LoadingSpinner**: Loading states and skeleton screens

### Navigation Components
- **Sidebar**: Admin navigation with role-based sections and keyboard support
- **Breadcrumb**: Page hierarchy navigation with proper ARIA labels
- **Pagination**: Table and list pagination controls

### Form Components
- **Form**: React Hook Form integration with validation and accessibility
- **Input**: Text inputs with error states and ARIA attributes
- **Select**: Dropdown selection with search and keyboard navigation
- **Textarea**: Multi-line text input with proper labeling
- **Checkbox**: Selection controls with proper labeling and aria-busy support
- **EmailTemplateEditor**: Multi-mode template editing with view/edit/create modes

### Accessibility Hooks
- **useFocusManagement**: Modal focus trapping and restoration
- **useKeyboardNavigation**: Enhanced keyboard event handling

## Troubleshooting

### Common Accessibility Issues

#### Modal Focus Problems
```typescript
// ❌ WRONG: No focus management
<Dialog open={open}>
  <DialogContent>...</DialogContent>
</Dialog>

// ✅ CORRECT: Proper focus management
import { useFocusManagement } from "@/hooks/useFocusManagement";

const { dialogRef } = useFocusManagement(open);
<Dialog open={open}>
  <DialogContent ref={dialogRef}>...</DialogContent>
</Dialog>
```

#### Missing Loading States
```typescript
// ❌ WRONG: No loading feedback
<Button onClick={handleSubmit}>Submit</Button>

// ✅ CORRECT: Loading state with aria-busy
<Button 
  onClick={handleSubmit} 
  disabled={isLoading}
  aria-busy={isLoading}
>
  {isLoading ? 'Submitting...' : 'Submit'}
</Button>
```

#### Table Accessibility Issues
```typescript
// ❌ WRONG: No ARIA labels on actions
<Button onClick={() => edit(user)}>
  <Edit className="h-4 w-4" />
</Button>

// ✅ CORRECT: Descriptive ARIA labels
<Button 
  onClick={() => edit(user)}
  aria-label={`Edit ${user.first_name} ${user.last_name}`}
>
  <Edit className="h-4 w-4" />
</Button>
```

### Bulk Operations Error Handling
- Always provide count-specific feedback
- Handle partial failures gracefully
- Reset selection after successful operations
- Use appropriate loading states for long operations

### Form Validation Tips
- Associate error messages with form fields using `aria-describedby`
- Use `aria-invalid` on fields with errors
- Group related fields with `fieldset` and `legend`
- Provide clear success feedback after form submission

### Best Practices
- Use semantic HTML elements for proper structure
- Include ARIA labels for all interactive elements
- Test with keyboard navigation only
- Verify screen reader compatibility
- Maintain consistent focus indicators
- Provide clear error messages and validation feedback
- Implement proper loading states with aria-busy
- Use live regions for dynamic content updates