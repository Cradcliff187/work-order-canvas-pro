# WorkOrderPro Row Level Security (RLS) Policies

## Overview

WorkOrderPro implements comprehensive Row Level Security (RLS) to ensure proper data isolation between different user types and organizations. The system uses 7 SECURITY DEFINER helper functions and a layered policy approach to avoid infinite recursion while providing efficient access control.

## Infinite Recursion Prevention

**Critical Issue:** RLS policies that call helper functions which query the same table they're protecting cause infinite recursion errors.

**Solution:** A layered policy approach:
1. **Base Policies** - Use `auth.uid()` directly for basic self-access (no helper functions)
2. **Enhancement Policies** - Use helper functions safely after initial profile bootstrap

This ensures users can always fetch their own profile data, which then allows helper functions to work without recursion.

## User Types and Access Matrix

| User Type | Access Level | Description |
|-----------|--------------|-------------|
| **admin** | Full access to all data | System administrators with unrestricted access |
| **employee** | Full access to all profiles | Internal employees with broad operational access |
| **partner** | Organization-scoped access | Access limited to their organization's data (excluding employees) |
| **subcontractor** | Assignment-based access | Access limited to work orders assigned to them |

## Helper Functions

These SECURITY DEFINER helper functions are used in enhancement policies. **Critical:** Base policies should use `auth.uid()` directly to prevent recursion.

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

**CRITICAL: Anti-Recursion Design**

The profiles table policies must NEVER contain subqueries to the profiles table itself. This is the fundamental rule that prevents infinite recursion. Violations include:
- No `SELECT FROM profiles` in any policy
- No helper functions that query profiles  
- No EXISTS clauses referencing profiles
- Only `auth.uid()` direct comparisons allowed

**Current Policies (Minimal Bootstrap Set)**

**Users read own profile**
```sql
Policy: SELECT
Using: (user_id = auth.uid())
Note: Simple direct comparison - no recursion possible
```

**Authenticated users can read basic profile info**
```sql
Policy: SELECT
Using: (true)
To: authenticated
Note: Allows all authenticated users to read profile information. Safe because:
- READ-ONLY access (no modification rights)
- Business requirement (app needs to display user names)
- No recursion risk (simple 'true' condition)
- Existing INSERT/UPDATE/DELETE policies still restrict modifications
```

**Users update own profile**
```sql
Policy: UPDATE  
Using: (user_id = auth.uid())
With Check: (user_id = auth.uid())
Note: Simple direct comparison - no recursion possible
```

**Admins can update employee profiles**
```sql
Policy: UPDATE
Using: (auth_is_admin() AND is_employee = true)
With Check: (auth_is_admin() AND is_employee = true)
Note: Enhancement policy allowing admins to manage employee rates and details. Safe to use helper function as this operates after profile bootstrap.
```

**Users create own profile**
```sql
Policy: INSERT
With Check: (user_id = auth.uid())
Note: Simple direct comparison - no recursion possible
```

**Advanced Permissions**

Role-based access (admin, employee, partner, subcontractor) is handled in the application layer after the initial profile fetch succeeds. This prevents any possibility of RLS recursion while maintaining security through:

1. **Application-layer role checking** after profile data is retrieved
2. **Component-level access control** based on user type
3. **API route protection** using helper functions on other tables

**Why This Approach Works:**
- Profile fetch always succeeds (no recursion)
- Role-based logic happens in application code
- Other table policies can safely use helper functions that query profiles
- Clean separation of concerns between data access and authorization logic

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

### invoices

**Admins can manage all invoices**
```sql
Policy: ALL
Using: auth_is_admin()
With Check: auth_is_admin()
```

**Subcontractors can update modifiable invoices from their organization**
```sql
Policy: UPDATE
Using: (auth_user_type() = 'subcontractor' AND auth_user_belongs_to_organization(subcontractor_organization_id) AND status IN ('submitted', 'rejected'))
With Check: (auth_user_type() = 'subcontractor' AND auth_user_belongs_to_organization(subcontractor_organization_id) AND status IN ('submitted', 'rejected') AND approved_by IS NULL AND approved_at IS NULL AND paid_at IS NULL AND payment_reference IS NULL)
```

**Critical Security Features:**
- **Status Restrictions**: Subcontractors can only modify invoices with 'submitted' or 'rejected' status
- **Field Protection**: Prevents modification of approval_by, approved_at, paid_at, payment_reference fields
- **Validation Trigger**: `validate_invoice_status_change()` enforces status transition rules

### invoice_work_orders

**Admins can manage all invoice work orders**
```sql
Policy: ALL
Using: auth_is_admin()
With Check: auth_is_admin()
```

**Subcontractors can manage invoice work orders for modifiable invoices**
```sql
Policy: ALL
Using: (auth_user_type() = 'subcontractor' AND EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_id AND auth_user_belongs_to_organization(i.subcontractor_organization_id) AND i.status IN ('submitted', 'rejected')))
With Check: (Same as Using expression)
```

### employee_reports

**Admins can view all employee reports**
```sql
Policy: SELECT
Using: auth_is_admin()
```

**Admins can manage all employee reports**
```sql
Policy: ALL
Using: auth_is_admin()
With Check: auth_is_admin()
```

**Employees can view their own reports**
```sql
Policy: SELECT
Using: (employee_user_id = auth_profile_id())
```

**Employees can create their own reports**
```sql
Policy: INSERT
With Check: (employee_user_id = auth_profile_id())
```

