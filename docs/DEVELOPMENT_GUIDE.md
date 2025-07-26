# WorkOrderPortal Development Guide

## Overview

This comprehensive guide provides everything developers need for productive WorkOrderPortal development, covering setup, incremental workflows, testing strategies, common pitfalls, and Lovable-specific best practices.

> **UI/UX Guidelines**: For complete design system, component standards, and accessibility requirements, see [UI Design System](./UI_DESIGN_SYSTEM.md).

## Quick Start & Setup

### Prerequisites

- **Node.js 18+** with npm
- **Supabase CLI** for Edge Function development
- **Git** for version control

### Environment Configuration

1. **Clone and Install**
   ```bash
   git clone <YOUR_GIT_URL>
   cd workorderportal
   npm install
   npm run dev
   ```

2. **Supabase Configuration**
   - **Project ID**: `inudoymofztrvxhrlrek`
   - **URL**: `https://inudoymofztrvxhrlrek.supabase.co`
   - **Configuration**: Managed in `supabase/config.toml`
   - **No .env file needed** - uses direct Supabase references

3. **Access Dev Tools**
   - Navigate to `/dev-tools` for development utilities
   - Database seeding, user creation, and system diagnostics

## Incremental Development Workflow

### 1. Database-First Approach

**Step 1: Schema Changes**
```bash
# Create migration for database changes
npx supabase migration new "feature_name"
# Edit the migration file with SQL changes
npx supabase db push
```

**Step 2: RLS Policies**
```sql
-- Create policies for new tables
CREATE POLICY "Users can view their own data" 
ON new_table FOR SELECT USING (auth.uid() = user_id);
```

**Step 3: Generate Types**
```bash
npx supabase gen types typescript > src/integrations/supabase/types.ts
```

### 2. Component Development Lifecycle

**Create Focused Components:**
```
src/components/
├── feature/           # Feature-specific components
│   ├── FeatureList.tsx
│   ├── FeatureCard.tsx
│   └── FeatureModal.tsx
├── ui/               # Reusable UI components
└── hooks/            # Custom React hooks
```

**Use Lovable Component Patterns:**
- `TableActionsDropdown` for consistent table actions
- `DeleteConfirmationDialog` for destructive actions
- `EmptyTableState` for empty data states

### 3. Testing Integration Points

**Database Testing:**
```typescript
// 1. Seed test data
const { data } = await supabase.rpc('seed_test_data');

// 2. Create test users via edge function
const response = await supabase.functions.invoke('create-test-users');

// 3. Test with different roles
// Login with partner1@abc.com, sub1@pipes.com, etc.
```

**Component Testing:**
```typescript
// Test with different user types
const testScenarios = [
  { userType: 'admin', expectVisible: ['edit', 'delete'] },
  { userType: 'partner', expectVisible: ['view'] },
  { userType: 'subcontractor', expectVisible: ['report'] }
];
```

### 4. Feature Branch Workflow

1. **Create Feature Branch**: `git checkout -b feature/new-feature`
2. **Database Changes**: Create migrations and test with seed data
3. **Component Development**: Build UI components with role-based access
4. **Integration Testing**: Test with different user roles
5. **Documentation**: Update relevant docs
6. **Production Testing**: Use pre-deployment checklist

## Testing Strategy

### 3-Step Testing Workflow

**Step 1: Database Seeding**
```typescript
// Creates comprehensive business data
const { data } = await supabase.rpc('seed_test_data');
console.log('Created:', data.details.organizations_created, 'organizations');
```

**Step 2: User Creation**
```typescript
// Creates 5 real authenticated users across all roles
const response = await supabase.functions.invoke('create-test-users', {
  body: { admin_key: 'your-admin-key' }
});
```

**Step 3: Role-Based Testing**
- Login with different user credentials (password: `Test123!`)
- Test organization-level access control
- Verify role-specific permissions and UI

### Pre-Deployment Testing

#### Core Functionality
- [ ] **Authentication**: All user types can login successfully
- [ ] **RLS Policies**: Users only see appropriate data
- [ ] **Work Order Workflow**: Complete partner → assignment → completion flow
- [ ] **Financial Privacy**: Organizations cannot see each other's financial data
- [ ] **File Uploads**: Photos and attachments work correctly

