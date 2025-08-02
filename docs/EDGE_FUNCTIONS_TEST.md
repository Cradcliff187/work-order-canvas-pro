# Edge Functions Testing Guide

## Overview

This guide provides comprehensive testing procedures for WorkOrderPro Edge Functions, covering pre-deployment validation, post-deployment verification, and troubleshooting common issues.

## Pre-Deployment Checklist

### 1. Local Development Setup

**Environment Verification**:
```bash
# Verify Supabase CLI installation
supabase --version

# Check Deno installation (required for Edge Functions)
deno --version

# Verify project initialization
supabase status
```

**Required Files Check**:
- [ ] `supabase/config.toml` exists and is properly configured
- [ ] Edge Function directories exist in `supabase/functions/`
- [ ] All functions have `index.ts` files
- [ ] Shared dependencies are in `supabase/functions/_shared/`

### 2. Function Configuration Validation

**Check supabase/config.toml**:
```toml
# Verify project ID is correct
project_id = "inudoymofztrvxhrlrek"

# Confirm function configurations
[functions.create-admin-user]
verify_jwt = true

[functions.setup-test-environment]
verify_jwt = false

[functions.send-email]
verify_jwt = false

[functions.password-reset-email]
verify_jwt = false

[functions.process-email-queue]
verify_jwt = false
```

**Environment Variables**:
```bash
# Local development (.env.local)
SUPABASE_URL=https://inudoymofztrvxhrlrek.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Security Settings Review

**Authentication Requirements**:
- [ ] Protected functions require JWT verification
- [ ] Public functions (webhooks, emails) have JWT disabled
- [ ] Admin functions validate admin_key parameter
- [ ] Service role key is used for privileged operations

**CORS Configuration**:
```javascript
// Verify CORS headers in all functions
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Check OPTIONS handler exists
if (req.method === 'OPTIONS') {
  return new Response(null, { headers: corsHeaders });
}
```

### 4. Code Quality Validation

**Function Structure**:
- [ ] Proper error handling with try-catch blocks
- [ ] Consistent response format (success/error)
- [ ] Comprehensive logging for debugging
- [ ] Input validation and sanitization
- [ ] Proper TypeScript types where applicable

**Performance Considerations**:
- [ ] Database queries are optimized
- [ ] Batch operations for multiple records
- [ ] Proper transaction handling
- [ ] Memory usage is reasonable for function limits

## Post-Deployment Verification

### 1. Function Deployment Status

**List All Functions**:
```bash
supabase functions list
```

**Expected Functions**:
- `create-admin-user` - Admin user creation (protected)
- `setup-test-environment` - Complete test environment setup (public)
- `send-email` - Email sending handler (public)
- `password-reset-email` - Password reset handling (public)
- `process-email-queue` - Email queue processing (public)

### 2. Individual Function Testing

**Test Protected Functions**:
```bash
# Test create-admin-user function (requires admin authentication)
curl -X POST https://inudoymofztrvxhrlrek.supabase.co/functions/v1/create-admin-user \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SESSION_TOKEN" \
  -d '{
    "userData": {
      "email": "test@example.com",
      "first_name": "Test",
      "last_name": "User",
      "organization_id": "uuid-of-organization",
      "organization_role": "admin"
    },
    "send_welcome_email": true
  }'
```

**Test Public Functions**:
```bash
# Test setup-test-environment function (no auth required)
curl -X POST https://inudoymofztrvxhrlrek.supabase.co/functions/v1/setup-test-environment \
  -H "Content-Type: application/json" \
  -d '{
    "options": {
      "clear_existing": false,
      "include_test_data": true
    }
  }'

# Test password-reset-email function (no auth required)
curl -X POST https://inudoymofztrvxhrlrek.supabase.co/functions/v1/password-reset-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com"
  }'

# Test process-email-queue function (no auth required)
curl -X POST https://inudoymofztrvxhrlrek.supabase.co/functions/v1/process-email-queue \
  -H "Content-Type: application/json" \
  -d '{}'

# Test send-email function (no auth required)
curl -X POST https://inudoymofztrvxhrlrek.supabase.co/functions/v1/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "template_name": "test_email",
    "record_id": "test-record-id",
    "test_mode": true,
    "test_recipient": "test@example.com"
  }'
