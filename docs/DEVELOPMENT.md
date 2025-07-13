# WorkOrderPro Development Guide

## Overview

This guide covers local development setup, testing procedures, and common development workflows for WorkOrderPro. The application uses Edge Function-based database seeding for secure, server-side data initialization.

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

## Edge Function Development

### Local Edge Function Testing

```bash
# Start Supabase locally (optional for Edge Function development)
supabase start

# Serve Edge Functions locally with debugging
supabase functions serve --debug seed-database

# Test Edge Function
curl -X POST 'http://localhost:54321/functions/v1/seed-database' \
  -H 'Content-Type: application/json' \
  -d '{"admin_key": "test-admin-key"}'
```

### Edge Function Logs

```bash
# View logs for specific function
supabase functions logs seed-database

# Stream real-time logs
supabase functions logs --follow
```

### Database Seeding Workflow

#### Using Dev Tools Panel (Recommended)

1. Navigate to `/dev-tools` in your browser
2. Use the **Database Seeding** section:
   - **Seed Database**: Populate with test data
   - **Clear Test Data**: Remove all test data
   - **Dry Run**: Preview deletion without changes

#### Programmatic Seeding

```typescript
// Seed database with test data
const seedResponse = await supabase.functions.invoke('seed-database', {
  body: { admin_key: 'your-admin-key' }
});

// Clear test data
const clearResponse = await supabase.functions.invoke('clear-test-data', {
  body: { admin_key: 'your-admin-key', dry_run: false }
});
```

## Development Tools

### Dev Tools Panel Features

Access at `/dev-tools` for comprehensive development utilities:

**Database Operations:**
- Database seeding with test organizations and users
- Test data cleanup with foreign key safety
- Dry run options for safe preview

**User Management:**
- Test user credentials display
- Organization membership verification
- User type and permission testing

**System Diagnostics:**
- Authentication status monitoring
- Database connection verification
- Edge Function health checks

### Hot Reloading and Debugging

**React Development:**
- Vite provides instant hot reloading
- TypeScript errors display in browser console
- React Developer Tools recommended

**Database Debugging:**
- Use Supabase Dashboard SQL Editor
- Enable Edge Function debug mode: `supabase functions serve --debug`
- Monitor real-time logs: `supabase functions logs --follow`

## Testing Guide

### Test Data Patterns

**Test Organizations (8 total):**
- 1 Internal organization (WorkOrderPro Internal)
- 3 Partner organizations (ABC, XYZ, Premium)
- 4 Subcontractor organizations (Pipes & More, Sparks Electric, etc.)

**Test Users (14 total):**
- 2 Admin users: `admin@workorderpro.com`, `employee@workorderpro.com`
- 3 Internal employees with different rates ($35-$75/hr)
- 3 Partner users representing different organizations
- 6 Subcontractor users across various trades

**Default Test Password:** `Test123!`

### User Credential Management

```typescript
// Test user login credentials
const testCredentials = {
  admin: { email: 'admin@workorderpro.com', password: 'Test123!' },
  partner: { email: 'partner1@abc.com', password: 'Test123!' },
  subcontractor: { email: 'plumber1@trade.com', password: 'Test123!' },
  employee: { email: 'senior@workorderpro.com', password: 'Test123!' }
};
```

### Organization Setup Testing

**Test Organization Access:**
1. **ABC Property Management**: 4 locations with structured numbering
2. **XYZ Commercial Properties**: 3 tech-focused locations
3. **Premium Facilities Group**: 3 luxury properties
4. **Pipes & More Plumbing**: 2-person plumbing team
5. **Sparks Electric**: Single electrician contractor

## Common Development Issues

### Edge Function Deployment Errors

**Issue**: `FunctionsHttpError: Edge Function returned a non-2xx status code`
```bash
# Solution 1: Check function logs
supabase functions logs seed-database --limit 50

# Solution 2: Verify admin key configuration
# Check that your admin key matches the expected value

# Solution 3: Test with curl
curl -X POST 'https://inudoymofztrvxhrlrek.supabase.co/functions/v1/seed-database' \
  -H 'Content-Type: application/json' \
  -d '{"admin_key": "your-admin-key"}'
```

**Issue**: `UnauthorizedError: Admin key validation failed`
```bash
# Solution: Configure proper admin key
# 1. Check supabase secrets: supabase secrets list
# 2. Set admin key: supabase secrets set ADMIN_SEEDING_KEY=your-key
# 3. Redeploy functions: supabase functions deploy
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
supabase functions deploy            # Deploy all Edge Functions
supabase secrets list               # List configured secrets

# Database
supabase db dump --data-only        # Export data
supabase db push                     # Push schema changes
supabase gen types typescript       # Generate TypeScript types
```

This development guide provides all the essential information for productive local development while maintaining the security and integrity of the WorkOrderPro system.