# WorkOrderPro Development Guide

## Overview

This guide covers local development setup, testing procedures, and common development workflows for WorkOrderPro. The application uses database function-based seeding for secure, server-side data initialization.

## Local Development Setup

### Prerequisites

- **Node.js 18+** with npm
- **Supabase CLI** for Edge Function development
- **Git** for version control

### Environment Configuration

1. **Clone the Repository**
   ```bash
   git clone <YOUR_GIT_URL>
   cd workorderpro
   npm install
   ```

2. **Environment Variables**
   ```bash
   # No .env file needed - project uses direct Supabase references
   # All configuration is handled through supabase/config.toml
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

### Supabase Configuration

The project connects to a live Supabase instance with these settings:
- **Project ID**: `inudoymofztrvxhrlrek`
- **URL**: `https://inudoymofztrvxhrlrek.supabase.co`
- **Configuration**: Managed in `supabase/config.toml`

## Database Function Development

### Database Seeding Workflow

#### Using Dev Tools Panel (Recommended)

1. Navigate to `/dev-tools` in your browser
2. Use the **Database Seeding** section:
   - **Seed Database**: Populate with test data using `seed_test_data()` function
   - **Clear Test Data**: Remove all test data using `clear_test_data()` function

#### Programmatic Seeding

```typescript
// Seed database with test data
const { data, error } = await supabase.rpc('seed_test_data');

if (error) {
  console.error('Seeding failed:', error);
} else {
  console.log('Seeding successful:', data.details);
}

// Clear test data
const { data, error } = await supabase.rpc('clear_test_data');

if (error) {
  console.error('Clear failed:', error);
} else {
  console.log('Clear successful:', data.deleted_counts);
}
```

## Development Tools

### Dev Tools Panel Features

Access at `/dev-tools` for comprehensive development utilities:

**Database Operations:**
- **Database Seeding**: Comprehensive test data creation with constraint compliance
- **Test Data Cleanup**: Foreign key safe cleanup with admin protection
- **Real-time Results**: Detailed success/failure reporting with count summaries

**User Management:**
- **Create Test Users**: Real authenticated users via edge function (5 users across all roles)
- **User Credentials Display**: Login information for testing different perspectives  
- **Organization Integration**: Automatic user-organization relationship creation
- **Role-Based Testing**: Admin, partner, subcontractor, and employee user types

**System Diagnostics:**
- **Authentication Status**: Current user type and permission verification
- **Database Connection**: Live connection and function health monitoring
- **Constraint Validation**: Real-time constraint compliance checking
- **Performance Metrics**: Operation timing and success rate tracking

### Complete Testing Workflow

**Step 1: Database Seeding**
```typescript
// Creates comprehensive business data with proper constraints
const { data } = await supabase.rpc('seed_test_data');
console.log('Created:', data.details.organizations_created, 'organizations');
```

**Step 2: User Creation**  
```typescript
// Creates 5 real authenticated users across all roles
const response = await fetch('/api/create-test-users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ admin_key: 'your-admin-key' })
});
```

**Step 3: Role-Based Testing**
- Login with different user credentials
- Test organization-level access control
- Verify role-specific permissions and UI
- Test team collaboration workflows

### Hot Reloading and Debugging

**React Development:**
- Vite provides instant hot reloading
- TypeScript errors display in browser console
- React Developer Tools recommended

**Database Debugging:**
- Use Supabase Dashboard SQL Editor
- Monitor database function logs in audit_logs table
- Check function execution with: `SELECT * FROM audit_logs WHERE action = 'STATUS_CHANGE' ORDER BY created_at DESC;`

## Testing Guide

### Test Data Patterns

**Test Organizations (8 total from seeding):**
- 1 Internal organization (WorkOrderPro Internal)
- 3 Partner organizations (ABC, XYZ, Premium)  
- 4 Subcontractor organizations (Pipes & More, Sparks Electric, etc.)

**Test Users (5 total from edge function):**
- **partner1@abc.com** - ABC Property Management partner user
- **partner2@xyz.com** - XYZ Commercial Properties partner user  
- **sub1@pipes.com** - Pipes & More Plumbing subcontractor
- **sub2@sparks.com** - Sparks Electric subcontractor
- **employee1@workorderpro.com** - Internal employee with rates

**Default Test Password:** `Test123!` (for all created users)

**Note**: Admin users are not created by the edge function. Use your existing admin account for administrative testing.

### User Credential Management

