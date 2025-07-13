# Lovable Development Prompts

## Company Access Implementation Results ✅

### Executed Prompt: "Implement company-level access control for WorkOrderPro"

**Status**: ✅ **COMPLETED** - Full company access model implemented January 2025

**Implementation Summary**:
- ✅ **Database Functions**: Added `auth_user_organization_assignments()` for organization-based queries
- ✅ **RLS Policies**: Enhanced policies for company-level access with financial privacy
- ✅ **Business Logic**: Organization assignments support both individual and company access  
- ✅ **User Interface**: Team collaboration features enabled throughout application
- ✅ **Backward Compatibility**: Individual assignments continue working alongside organization access

**Business Impact**:
- **Team Collaboration**: Multiple organization members can work on same work orders
- **Financial Privacy**: Company-level financial data isolation between organizations
- **Scalable Access**: Add unlimited users to organizations without individual setup
- **User Experience**: Seamless transition with enhanced team capabilities

**Technical Implementation**:
- Enhanced `work_order_assignments` table with organization tracking
- Added company access patterns to all RLS policies for work orders, reports, and attachments
- Implemented `auth_user_organization_assignments()` function for organization-based queries
- Updated UI components to show organization-level access indicators

### Executed Prompt: "Add comprehensive documentation for company access model"

**Status**: ✅ **COMPLETED** - Full documentation suite updated January 2025

**Documentation Deliverables**:
- ✅ **Company Access Guide**: Complete business user guide (docs/COMPANY_ACCESS_GUIDE.md)
- ✅ **Updated README**: Enhanced with business model and company features
- ✅ **RLS Documentation**: Company access patterns and examples added
- ✅ **Database Documentation**: Organization relationships and assignment model
- ✅ **Migration History**: Company access implementation timeline
- ✅ **Implementation Plan**: Updated status showing completion

**Content Quality**:
- Real-world usage scenarios for each user type
- Step-by-step business workflows
- Troubleshooting guides for company access
- Before/after migration comparisons
- Cross-references between related documentation

## Component Development Standards

For comprehensive UI/UX guidelines, component patterns, and design standards, see:
- **[UI Design System](./UI_DESIGN_SYSTEM.md)** - Complete design system and component standards
- **[Development Guide](./DEVELOPMENT_GUIDE.md)** - Development workflow and testing patterns
- **[Database Functions](./DATABASE_FUNCTIONS.md)** - Database function reference
- **[RLS Policies](./RLS_POLICIES.md)** - Row Level Security documentation

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