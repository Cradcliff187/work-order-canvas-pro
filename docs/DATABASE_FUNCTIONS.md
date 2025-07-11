# WorkOrderPro Database Functions Documentation

## Overview

WorkOrderPro uses PostgreSQL functions to implement authentication helpers, audit logging, analytics, and utility operations. All functions are designed with security, performance, and maintainability in mind.

## Function Categories

### Auth Helper Functions (7)
SECURITY DEFINER functions that provide safe access to user context for RLS policies

### Trigger Functions (2)  
Functions executed by database triggers for audit logging and user profile creation

### Utility Functions (3)
General-purpose functions for work order numbering and analytics view management

### Analytics Functions (3)
Business intelligence functions for reporting and performance metrics

## Auth Helper Functions

These functions use `SECURITY DEFINER` to avoid infinite recursion in RLS policies by providing a safe way to access user context.

### 1. auth_user_id()

**Purpose**: Safely retrieve the current authenticated user's UUID

```sql
CREATE OR REPLACE FUNCTION public.auth_user_id()
RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN auth.uid();
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;
```

**Returns**: UUID of current user or NULL if not authenticated  
**Usage**: Primary function for getting user context in RLS policies

### 2. auth_profile_id()

**Purpose**: Get the profile ID (internal) for the current user

```sql
CREATE OR REPLACE FUNCTION public.auth_profile_id()
RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT id FROM public.profiles 
    WHERE user_id = auth.uid() LIMIT 1
  );
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;
```

**Returns**: UUID of user's profile record or NULL  
**Usage**: Links Supabase Auth users to internal profile system

### 3. auth_user_type()

**Purpose**: Determine the user type (role) of the current user

```sql
CREATE OR REPLACE FUNCTION public.auth_user_type()
RETURNS user_type
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT user_type FROM public.profiles 
    WHERE user_id = auth.uid() LIMIT 1
  );
EXCEPTION WHEN OTHERS THEN
  RETURN 'subcontractor'::public.user_type;
END;
$$;
```

**Returns**: 'admin', 'partner', or 'subcontractor' (defaults to 'subcontractor')  
**Usage**: Core function for role-based access control

### 4. auth_is_admin()

**Purpose**: Quick check if current user is an admin

```sql
CREATE OR REPLACE FUNCTION public.auth_is_admin()
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN public.auth_user_type() = 'admin';
END;
$$;
```

**Returns**: TRUE if user is admin, FALSE otherwise  
**Usage**: Simplified admin access checks in RLS policies

### 5. auth_user_organizations()

**Purpose**: Get all organizations the current user belongs to

```sql
CREATE OR REPLACE FUNCTION public.auth_user_organizations()
RETURNS TABLE(organization_id uuid)
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT uo.organization_id 
  FROM public.user_organizations uo
  WHERE uo.user_id = public.auth_profile_id();
END;
$$;
```

**Returns**: Table of organization UUIDs  
**Usage**: Multi-tenant access control for partners

### 6. auth_user_belongs_to_organization(org_id uuid)

**Purpose**: Check if current user belongs to a specific organization

```sql
CREATE OR REPLACE FUNCTION public.auth_user_belongs_to_organization(org_id uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.auth_user_organizations() 
    WHERE organization_id = org_id
  );
END;
$$;
```

**Parameters**: `org_id` - UUID of organization to check  
**Returns**: TRUE if user belongs to organization  
**Usage**: Organization-scoped data access for partners

### 7. auth_user_assigned_to_work_order(wo_id uuid)

**Purpose**: Check if current user is assigned to a specific work order

```sql
CREATE OR REPLACE FUNCTION public.auth_user_assigned_to_work_order(wo_id uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.work_orders wo
    WHERE wo.id = wo_id AND wo.assigned_to = public.auth_profile_id()
  );
END;
$$;
```

**Parameters**: `wo_id` - UUID of work order to check  
**Returns**: TRUE if user is assigned to the work order  
**Usage**: Work order access control for subcontractors

### 8. auth_user_can_view_assignment(assignment_id uuid)

**Purpose**: Check if current user can view a specific work order assignment