#### User Journey Testing
- [ ] **Partner Journey**: Create work order → track progress → review completion
- [ ] **Subcontractor Journey**: View assignments → submit reports → manage invoices
- [ ] **Employee Journey**: Track time → manage receipts → view reports
- [ ] **Admin Journey**: Assign work → review reports → approve invoices

#### Cross-Browser & Mobile
- [ ] **Chrome/Firefox/Safari/Edge**: Full functionality
- [ ] **Mobile Responsiveness**: UI adapts to phone/tablet screens
- [ ] **Touch Interactions**: Camera access and touch gestures work

### Test Data Patterns

**Organizations (8 total):**
- 1 Internal: WorkOrderPortal Internal
- 3 Partners: ABC Property, XYZ Commercial, Premium Facilities
- 4 Subcontractors: Pipes & More, Sparks Electric, etc.

**Test Users (5 total):**
- `partner1@abc.com` / `partner2@xyz.com` - Partner users
- `sub1@pipes.com` / `sub2@sparks.com` - Subcontractor users
- `employee1@workorderportal.com` - Internal employee
- **Password**: `Test123!` for all users

## Common Pitfalls & Solutions

### Database Issues

**Issue**: `new row violates row-level security policy`
```typescript
// Solution: Ensure user_id is set correctly
const { data, error } = await supabase
  .from('profiles')
  .insert({ 
    ...profileData, 
    user_id: user.id // Must match authenticated user
  });
```

**Issue**: `Foreign key constraint violation`
```sql
-- Solution: Check dependencies and use transactions
BEGIN;
INSERT INTO organizations (...) RETURNING id;
INSERT INTO work_orders (organization_id, ...) VALUES (organization.id, ...);
COMMIT;
```

**Issue**: `Only administrators can seed test data`
```typescript
// Solution: Verify admin authentication
const { data: profile } = await supabase
  .from('profiles')
  .select('user_type')
  .eq('user_id', user?.id)
  .single();
console.log('User type:', profile?.user_type); // Should be 'admin'
```

### Authentication Issues

**Issue**: Auth state not persisting
```typescript
// Solution: Check session management
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  // Handle unauthenticated state
}
```

**Issue**: RLS policy testing
```sql
-- Test user belongs to organization
SELECT * FROM auth_user_organizations();
-- Test assignment-based access
SELECT * FROM auth_user_organization_assignments();
```

### Performance Issues

**Common Anti-Patterns:**
- N+1 queries in RLS policies
- Missing indexes on frequently queried columns
- Large data sets without pagination
- Blocking operations in component renders

**Solutions:**
```typescript
// Use React Query for efficient data fetching
const { data, isLoading } = useQuery({
  queryKey: ['work-orders', filters],
  queryFn: () => fetchWorkOrders(filters),
  staleTime: 5 * 60 * 1000 // 5 minutes
});

// Implement pagination
const { data, count } = await supabase
  .from('work_orders')
  .select('*', { count: 'exact' })
  .range(offset, offset + limit - 1);
```

## Lovable Development Tips

### Component Patterns

**Table Actions (Consistent UI)**
```typescript
import { TableActionsDropdown } from "@/components/ui/table-actions-dropdown";

const actions = [
  { label: 'View Details', icon: Eye, onClick: () => onView(item) },
  { label: 'Edit', icon: Edit, onClick: () => onEdit(item) },
  { 
    label: 'Delete', 
    icon: Trash2, 
    onClick: () => onDelete(item),
    variant: 'destructive',
    show: canDelete
  }
];

<TableActionsDropdown actions={actions} align="end" />
```

**Delete Confirmations**
```typescript
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";

<DeleteConfirmationDialog
  open={deleteDialogOpen}
  onOpenChange={setDeleteDialogOpen}
  onConfirm={handleDelete}
  itemName={`${user.first_name} ${user.last_name}`}
  itemType="user"
  isLoading={isDeleting}
/>
```

**Empty States**
```typescript
import { EmptyTableState } from "@/components/ui/empty-table-state";

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
```

