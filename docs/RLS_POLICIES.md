# WorkOrderPro Row Level Security (RLS) Policies

## Overview

WorkOrderPro implements comprehensive Row Level Security (RLS) to ensure proper data isolation between different user types and organizations. The system uses 7 SECURITY DEFINER helper functions to avoid infinite recursion and provide efficient access control.

## User Types and Access Matrix

| User Type | Access Level | Description |
|-----------|--------------|-------------|
| **admin** | Full access to all data | System administrators with unrestricted access |
| **partner** | Organization-scoped access | Access limited to their organization's data |
| **subcontractor** | Assignment-based access | Access limited to work orders assigned to them |

## Helper Functions

All RLS policies use these SECURITY DEFINER functions to avoid infinite recursion:

### 1. auth_user_id()
```sql
CREATE OR REPLACE FUNCTION public.auth_user_id()
RETURNS uuid AS $$
BEGIN
  RETURN auth.uid();
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

### 2. auth_profile_id()
```sql
CREATE OR REPLACE FUNCTION public.auth_profile_id()
RETURNS uuid AS $$
BEGIN
  RETURN (
    SELECT id FROM public.profiles 
    WHERE user_id = auth.uid() LIMIT 1
  );
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

### 3. auth_user_type()
```sql
CREATE OR REPLACE FUNCTION public.auth_user_type()
RETURNS user_type AS $$
BEGIN
  RETURN (
    SELECT user_type FROM public.profiles 
    WHERE user_id = auth.uid() LIMIT 1
  );
EXCEPTION WHEN OTHERS THEN
  RETURN 'subcontractor'::public.user_type;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

### 4. auth_is_admin()
```sql
CREATE OR REPLACE FUNCTION public.auth_is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN public.auth_user_type() = 'admin';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