```

### 3. Integration Testing Procedures

**Database Seeding Flow**:
1. Clear existing test data (dry run first)
2. Seed fresh test data 
3. Verify data integrity
4. Test user authentication with seeded accounts
5. Create test work orders
6. Submit test reports
7. Test email notifications (handled by Supabase Auth)

**User Creation Flow**:
1. Create test users via `create-test-users` function
2. Verify user profiles are created correctly
3. Test authentication with generated credentials
4. Verify organization assignments
5. Test role-based access control

## Test Data Validation Queries

### 1. Organization Data Verification

```sql
-- Check seeded organizations
SELECT 
  name, 
  organization_type, 
  initials, 
  contact_email,
  is_active,
  next_sequence_number
FROM organizations 
ORDER BY created_at DESC;

-- Expected results:
-- 5+ organizations with different types (partner, subcontractor, internal)
-- Valid initials for work order numbering
-- Proper contact information
-- Active status = true
```

### 2. User Profile Validation

```sql
-- Verify user creation and types
SELECT 
  email, 
  user_type, 
  is_employee,
  first_name,
  last_name,
  is_active,
  company_name
FROM profiles 
ORDER BY created_at DESC;

-- Expected results:
-- Multiple user types represented (admin, partner, subcontractor, employee)
-- Valid email addresses
-- Proper employee flag settings
-- Active status = true
```

### 3. Work Order Status Checks

```sql
-- Validate work orders and status distribution
SELECT 
  work_order_number,
  status,
  organization_id,
  assigned_to,
  trade_id,
  created_by,
  date_submitted,
  date_assigned
FROM work_orders 
ORDER BY created_at DESC;

-- Verify work order numbering
SELECT 
  wo.work_order_number,
  o.initials,
  o.name as organization_name
FROM work_orders wo
JOIN organizations o ON o.id = wo.organization_id
WHERE wo.work_order_number IS NOT NULL
ORDER BY wo.created_at DESC;

-- Expected results:
-- Unique work order numbers
-- Various status values (received, assigned, in_progress, completed)
-- Proper organization relationships
-- Valid trade assignments
```

### 4. Email Log Verification

```sql
-- Check email delivery tracking
SELECT 
  template_used,
  status,
  recipient_email,
  work_order_id,
  sent_at,
  delivered_at,
  error_message
FROM email_logs 
ORDER BY sent_at DESC 
LIMIT 20;

-- Verify email template coverage
SELECT 
  template_used,
  COUNT(*) as email_count,
  COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_count
FROM email_logs 
GROUP BY template_used
ORDER BY email_count DESC;

-- Expected results:
-- Multiple email types sent
-- High delivery success rate
-- Minimal error messages
-- Recent timestamps
```

### 5. Assignment and Report Validation

```sql
-- Check work order assignments
SELECT 
  woa.assignment_type,
  p.email as assigned_to_email,
  wo.work_order_number,
  wo.status,
  woa.assigned_at
FROM work_order_assignments woa
JOIN profiles p ON p.id = woa.assigned_to
JOIN work_orders wo ON wo.id = woa.work_order_id
ORDER BY woa.assigned_at DESC;

-- Verify work order reports
SELECT 
  wor.status as report_status,
  wo.work_order_number,
  p.email as subcontractor_email,
  wor.invoice_amount,
  wor.submitted_at,
  wor.reviewed_at
FROM work_order_reports wor
JOIN work_orders wo ON wo.id = wor.work_order_id
JOIN profiles p ON p.id = wor.subcontractor_user_id
ORDER BY wor.submitted_at DESC;

-- Expected results:
-- Various assignment types (lead, support)
-- Multiple report statuses (submitted, approved, rejected)
-- Reasonable invoice amounts
-- Proper timing of submissions and reviews
```

## Common Issues and Solutions

### 1. Deployment Issues

**Function Not Deploying**:
```
Error: Function deployment failed
```
**Solutions**:
- Check function syntax with `deno check index.ts`
- Verify all imports are available in Deno environment
- Ensure function exports a default handler
- Review function size limits (50MB uncompressed)

**Missing Dependencies**:
```
Error: Cannot resolve module
```
**Solutions**:
- Use full URLs for external imports: `https://deno.land/std/...`
- Verify shared modules are in `_shared/` directory
- Check import paths are correct and case-sensitive
- Use only Deno-compatible packages

### 2. Runtime Errors