### Accessibility Requirements

**ARIA Labels for All Interactive Elements:**
```typescript
<Checkbox aria-label={`Select ${user.first_name} ${user.last_name}`} />
<Button aria-label="Edit user profile">
  <Edit className="h-4 w-4" />
</Button>
```

**Keyboard Navigation:**
- Tab order through interactive elements
- Enter/Space to activate buttons
- Escape to close modals
- Arrow keys in dropdowns

**Screen Reader Support:**
```typescript
// Semantic HTML with proper headings
<h1>Dashboard</h1>
<h2>Work Orders</h2>
<h3>Recent Activity</h3>

// Status alerts
<div role="alert" aria-live="polite">
  {toast.message}
</div>
```

### Design System Usage

**Use Semantic Tokens (Never Direct Colors):**
```typescript
// ✅ CORRECT - Use design system tokens
className="bg-primary text-primary-foreground"
className="border-border text-foreground"

// ❌ WRONG - Direct colors
className="bg-blue-500 text-white"
className="border-gray-300 text-black"
```

**Component Variants:**
```typescript
// Extend shadcn components with custom variants
const buttonVariants = cva("...", {
  variants: {
    variant: {
      default: "bg-primary text-primary-foreground",
      destructive: "bg-destructive text-destructive-foreground",
      // Add custom variants using design tokens
      premium: "bg-gradient-primary text-white"
    }
  }
});
```

### Integration with Supabase

**Database Operations:**
```typescript
import { supabase } from "@/integrations/supabase/client";

// Use typed queries
const { data, error } = await supabase
  .from('work_orders')
  .select(`
    *,
    organization:organizations(*),
    trade:trades(*),
    assignments:work_order_assignments(*)
  `)
  .eq('status', 'assigned');
```

**Real-time Subscriptions:**
```typescript
useEffect(() => {
  const subscription = supabase
    .channel('work_orders')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'work_orders' },
      (payload) => {
        // Handle real-time updates
        queryClient.invalidateQueries(['work-orders']);
      }
    )
    .subscribe();

  return () => subscription.unsubscribe();
}, []);
```

## Troubleshooting Guide

### Debug Workflows

**Database Issues:**
1. Check Supabase Dashboard SQL Editor
2. Monitor function logs: `SELECT * FROM audit_logs ORDER BY created_at DESC;`
3. Test RLS policies with different user contexts

**Authentication Issues:**
1. Verify user session: `await supabase.auth.getUser()`
2. Check profile table: `SELECT * FROM profiles WHERE user_id = ?`
3. Test organization membership: `SELECT * FROM auth_user_organizations()`

**Performance Issues:**
1. Use browser dev tools Network tab
2. Monitor database query performance in Supabase
3. Check React Query cache status

### Development Tools

**Dev Tools Panel (`/dev-tools`):**
- Database seeding and cleanup
- Test user creation with real authentication
- System health diagnostics
- Real-time operation monitoring

**Browser Development:**
- React Developer Tools for component debugging
- Browser console for auth state
- Network tab for API call monitoring

### Support Resources

**Documentation:**
- Database schema: `docs/DATABASE_SCHEMA.md`
- RLS policies: `docs/RLS_POLICIES.md`
- API functions: `docs/DATABASE_FUNCTIONS.md`

**Development Commands:**
```bash
npm run dev                    # Start development server
npm run build                  # Build for production
npm run type-check             # TypeScript validation
supabase start                 # Start local Supabase
supabase db reset              # Reset local database
```

## Production Deployment

### Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Type checking clean
- [ ] Database migrations deployed
- [ ] Edge functions deployed
- [ ] Environment secrets configured
- [ ] Performance benchmarks met
- [ ] Security audit completed

### Monitoring & Maintenance

**Production Monitoring:**
- Set up Supabase alerts for errors
- Monitor database performance
- Track user authentication metrics
- Alert on unusual access patterns

**Regular Maintenance:**
- Review audit logs weekly
- Update dependencies monthly
- Performance review quarterly
- Security review quarterly

This development guide provides the complete workflow for building, testing, and deploying WorkOrderPortal features efficiently and reliably.