```sql
CREATE OR REPLACE FUNCTION public.auth_user_can_view_assignment(assignment_id uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  -- Admins can view all assignments
  IF auth_is_admin() THEN
    RETURN true;
  END IF;
  
  -- Check if user is assigned to this assignment
  IF EXISTS (
    SELECT 1 
    FROM work_order_assignments woa
    WHERE woa.id = assignment_id 
    AND woa.assigned_to = auth_profile_id()
  ) THEN
    RETURN true;
  END IF;
  
  -- Check if user is a partner of the organization that owns the work order
  IF auth_user_type() = 'partner' AND EXISTS (
    SELECT 1 
    FROM work_order_assignments woa
    JOIN work_orders wo ON wo.id = woa.work_order_id
    WHERE woa.id = assignment_id 
    AND auth_user_belongs_to_organization(wo.organization_id)
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;
```

**Parameters**: `assignment_id` - UUID of assignment to check  
**Returns**: TRUE if user can view the assignment  
**Usage**: Assignment access control and UI permission checks
**Logic**: 
- Admins can view all assignments
- Users can view assignments they are directly assigned to
- Partners can view assignments for their organization's work orders

## Trigger Functions

### audit_trigger_function()

**Purpose**: Comprehensive audit logging for all database changes

```sql
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Handle INSERT operations
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (
      table_name, record_id, action, new_values, user_id
    ) VALUES (
      TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW), public.auth_user_id()
    );
    RETURN NEW;
  END IF;

  -- Handle UPDATE operations  
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (
      table_name, record_id, action, old_values, new_values, user_id
    ) VALUES (
      TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), public.auth_user_id()
    );
    RETURN NEW;
  END IF;

  -- Handle DELETE operations
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (
      table_name, record_id, action, old_values, user_id
    ) VALUES (
      TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD), public.auth_user_id()
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the main operation
  RAISE WARNING 'Audit trigger failed for table %: %', TG_TABLE_NAME, SQLERRM;
  RETURN COALESCE(NEW, OLD);
END;
$$;
```