**Database Connection Issues**:
```
Error: relation "table_name" does not exist
```
**Solutions**:
- Verify database schema is up to date
- Check RLS policies allow function access
- Ensure service role key has proper permissions
- Run migrations if schema changes are pending

**Authentication Failures**:
```
Error: JWT verification failed
```
**Solutions**:
- Check JWT verification settings in config.toml
- Verify anon key is valid and matches project
- Ensure Authorization header format: `Bearer token`
- Use service role key for admin operations

**Memory/Timeout Issues**:
```
Error: Function execution timeout
```
**Solutions**:
- Optimize database queries (add indexes, limit results)
- Reduce batch sizes for bulk operations
- Implement pagination for large datasets
- Break complex operations into smaller functions

### 3. Email Integration Issues

**User Creation Function Failures**:
```
Error: Failed to create user
```
**Solutions**:
- Verify admin authentication credentials
- Check user data validation requirements
- Ensure organization exists for assignment
- Validate email format and uniqueness

**Email Processing Issues**:
```
Error: Email confirmation failed
```
**Solutions**:
- Email handling is managed by Supabase Auth automatically
- Check Supabase dashboard for email delivery status
- Verify user has confirmed their email if required
- Check email logs table for delivery tracking

### 4. Data Validation Issues

**Foreign Key Violations**:
```
Error: insert or update on table violates foreign key constraint
```
**Solutions**:
- Ensure referenced records exist before creating relationships
- Use proper transaction ordering (parents before children)
- Implement proper error handling for missing references
- Use upsert operations for reference data

**Duplicate Key Errors**:
```
Error: duplicate key value violates unique constraint
```
**Solutions**:
- Use upsert operations with `onConflict` for reference data
- Implement proper cleanup before seeding
- Check for existing data before insertion
- Use unique identifiers (UUIDs) for test data

## Performance Testing

### 1. Load Testing

**Concurrent Function Calls**:
```bash
# Test multiple concurrent setup operations
for i in {1..3}; do
  curl -X POST https://inudoymofztrvxhrlrek.supabase.co/functions/v1/setup-test-environment \
    -H "Content-Type: application/json" \
    -d '{"options": {"clear_existing": false}}' &
done
wait

# Test concurrent email processing
for i in {1..5}; do
  curl -X POST https://inudoymofztrvxhrlrek.supabase.co/functions/v1/process-email-queue \
    -H "Content-Type: application/json" \
    -d '{}' &
done
wait
```

**Memory Usage Monitoring**:
```javascript
// Add to function for memory tracking
const getMemoryUsage = () => {
  if (typeof Deno !== 'undefined' && Deno.memoryUsage) {
    return Deno.memoryUsage();
  }
  return null;
};

console.log('Memory before operation:', getMemoryUsage());
// ... perform operations
console.log('Memory after operation:', getMemoryUsage());
```

### 2. Performance Benchmarks

**Expected Performance Targets**:
- `setup-test-environment`: < 15 seconds for complete setup
- `create-admin-user`: < 3 seconds per user creation
- `send-email`: < 2 seconds per email
- `process-email-queue`: < 5 seconds per batch
- `password-reset-email`: < 3 seconds per request

**Database Query Optimization**:
```sql
-- Check query performance
EXPLAIN ANALYZE SELECT * FROM work_orders WHERE status = 'received';

-- Monitor slow queries
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
WHERE mean_exec_time > 1000 
ORDER BY mean_exec_time DESC;
```

## Maintenance and Monitoring

### 1. Regular Health Checks

**Daily Checks**:
- Function deployment status
- Error rates in function logs
- Email delivery success rates
- Database connection health

**Weekly Reviews**:
- Function performance metrics
- Storage usage for attachments
- Email template effectiveness
- Error pattern analysis

### 2. Alerting Setup

**Critical Alerts**:
- Function deployment failures
- High error rates (>5%)
- Email delivery failures
- Database connection issues

**Performance Alerts**:
- Function execution time >30 seconds
- Memory usage >80% of limit
- Database query timeout errors
- Storage bucket quota warnings

### 3. Documentation Updates

**Keep Current**:
- Function configurations in config.toml
- Environment variable requirements
- API endpoint documentation
- Testing procedures and expected results
- Known issues and workarounds

This comprehensive testing guide ensures reliable Edge Function deployment and operation in the WorkOrderPro system.