**Employees can update their own reports**
```sql
Policy: UPDATE
Using: (employee_user_id = auth_profile_id())
```

### receipts

**Admins can view all receipts**
```sql
Policy: SELECT
Using: auth_is_admin()
```

**Admins can manage all receipts**
```sql
Policy: ALL
Using: auth_is_admin()
With Check: auth_is_admin()
```

**Employees can view their own receipts**
```sql
Policy: SELECT
Using: (employee_user_id = auth_profile_id())
```

**Employees can create their own receipts**
```sql
Policy: INSERT
With Check: (employee_user_id = auth_profile_id())
```

**Employees can update their own receipts**
```sql
Policy: UPDATE
Using: (employee_user_id = auth_profile_id())
```

### receipt_work_orders

**Admins can view all receipt allocations**
```sql
Policy: SELECT
Using: auth_is_admin()
```

**Admins can manage all receipt allocations**
```sql
Policy: ALL
Using: auth_is_admin()
With Check: auth_is_admin()
```

**Employees can view their receipt allocations**
```sql
Policy: SELECT
Using: (EXISTS (SELECT 1 FROM receipts r WHERE r.id = receipt_work_orders.receipt_id AND r.employee_user_id = auth_profile_id()))
```

**Employees can create their receipt allocations**
```sql
Policy: INSERT
With Check: (EXISTS (SELECT 1 FROM receipts r WHERE r.id = receipt_work_orders.receipt_id AND r.employee_user_id = auth_profile_id()))
```

### audit_logs

**Admins can view all audit logs**
```sql
Policy: SELECT
Using: auth_is_admin()
```

## Financial Data Access Patterns

### Organization-Level vs Individual-Level Access

**Organization-Level Access (Invoices)**
- Subcontractors access invoices through organization membership
- Uses `auth_user_belongs_to_organization()` helper function
- Restricted by invoice status ('submitted', 'rejected' only)

**Individual-Level Access (Reports & Receipts)**
- Employees access only their own reports and receipts
- Uses direct profile ID comparison (`employee_user_id = auth_profile_id()`)
- No status restrictions - employees have full CRUD access to their data

### Status-Based Security Model

**Invoice Status Transitions (Enforced by Trigger)**
```sql
-- Allowed transitions for subcontractors:
'rejected' → 'submitted'  -- Resubmit after rejection

-- Blocked transitions for subcontractors:
'submitted' → 'approved'  -- Only admins can approve
'submitted' → 'rejected'  -- Only admins can reject
'approved' → 'paid'       -- Only admins can mark as paid
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

### Issue: "Infinite recursion detected in policy for relation 'profiles'"

**Cause**: RLS policies calling helper functions that query the same table being protected

**Solution**: Use the layered policy approach:
1. Create base policies using `auth.uid()` directly (no helper functions)
2. Create enhancement policies that can safely use helper functions
3. Ensure the base policy allows users to read their own profile

**Example Fix**:
```sql
-- WRONG: This causes recursion
CREATE POLICY "Users can view profiles" ON profiles
FOR SELECT USING (auth_user_type() = 'admin'); -- auth_user_type() queries profiles!

-- CORRECT: Layered approach
-- Base policy - no recursion
CREATE POLICY "Users can read own profile" ON profiles 
FOR SELECT USING (user_id = auth.uid());

-- Enhancement policy - safe to use helper functions
CREATE POLICY "Admins can view all profiles" ON profiles
FOR SELECT USING (user_id = auth.uid() OR auth_user_type() = 'admin');
```

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

### Issue: "Subcontractors can only resubmit rejected invoices" error

**Cause**: Attempting to change invoice status in violation of business rules

**Solution**: Follow proper status transition workflow
```sql
-- WRONG: Direct status change from 'submitted' to 'approved'
UPDATE invoices SET status = 'approved' WHERE id = 'invoice_id';

-- CORRECT: Only admins can approve, subcontractors can only resubmit rejected
-- Subcontractor resubmitting after rejection:
UPDATE invoices SET status = 'submitted', external_invoice_number = 'INV-123' 
WHERE id = 'invoice_id' AND status = 'rejected';
```

### Issue: "Cannot modify approval or payment fields" error

**Cause**: Subcontractors trying to update protected financial fields

**Solution**: Only modify allowed fields for subcontractors
```sql
-- WRONG: Subcontractor trying to set approval fields
UPDATE invoices SET approved_by = 'admin_id', total_amount = 500.00 
WHERE id = 'invoice_id';

-- CORRECT: Subcontractor updating only allowed fields
UPDATE invoices SET total_amount = 500.00, external_invoice_number = 'INV-456'
WHERE id = 'invoice_id' AND status IN ('submitted', 'rejected');
```

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

-- Financial table performance indexes
CREATE INDEX idx_invoices_status_org ON invoices(status, subcontractor_organization_id);
CREATE INDEX idx_invoices_organization ON invoices(subcontractor_organization_id);
CREATE INDEX idx_employee_reports_user ON employee_reports(employee_user_id);
CREATE INDEX idx_receipts_user ON receipts(employee_user_id);
```

### Function Performance

- All helper functions use STABLE qualifier for caching
- SECURITY DEFINER prevents infinite recursion
- Functions avoid complex JOINs where possible

## Related Documentation

- [Database Schema](./DATABASE_SCHEMA.md) - Complete table structure
- [Database Functions](./DATABASE_FUNCTIONS.md) - All helper function details  
- [Audit System](./AUDIT_SYSTEM.md) - How audit logging interacts with RLS