```typescript
// Test user login credentials (created by create-test-users edge function)
const testCredentials = {
  // Use your existing admin account - edge function doesn't create admin users
  admin: { email: 'your-admin@email.com', password: 'your-password' },
  
  // Created by edge function:
  partner1: { email: 'partner1@abc.com', password: 'Test123!' },
  partner2: { email: 'partner2@xyz.com', password: 'Test123!' },
  subcontractor1: { email: 'sub1@pipes.com', password: 'Test123!' },
  subcontractor2: { email: 'sub2@sparks.com', password: 'Test123!' },
  employee: { email: 'employee1@workorderpro.com', password: 'Test123!' }
};

// Access via DevTools after user creation
console.log('Test users created:', response.users);
```

### Organization Setup Testing

**Test Organization Access:**
1. **ABC Property Management**: 4 locations with structured numbering
2. **XYZ Commercial Properties**: 3 tech-focused locations
3. **Premium Facilities Group**: 3 luxury properties
4. **Pipes & More Plumbing**: 2-person plumbing team
5. **Sparks Electric**: Single electrician contractor

## Common Development Issues

### Database Function Errors

**Issue**: `Only administrators can seed test data`
```typescript
// Solution: Ensure you're logged in as an admin user
const { data: { user } } = await supabase.auth.getUser();
console.log('Current user:', user);

// Check user type in profiles table
const { data: profile } = await supabase
  .from('profiles')
  .select('user_type')
  .eq('user_id', user?.id)
  .single();

console.log('User type:', profile?.user_type);
```

**Issue**: `Foreign key constraint violation`
```sql
-- Solution: The functions handle dependencies automatically
-- If issues persist, check audit logs for details
SELECT * FROM audit_logs 
WHERE table_name IN ('organizations', 'profiles', 'work_orders')
ORDER BY created_at DESC
LIMIT 10;
```

### Database Connection Issues

**Issue**: `No API key provided` or connection errors
```typescript
// Solution: Verify Supabase client configuration
import { supabase } from "@/integrations/supabase/client";

// Check connection
const { data, error } = await supabase.from('profiles').select('count');
if (error) console.error('Database connection issue:', error);
```

**Issue**: `RLS Policy Violation` during testing
```typescript
// Solution: Use admin user for testing operations that require elevated permissions
// Or ensure proper user-organization relationships exist

// Test user belongs to organization
const { data } = await supabase.rpc('auth_user_belongs_to_organization', {
  org_id: 'organization-uuid'
});
```

### RLS Policy Testing

**Test Individual Access:**
```sql
-- Verify user can access their own profile
SELECT * FROM profiles WHERE user_id = auth.uid();

-- Test organization membership
SELECT * FROM auth_user_organizations();
```

**Test Company Access:**
```sql
-- Verify organization-level work order access
SELECT wo.* FROM work_orders wo 
WHERE auth_user_belongs_to_organization(wo.organization_id);

-- Test assignment-based access
SELECT * FROM auth_user_organization_assignments();
```

## Development Workflow Best Practices

### Database Changes

1. **Always use migrations** for schema changes
2. **Test with seeded data** to ensure compatibility
3. **Update RLS policies** when adding new tables
4. **Document changes** in `MIGRATION_HISTORY.md`

### Code Organization

```
src/
├── components/          # Reusable UI components
├── pages/              # Page-level components
├── hooks/              # Custom React hooks
├── lib/                # Utility functions
├── integrations/       # Supabase integration
└── types/              # TypeScript type definitions
```

### Testing Strategy

1. **Unit Testing**: Test individual components and hooks
2. **Integration Testing**: Test database operations with RLS
3. **User Journey Testing**: Test complete workflows
4. **Permission Testing**: Verify role-based access control

### Performance Considerations

**Database Optimization:**
- Use indexes on frequently queried columns
- Optimize RLS policies to avoid N+1 queries
- Monitor query performance in Supabase Dashboard

**Frontend Optimization:**
- Implement lazy loading for large data sets
- Use React Query for efficient data fetching
- Optimize bundle size with code splitting

### Security Best Practices

**Authentication:**
- Never expose service role keys in frontend code
- Use Edge Functions for privileged operations
- Implement proper session management

**Data Access:**
- Test RLS policies thoroughly
- Use principle of least privilege
- Audit user permissions regularly

**API Security:**
- Validate all inputs on server side
- Use proper CORS configuration
- Monitor for unusual access patterns

## Common Commands

```bash
# Development
npm run dev                          # Start development server
npm run build                        # Build for production
npm run type-check                   # TypeScript checking

# Supabase
supabase start                       # Start local Supabase
supabase db reset                    # Reset local database
supabase secrets list               # List configured secrets

# Database
supabase db dump --data-only        # Export data
supabase db push                     # Push schema changes
supabase gen types typescript       # Generate TypeScript types
```

This development guide provides all the essential information for productive local development using database functions for secure, reliable data management.