### 5. auth_user_organizations()
```sql
CREATE OR REPLACE FUNCTION public.auth_user_organizations()
RETURNS TABLE(organization_id uuid) AS $$
BEGIN
  RETURN QUERY
  SELECT uo.organization_id 
  FROM public.user_organizations uo
  WHERE uo.user_id = public.auth_profile_id();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

### 6. auth_user_belongs_to_organization(org_id uuid)
```sql
CREATE OR REPLACE FUNCTION public.auth_user_belongs_to_organization(org_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.auth_user_organizations() 
    WHERE organization_id = org_id
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

### 7. auth_user_assigned_to_work_order(wo_id uuid)
```sql
CREATE OR REPLACE FUNCTION public.auth_user_assigned_to_work_order(wo_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.work_orders wo
    WHERE wo.id = wo_id AND wo.assigned_to = public.auth_profile_id()
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

## RLS Policies by Table

### organizations

**Admins can manage all organizations**
```sql
Policy: ALL
Using: auth_is_admin()
With Check: auth_is_admin()
```

**Partners can view their organizations**
```sql
Policy: SELECT
Using: (auth_user_type() = 'partner' AND auth_user_belongs_to_organization(id))
```

**Subcontractors can view organizations they work for**
```sql
Policy: SELECT
Using: (auth_user_type() = 'subcontractor' AND id IN (
  SELECT DISTINCT wo.organization_id FROM work_orders wo 
  WHERE wo.assigned_to = auth_profile_id()
))
```

### user_organizations

**Admins can manage all user organizations**
```sql
Policy: ALL
Using: auth_is_admin()
With Check: auth_is_admin()
```

**Users can view their own organization relationships**
```sql
Policy: SELECT
Using: (user_id = auth_profile_id())
```

**Partners can manage their organization relationships**
```sql
Policy: ALL
Using: (auth_user_type() = 'partner' AND auth_user_belongs_to_organization(organization_id))
With Check: (auth_user_type() = 'partner' AND auth_user_belongs_to_organization(organization_id))
```

### profiles

**Admins can manage all profiles**
```sql
Policy: ALL
Using: auth_is_admin()
With Check: auth_is_admin()
```

**Authenticated users can view profiles**
```sql
Policy: SELECT
Using: true
```

**Users can update their own profile**
```sql
Policy: UPDATE
Using: (user_id = auth_user_id())
With Check: (user_id = auth_user_id())
```

**Users can insert their own profile**
```sql
Policy: INSERT
With Check: (user_id = auth_user_id())
```

### trades

**Admins can manage all trades**
```sql
Policy: ALL
Using: auth_is_admin()
With Check: auth_is_admin()
```

**Partners and subcontractors can view active trades**
```sql
Policy: SELECT
Using: (auth_user_type() = ANY(ARRAY['partner', 'subcontractor']) AND is_active = true)
```

### work_orders

**Admins can manage all work orders**
```sql
Policy: ALL
Using: auth_is_admin()
With Check: auth_is_admin()
```

**Partners can manage work orders in their organizations**
```sql
Policy: ALL
Using: (auth_user_type() = 'partner' AND auth_user_belongs_to_organization(organization_id))
With Check: (auth_user_type() = 'partner' AND auth_user_belongs_to_organization(organization_id))
```

**Subcontractors can view assigned work orders**
```sql
Policy: SELECT
Using: (auth_user_type() = 'subcontractor' AND auth_user_assigned_to_work_order(id))
```

### work_order_reports

**Admins can manage all work order reports**
```sql
Policy: ALL
Using: auth_is_admin()
With Check: auth_is_admin()
```

**Partners can view/update reports for their organization work orders**
```sql
Policy: SELECT, UPDATE
Using: (auth_user_type() = 'partner' AND work_order_id IN (
  SELECT wo.id FROM work_orders wo 
  WHERE auth_user_belongs_to_organization(wo.organization_id)
))
```

**Subcontractors can manage their own reports**
```sql
Policy: ALL
Using: (auth_user_type() = 'subcontractor' AND subcontractor_user_id = auth_profile_id())
With Check: (auth_user_type() = 'subcontractor' AND subcontractor_user_id = auth_profile_id())
```

### work_order_attachments

**Admins can manage all work order attachments**
```sql
Policy: ALL
Using: auth_is_admin()
With Check: auth_is_admin()
```

**Partners can view attachments for their organization work orders**
```sql
Policy: SELECT
Using: (auth_user_type() = 'partner' AND (
  work_order_id IN (SELECT wo.id FROM work_orders wo WHERE auth_user_belongs_to_organization(wo.organization_id))
  OR work_order_report_id IN (SELECT wor.id FROM work_order_reports wor 
     JOIN work_orders wo ON wo.id = wor.work_order_id 
     WHERE auth_user_belongs_to_organization(wo.organization_id))
))
```

**Subcontractors can manage attachments for their work**
```sql
Policy: ALL
Using: (auth_user_type() = 'subcontractor' AND (
  uploaded_by_user_id = auth_profile_id() 
  OR work_order_id IN (SELECT wo.id FROM work_orders wo WHERE auth_user_assigned_to_work_order(wo.id))
  OR work_order_report_id IN (SELECT wor.id FROM work_order_reports wor WHERE wor.subcontractor_user_id = auth_profile_id())
))
With Check: (auth_user_type() = 'subcontractor' AND uploaded_by_user_id = auth_profile_id())
```

### email_templates

**Admins can manage all email templates**
```sql
Policy: ALL
Using: auth_is_admin()
With Check: auth_is_admin()
```

**Partners and subcontractors can view active email templates**
```sql
Policy: SELECT
Using: (auth_user_type() = ANY(ARRAY['partner', 'subcontractor']) AND is_active = true)
```

### email_logs

**Admins can view all email logs**
```sql
Policy: SELECT
Using: auth_is_admin()
```

**Partners can view email logs for their organization**
```sql
Policy: SELECT
Using: (auth_user_type() = 'partner' AND work_order_id IN (
  SELECT wo.id FROM work_orders wo 
  WHERE auth_user_belongs_to_organization(wo.organization_id)
))
```

### email_settings

**Admins can manage all email settings**
```sql
Policy: ALL
Using: auth_is_admin()
With Check: auth_is_admin()
```

### system_settings

**Admins can manage all system settings**
```sql
Policy: ALL
Using: auth_is_admin()
With Check: auth_is_admin()
```

### audit_logs

**Admins can view all audit logs**
```sql
Policy: SELECT
Using: auth_is_admin()
```

## Access Examples by User Type

### Admin User Access
```sql
-- Can access everything
SELECT * FROM work_orders; -- All work orders
SELECT * FROM audit_logs;   -- All audit records
SELECT * FROM profiles;     -- All user profiles
```

### Partner User Access
```sql
-- Only their organization's data
SELECT * FROM work_orders 
WHERE auth_user_belongs_to_organization(organization_id);

-- Can see reports for their organization's work orders
SELECT * FROM work_order_reports wor
JOIN work_orders wo ON wo.id = wor.work_order_id
WHERE auth_user_belongs_to_organization(wo.organization_id);
```

### Subcontractor User Access
```sql
-- Only assigned work orders
SELECT * FROM work_orders 
WHERE auth_user_assigned_to_work_order(id);

-- Only their own reports
SELECT * FROM work_order_reports 
WHERE subcontractor_user_id = auth_profile_id();
```

## Policy Naming Conventions

1. **Action First**: "Admins can manage all...", "Users can view their own..."
2. **Scope Clarity**: Clearly indicate what data scope the policy covers
3. **User Type Specific**: Include user type when policy is role-specific
4. **Descriptive**: Policy name should explain the access being granted

## Troubleshooting Common RLS Issues

### Issue: "Row violates row-level security policy"

**Cause**: Trying to insert/update data that violates WITH CHECK expression

**Solution**: Ensure required fields are set correctly
```sql
-- For work_orders, ensure organization_id is set for partners
INSERT INTO work_orders (title, organization_id, created_by) 
VALUES ('Test', 'user_org_id', auth_profile_id());
```

### Issue: "No rows returned" when data should exist

**Cause**: RLS policy preventing access to expected data

**Debug Steps**:
1. Check user type: `SELECT auth_user_type();`
2. Check organization membership: `SELECT * FROM auth_user_organizations();`
3. Verify policy conditions match your query

### Issue: "Function does not exist" errors

**Cause**: Helper functions not properly created or wrong schema

**Solution**: Ensure all helper functions exist in public schema with SECURITY DEFINER

### Issue: Performance problems with RLS

**Optimization**:
1. Use appropriate indexes on filtered columns
2. Ensure helper functions are marked STABLE
3. Consider materialized views for complex access patterns

## Performance Considerations

### Indexes Supporting RLS

Key indexes that support RLS performance:
```sql
-- Organization membership lookups
CREATE INDEX idx_user_organizations_user_id ON user_organizations(user_id);
CREATE INDEX idx_user_organizations_org_id ON user_organizations(organization_id);

-- Work order assignments
CREATE INDEX idx_work_orders_assigned_to ON work_orders(assigned_to);
CREATE INDEX idx_work_orders_organization_id ON work_orders(organization_id);

-- Profile lookups
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_user_type ON profiles(user_type);
```

### Function Performance

- All helper functions use STABLE qualifier for caching
- SECURITY DEFINER prevents infinite recursion
- Functions avoid complex JOINs where possible

## Related Documentation

- [Database Schema](./DATABASE_SCHEMA.md) - Complete table structure
- [Database Functions](./DATABASE_FUNCTIONS.md) - All helper function details  
- [Audit System](./AUDIT_SYSTEM.md) - How audit logging interacts with RLS