**Trigger Context**: Used by audit triggers on 11 tables  
**Features**: 
- Captures all INSERT, UPDATE, DELETE operations
- Stores complete before/after state as JSON
- Links changes to authenticated users
- Error-resilient (failures don't block main operations)

### handle_new_user_robust()

**Purpose**: Automatically create user profiles when new users sign up

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user_robust()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Insert profile with race condition handling
  INSERT INTO public.profiles (
    user_id, email, first_name, last_name, user_type
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(
      (NEW.raw_user_meta_data->>'user_type')::public.user_type, 
      'subcontractor'::public.user_type
    )
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the auth process
  RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;
```

**Trigger**: Fires after INSERT on auth.users  
**Features**:
- Extracts user data from Supabase Auth metadata
- Handles race conditions with ON CONFLICT
- Defaults user_type to 'subcontractor'
- Error-resilient (doesn't block user signup)

## Utility Functions

### generate_work_order_number()

**Purpose**: Generate unique, sequential work order numbers by year

```sql
CREATE OR REPLACE FUNCTION public.generate_work_order_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  current_year TEXT;
  sequence_num INTEGER;
  work_order_num TEXT;
BEGIN
  current_year := EXTRACT(YEAR FROM now())::TEXT;
  
  SELECT COALESCE(MAX(
    CASE 
      WHEN work_order_number ~ ('^WO-' || current_year || '-[0-9]+$')
      THEN CAST(SUBSTRING(work_order_number FROM LENGTH('WO-' || current_year || '-') + 1) AS INTEGER)
      ELSE 0
    END
  ), 0) + 1
  INTO sequence_num
  FROM public.work_orders;
  
  work_order_num := 'WO-' || current_year || '-' || LPAD(sequence_num::TEXT, 4, '0');
  
  RETURN work_order_num;
END;
$$;
```

**Returns**: Formatted work order number (e.g., "WO-2025-0001")  
**Usage**: Called when creating new work orders  
**Format**: WO-{YEAR}-{4-digit-sequence}

### generate_work_order_number_v2()

**Purpose**: Generate partner-specific work order numbers using organization initials and location with enhanced error handling

```sql
CREATE OR REPLACE FUNCTION public.generate_work_order_number_v2(
  org_id uuid,
  location_number text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  org_initials text;
  sequence_num integer;
  work_order_num text;
  fallback_num text;
  org_name text;
BEGIN
  -- Get organization details and lock row for sequence update
  SELECT initials, name INTO org_initials, org_name
  FROM public.organizations 
  WHERE id = org_id AND is_active = true
  FOR UPDATE;
  
  -- If organization not found
  IF org_name IS NULL THEN
    RAISE EXCEPTION 'Organization not found or inactive: %', org_id;
  END IF;
  
  -- Get and increment sequence number atomically
  UPDATE public.organizations 
  SET next_sequence_number = next_sequence_number + 1
  WHERE id = org_id
  RETURNING next_sequence_number - 1 INTO sequence_num;
  
  -- Generate fallback number
  fallback_num := public.generate_work_order_number();
  
  -- If initials are missing or empty, return warning with fallback
  IF org_initials IS NULL OR org_initials = '' THEN
    RETURN jsonb_build_object(
      'work_order_number', fallback_num,
      'is_fallback', true,
      'warning', 'Organization "' || org_name || '" needs initials for smart numbering. Using fallback number.',
      'organization_name', org_name,
      'requires_initials', true
    );
  END IF;
  
  -- Build work order number based on location presence
  IF location_number IS NOT NULL AND location_number != '' THEN
    work_order_num := org_initials || '-' || location_number || '-' || LPAD(sequence_num::text, 3, '0');
  ELSE
    work_order_num := org_initials || '-' || LPAD(sequence_num::text, 4, '0');
  END IF;
  
  RETURN jsonb_build_object(
    'work_order_number', work_order_num,
    'is_fallback', false,
    'organization_name', org_name,
    'requires_initials', false
  );
EXCEPTION
  WHEN NO_DATA_FOUND THEN
    RAISE EXCEPTION 'Organization not found or inactive: %', org_id;
  WHEN OTHERS THEN
    -- If anything else fails, return fallback with error info
    RAISE WARNING 'Work order numbering failed for org %: %, using fallback', org_id, SQLERRM;
    RETURN jsonb_build_object(
      'work_order_number', public.generate_work_order_number(),
      'is_fallback', true,
      'warning', 'Work order numbering system encountered an error. Using fallback number.',
      'error', SQLERRM,
      'requires_initials', false
    );
END;
$$;
```

**Parameters:**
- `org_id` (uuid) - Organization ID for initials lookup
- `location_number` (text, optional) - Location number for location-specific numbering

**Returns**: Structured JSON response with enhanced error handling  
**Response Format:**
```json
{
  "work_order_number": "ABC-504-001",
  "is_fallback": false,
  "organization_name": "Organization Name",
  "requires_initials": false
}
```

**Response Fields:**
- `work_order_number` (text) - The generated work order number
- `is_fallback` (boolean) - Whether fallback numbering was used
- `organization_name` (text) - Name of the organization
- `requires_initials` (boolean) - Whether organization needs initials set
- `warning` (text, optional) - User-friendly warning message
- `error` (text, optional) - Technical error details

**Number Format:**
- With location: `INITIALS-LOCATION-SEQUENCE` (e.g., "ABC-504-001")
- Without location: `INITIALS-SEQUENCE` (e.g., "ABC-0001")
- Fallback: `WO-YYYY-NNNN` (e.g., "WO-2025-0001")

**Features:**
- Uses per-organization sequence numbers from `organizations.next_sequence_number`
- Atomic sequence increment with SELECT...FOR UPDATE for concurrency safety
- Graceful fallback to legacy numbering when organization initials are missing
- Structured error responses for better user experience
- Enhanced logging for troubleshooting

**Usage Examples:**
```sql
-- With location and organization initials
SELECT generate_work_order_number_v2('org-uuid', '504');
-- Returns: {"work_order_number": "ABC-504-001", "is_fallback": false, ...}

-- Without location  
SELECT generate_work_order_number_v2('org-uuid', NULL);
-- Returns: {"work_order_number": "ABC-0001", "is_fallback": false, ...}

-- Organization without initials (fallback)
SELECT generate_work_order_number_v2('no-initials-org-uuid', '504');
-- Returns: {"work_order_number": "WO-2025-0001", "is_fallback": true, "warning": "...", ...}
```

**Error Handling:**
- Returns structured warnings for missing organization initials
- Graceful fallback to legacy numbering system
- Comprehensive error logging for monitoring
- User-friendly error messages for UI display

### update_updated_at_column()

**Purpose**: Trigger function to automatically update timestamp columns

```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
```

**Usage**: Applied to tables with updated_at columns  
**Trigger**: BEFORE UPDATE on multiple tables

### generate_work_order_number_simple()

**Purpose**: Simple wrapper function for backward compatibility

```sql
CREATE OR REPLACE FUNCTION public.generate_work_order_number_simple(
  org_id uuid,
  location_number text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  result jsonb;
BEGIN
  result := public.generate_work_order_number_v2(org_id, location_number);
  RETURN result->>'work_order_number';
END;
$$;
```

**Parameters:**
- `org_id` (uuid) - Organization ID for initials lookup
- `location_number` (text, optional) - Location number for location-specific numbering

**Returns**: Work order number as text (extracts from v2 JSON response)  
**Usage**: For code that needs simple text return instead of structured JSON

### trigger_generate_work_order_number_v2()

**Purpose**: Enhanced trigger function for automatic work order number generation with structured error handling

```sql
CREATE OR REPLACE FUNCTION public.trigger_generate_work_order_number_v2()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  numbering_result jsonb;
BEGIN
  -- Only generate if work_order_number is not already set
  IF NEW.work_order_number IS NULL OR NEW.work_order_number = '' THEN
    BEGIN
      -- Use organization_id (submitter) for numbering by default
      -- Use partner_location_number if provided
      numbering_result := public.generate_work_order_number_v2(
        NEW.organization_id,
        NEW.partner_location_number
      );
      
      -- Extract the work order number from the result
      NEW.work_order_number := numbering_result->>'work_order_number';
      
      -- Log warnings or errors for monitoring
      IF numbering_result->>'is_fallback' = 'true' THEN
        RAISE WARNING 'Work order % using fallback numbering: %', 
          NEW.id, numbering_result->>'warning';
      END IF;
      
    EXCEPTION
      WHEN OTHERS THEN
        -- Ultimate fallback to legacy system
        RAISE WARNING 'Advanced work order numbering failed (%), falling back to legacy numbering', SQLERRM;
        NEW.work_order_number := public.generate_work_order_number();
    END;
  END IF;
  
  RETURN NEW;
END;
$$;
```

**Trigger**: `trigger_work_order_number_v2` on `work_orders` table BEFORE INSERT  
**Features:**
- Automatic work order number generation on insert
- Uses enhanced v2 numbering with structured error handling
- Extracts work order number from JSON response
- Logs fallback warnings for monitoring and troubleshooting
- Falls back to legacy WO-YYYY-NNNN format if advanced numbering fails
- Only generates numbers if not already provided
- Multiple layers of error resilience

### refresh_analytics_views()

**Purpose**: Refresh materialized views for analytics

```sql
CREATE OR REPLACE FUNCTION public.refresh_analytics_views()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW public.mv_work_order_analytics;
  REFRESH MATERIALIZED VIEW public.mv_subcontractor_performance;
END;
$$;
```

**Usage**: Called periodically to update analytics data  
**Performance**: Should be run during off-peak hours

## Analytics Functions

### calculate_completion_time_by_trade()

**Purpose**: Calculate average completion times grouped by trade

```sql
CREATE OR REPLACE FUNCTION public.calculate_completion_time_by_trade(
  start_date date DEFAULT (CURRENT_DATE - '30 days'::interval), 
  end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  trade_name text, 
  avg_completion_hours numeric, 
  total_orders bigint, 
  completed_orders bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.name as trade_name,
    AVG(CASE 
      WHEN wo.completed_at IS NOT NULL AND wo.date_assigned IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (wo.completed_at - wo.date_assigned))/3600 
    END) as avg_completion_hours,
    COUNT(wo.id) as total_orders,
    COUNT(CASE WHEN wo.status = 'completed' THEN 1 END) as completed_orders
  FROM trades t
  LEFT JOIN work_orders wo ON wo.trade_id = t.id
  WHERE wo.date_submitted BETWEEN start_date AND end_date
  GROUP BY t.id, t.name
  ORDER BY avg_completion_hours ASC;
END;
$$;
```

**Parameters**: Optional date range (defaults to last 30 days)  
**Returns**: Trade performance metrics  
**Usage**: Performance reporting and trade analysis

### calculate_first_time_fix_rate()

**Purpose**: Calculate percentage of work orders completed on first visit

```sql
CREATE OR REPLACE FUNCTION public.calculate_first_time_fix_rate(
  start_date date DEFAULT (CURRENT_DATE - '30 days'::interval), 
  end_date date DEFAULT CURRENT_DATE
)
RETURNS numeric
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  fix_rate NUMERIC;
BEGIN
  SELECT 
    COUNT(CASE 
      WHEN report_count = 1 AND first_report_approved THEN 1 
    END) * 100.0 / NULLIF(COUNT(*), 0)
  INTO fix_rate
  FROM (
    SELECT 
      wo.id,
      COUNT(wor.id) as report_count,
      BOOL_AND(wor.status = 'approved') as first_report_approved
    FROM work_orders wo
    LEFT JOIN work_order_reports wor ON wor.work_order_id = wo.id
    WHERE wo.date_submitted BETWEEN start_date AND end_date
      AND wo.status = 'completed'
    GROUP BY wo.id
  ) report_stats;
  
  RETURN COALESCE(fix_rate, 0);
END;
$$;
```

**Parameters**: Optional date range (defaults to last 30 days)  
**Returns**: Percentage (0-100) of first-time fixes  
**Usage**: Quality metrics and performance KPIs

### get_geographic_distribution()

**Purpose**: Analyze work order distribution by location

```sql
CREATE OR REPLACE FUNCTION public.get_geographic_distribution(
  start_date date DEFAULT (CURRENT_DATE - '30 days'::interval), 
  end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  state text, 
  city text, 
  work_order_count bigint, 
  avg_completion_hours numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wo.state,
    wo.city,
    COUNT(wo.id) as work_order_count,
    AVG(CASE 
      WHEN wo.completed_at IS NOT NULL AND wo.date_assigned IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (wo.completed_at - wo.date_assigned))/3600 
    END) as avg_completion_hours
  FROM work_orders wo
  WHERE wo.date_submitted BETWEEN start_date AND end_date
    AND wo.state IS NOT NULL 
    AND wo.city IS NOT NULL
  GROUP BY wo.state, wo.city
  ORDER BY work_order_count DESC;
END;
$$;
```

**Parameters**: Optional date range (defaults to last 30 days)  
**Returns**: Geographic work order distribution  
**Usage**: Territory analysis and resource planning

## Function Usage Examples

### In RLS Policies
```sql
-- Example: Work order access policy
CREATE POLICY "Partners can view their organization work orders" 
ON work_orders FOR SELECT
USING (auth_user_type() = 'partner' AND auth_user_belongs_to_organization(organization_id));
```

### In Application Code
```typescript
// Example: Get trade performance data
const { data: tradeMetrics } = await supabase.rpc('calculate_completion_time_by_trade', {
  start_date: '2025-01-01',
  end_date: '2025-01-31'
});

// Example: Generate work order number
const { data: workOrderNumber } = await supabase.rpc('generate_work_order_number');
```

### In Triggers
```sql
-- Example: Audit trigger on work_orders table
CREATE TRIGGER audit_work_orders
  AFTER INSERT OR UPDATE OR DELETE ON work_orders
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
```

## Performance Considerations

### Function Optimization
1. **STABLE qualifier**: All read-only functions are marked STABLE for caching
2. **SECURITY DEFINER**: Used judiciously to avoid performance penalties
3. **Exception handling**: Prevents function failures from blocking operations

### Index Support
Functions that query large tables are supported by appropriate indexes:
- auth_profile_id() → profiles(user_id)
- auth_user_organizations() → user_organizations(user_id)
- Analytics functions → date-based indexes

### Caching Strategy
- Helper functions results are cached within transaction
- Materialized views cache complex analytics queries
- refresh_analytics_views() should be scheduled regularly

## Security Considerations

### SECURITY DEFINER Usage
- **Auth helpers**: Use SECURITY DEFINER to bypass RLS safely
- **Audit function**: Uses SECURITY DEFINER for reliable logging
- **Analytics**: Uses SECURITY DEFINER for cross-table access

### Input Validation
- UUID parameters are type-safe
- Date parameters have sensible defaults
- Error handling prevents information disclosure

### Access Control
- Analytics functions accessible to all authenticated users
- Audit functions only used by triggers
- Helper functions support RLS but don't enforce it

## Related Documentation

- [RLS Policies](./RLS_POLICIES.md) - How these functions support RLS
- [Audit System](./AUDIT_SYSTEM.md) - Audit function implementation details
- [Database Schema](./DATABASE_SCHEMA.md) - Complete schema overview
- [Migration History](./MIGRATION_HISTORY.md) - When functions were added