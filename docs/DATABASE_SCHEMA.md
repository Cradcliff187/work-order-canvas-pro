# WorkOrderPro Database Schema Documentation

## Executive Summary

WorkOrderPro uses a comprehensive **12-table** PostgreSQL database with Row Level Security (RLS) to manage construction work orders across three user types: Admins, Partners, and Subcontractors. The schema supports work order lifecycle management, user organization relationships, reporting, email notifications, comprehensive audit logging, and advanced analytics through materialized views.

## Database Architecture Overview

### Core Tables (12)
1. **organizations** - Company/organization information
2. **user_organizations** - Many-to-many user-organization relationships  
3. **profiles** - Extended user profile information
4. **trades** - Available trade skills (Plumbing, HVAC, etc.)
5. **work_orders** - Main work order records
6. **work_order_reports** - Subcontractor completion reports
7. **work_order_attachments** - File attachments for work orders and reports
8. **email_templates** - System email templates
9. **email_logs** - Email delivery tracking
10. **email_settings** - Email configuration per organization
11. **system_settings** - Global system configuration
12. **audit_logs** - Complete audit trail for all changes

### Materialized Views (2)
- **mv_work_order_analytics** - Performance analytics for work orders
- **mv_subcontractor_performance** - Subcontractor performance metrics

### Storage Buckets (1)
- **work-order-photos** - Public bucket for work order photo attachments

### Custom Enums (6)
- `user_type`: 'admin', 'partner', 'subcontractor'
- `work_order_status`: 'received', 'assigned', 'in_progress', 'completed', 'cancelled'
- `assignment_type`: 'internal', 'subcontractor'
- `report_status`: 'submitted', 'reviewed', 'approved', 'rejected'  
- `email_status`: 'sent', 'delivered', 'failed', 'bounced'
- `file_type`: 'photo', 'invoice', 'document'

### Custom Functions (13)
- User management functions for RLS and security
- Work order lifecycle functions
- Analytics and reporting functions
- Email notification functions

## Entity Relationship Diagram

```mermaid
erDiagram
    organizations ||--o{ user_organizations : "has"
    organizations ||--o{ work_orders : "submits"
    organizations ||--o{ email_settings : "configures"
    
    profiles ||--o{ user_organizations : "belongs_to"
    profiles ||--o{ work_orders : "creates"
    profiles ||--o{ work_orders : "assigned_to"
    profiles ||--o{ work_order_reports : "submits"
    profiles ||--o{ work_order_reports : "reviews"
    profiles ||--o{ work_order_attachments : "uploads"
    profiles ||--o{ email_settings : "updates"
    profiles ||--o{ system_settings : "updates"
    profiles ||--o{ audit_logs : "performs"
    
    trades ||--o{ work_orders : "categorizes"
    
    work_orders ||--o{ work_order_reports : "has"
    work_orders ||--o{ work_order_attachments : "has"
    work_orders ||--o{ email_logs : "triggers"
    
    work_order_reports ||--o{ work_order_attachments : "has"
    
    organizations {
        uuid id PK
        text name UK
        text contact_email
        text contact_phone
        text address
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }
    
    user_organizations {
        uuid id PK
        uuid user_id FK
        uuid organization_id FK
        timestamp created_at
    }
    
    profiles {
        uuid id PK
        uuid user_id UK
        text email
        text first_name
        text last_name
        user_type user_type
        text company_name
        text phone
        text avatar_url
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }
    
    trades {
        uuid id PK
        text name
        text description
        boolean is_active
        timestamp created_at
    }
    
    work_orders {
        uuid id PK
        text work_order_number UK
        uuid organization_id FK
        uuid trade_id FK
        uuid created_by FK
        uuid assigned_to FK
        assignment_type assigned_to_type
        work_order_status status
        text title
        text description
        text store_location
        text street_address
        text city
        text state
        text zip_code
        date due_date
        date estimated_completion_date
        date actual_completion_date
        date final_completion_date
        timestamp date_submitted
        timestamp date_assigned
        timestamp date_completed
        timestamp completed_at
        numeric estimated_hours
        numeric actual_hours
        numeric labor_cost
        numeric materials_cost
        numeric subcontractor_invoice_amount
        boolean subcontractor_report_submitted
        text admin_completion_notes
        timestamp created_at
        timestamp updated_at
    }
    
    work_order_reports {
        uuid id PK
        uuid work_order_id FK
        uuid subcontractor_user_id FK
        uuid reviewed_by_user_id FK
        report_status status
        text work_performed
        text materials_used
        numeric hours_worked
        numeric invoice_amount
        text invoice_number
        jsonb photos
        text notes
        text review_notes
        timestamp submitted_at
        timestamp reviewed_at
    }
    
    work_order_attachments {
        uuid id PK
        uuid work_order_id FK
        uuid work_order_report_id FK
        uuid uploaded_by_user_id FK
        text file_name
        text file_url
        file_type file_type
        integer file_size
        timestamp uploaded_at
    }
    
    email_templates {
        uuid id PK
        text template_name UK
        text subject
        text html_content
        text text_content
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }
    
    email_logs {
        uuid id PK
        uuid work_order_id FK
        text template_used
        text recipient_email
        text resend_message_id
        email_status status
        text error_message
        timestamp sent_at
        timestamp delivered_at
    }
    
    email_settings {
        uuid id PK
        uuid organization_id FK
        uuid updated_by_user_id FK
        text setting_name
        jsonb setting_value
        timestamp updated_at
    }
    
    system_settings {
        uuid id PK
        uuid updated_by_user_id FK
        text category
        text setting_key
        jsonb setting_value
        text description
        timestamp updated_at
    }
    
    audit_logs {
        uuid id PK
        uuid user_id FK
        text table_name
        uuid record_id
        text action
        jsonb old_values
        jsonb new_values
        timestamp created_at
    }
```

## Table Definitions

### 1. organizations
**Purpose**: Stores partner company information that submit work orders.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| name | text | No | - | Organization name |
| contact_email | text | No | - | Primary contact email |
| contact_phone | text | Yes | - | Contact phone number |
| address | text | Yes | - | Organization address |
| is_active | boolean | No | true | Whether organization is active |
| created_at | timestamp | No | now() | Creation timestamp |
| updated_at | timestamp | No | now() | Last update timestamp |

**Constraints**:
- `organizations_name_unique` UNIQUE (name)

**Indexes**:
- `idx_organizations_active` ON (is_active)
- `idx_organizations_contact_email` ON (contact_email)

### 2. user_organizations  
**Purpose**: Junction table linking users to organizations (many-to-many relationship).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| user_id | uuid | No | - | References profiles.id |
| organization_id | uuid | No | - | References organizations.id |
| created_at | timestamp | No | now() | Creation timestamp |

**Indexes**:
- `idx_user_organizations_user_id` ON (user_id)
- `idx_user_organizations_organization_id` ON (organization_id)

### 3. profiles
**Purpose**: Extended user profile information beyond Supabase Auth.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| user_id | uuid | No | - | References auth.users.id |
| email | text | No | - | User email address |
| first_name | text | No | - | User first name |
| last_name | text | No | - | User last name |
| user_type | user_type | No | 'subcontractor' | User type enum |
| company_name | text | Yes | - | Company name for subcontractors |
| phone | text | Yes | - | Phone number |
| avatar_url | text | Yes | - | Profile picture URL |
| is_active | boolean | No | true | Whether user is active |
| created_at | timestamp | No | now() | Creation timestamp |
| updated_at | timestamp | No | now() | Last update timestamp |

**Indexes**:
- `idx_profiles_user_id` ON (user_id)
- `idx_profiles_user_type` ON (user_type)
- `idx_profiles_email` ON (email)

### 4. trades
**Purpose**: Available trade skills and categories for work orders.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| name | text | No | - | Trade name (e.g., "Plumbing", "HVAC") |
| description | text | Yes | - | Trade description |
| is_active | boolean | No | true | Whether trade is available |
| created_at | timestamp | No | now() | Creation timestamp |

**Indexes**:
- `idx_trades_active` ON (is_active)

### 5. work_orders
**Purpose**: Main work order records with complete lifecycle tracking.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| work_order_number | text | Yes | - | Auto-generated work order number |
| organization_id | uuid | Yes | - | References organizations.id |
| trade_id | uuid | Yes | - | References trades.id |
| created_by | uuid | No | - | References profiles.id |
| assigned_to | uuid | Yes | - | References profiles.id |
| assigned_to_type | assignment_type | Yes | - | 'internal' or 'subcontractor' |
| status | work_order_status | No | 'received' | Current status |
| title | text | No | - | Work order title |
| description | text | Yes | - | Detailed description |
| store_location | text | Yes | - | Store/location identifier |
| street_address | text | Yes | - | Street address |
| city | text | Yes | - | City |
| state | text | Yes | - | State |
| zip_code | text | Yes | - | ZIP code |
| due_date | date | Yes | - | Due date |
| estimated_completion_date | date | Yes | - | Estimated completion |
| actual_completion_date | date | Yes | - | Actual completion |
| final_completion_date | date | Yes | - | Final completion |
| date_submitted | timestamp | No | now() | Submission timestamp |
| date_assigned | timestamp | Yes | - | Assignment timestamp |
| date_completed | timestamp | Yes | - | Completion timestamp |
| completed_at | timestamp | Yes | - | Completion timestamp |
| estimated_hours | numeric | Yes | - | Estimated work hours |
| actual_hours | numeric | Yes | - | Actual work hours |
| labor_cost | numeric | Yes | - | Labor cost |
| materials_cost | numeric | Yes | - | Materials cost |
| subcontractor_invoice_amount | numeric | Yes | - | Subcontractor invoice amount |
| subcontractor_report_submitted | boolean | Yes | false | Whether report submitted |
| admin_completion_notes | text | Yes | - | Admin completion notes |
| created_at | timestamp | No | now() | Creation timestamp |
| updated_at | timestamp | No | now() | Last update timestamp |

**Indexes**:
- `idx_work_orders_organization_status` ON (organization_id, status)
- `idx_work_orders_assigned_status` ON (assigned_to, status)
- `idx_work_orders_trade` ON (trade_id)
- `idx_work_orders_created_by` ON (created_by)
- `idx_work_orders_status` ON (status)
- `idx_work_orders_organization_id` ON (organization_id)
- `idx_work_orders_assigned_to` ON (assigned_to)
- `idx_work_orders_trade_id` ON (trade_id)

### 6. work_order_reports
**Purpose**: Subcontractor completion reports with review workflow.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| work_order_id | uuid | No | - | References work_orders.id |
| subcontractor_user_id | uuid | No | - | References profiles.id |
| reviewed_by_user_id | uuid | Yes | - | References profiles.id |
| status | report_status | No | 'submitted' | Report status |
| work_performed | text | No | - | Description of work performed |
| materials_used | text | Yes | - | Materials used |
| hours_worked | numeric | Yes | - | Hours worked |
| invoice_amount | numeric | No | - | Invoice amount |
| invoice_number | text | Yes | - | Invoice number |
| photos | jsonb | Yes | - | Photo URLs |
| notes | text | Yes | - | Additional notes |
| review_notes | text | Yes | - | Review feedback |
| submitted_at | timestamp | No | now() | Submission timestamp |
| reviewed_at | timestamp | Yes | - | Review timestamp |

**Indexes**:
- `idx_work_order_reports_work_order` ON (work_order_id)
- `idx_work_order_reports_subcontractor` ON (subcontractor_user_id)
- `idx_work_order_reports_status` ON (status)

### 7. work_order_attachments
**Purpose**: File attachments for work orders and reports.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| work_order_id | uuid | Yes | - | References work_orders.id |
| work_order_report_id | uuid | Yes | - | References work_order_reports.id |
| uploaded_by_user_id | uuid | No | - | References profiles.id |
| file_name | text | No | - | Original file name |
| file_url | text | No | - | Storage URL |
| file_type | file_type | No | - | File type enum |
| file_size | integer | Yes | - | File size in bytes |
| uploaded_at | timestamp | No | now() | Upload timestamp |

**Indexes**:
- `idx_work_order_attachments_work_order` ON (work_order_id)
- `idx_work_order_attachments_report` ON (work_order_report_id)
- `idx_work_order_attachments_uploader` ON (uploaded_by_user_id)

### 8. email_templates
**Purpose**: System email templates for notifications.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| template_name | text | No | - | Unique template identifier |
| subject | text | No | - | Email subject |
| html_content | text | No | - | HTML email content |
| text_content | text | Yes | - | Plain text content |
| is_active | boolean | No | true | Whether template is active |
| created_at | timestamp | No | now() | Creation timestamp |
| updated_at | timestamp | No | now() | Last update timestamp |

**Constraints**:
- `email_templates_template_name_unique` UNIQUE (template_name)

**Indexes**:
- `idx_email_templates_is_active` ON (is_active)

### 9. email_logs
**Purpose**: Email delivery tracking and status.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| work_order_id | uuid | Yes | - | References work_orders.id |
| template_used | text | Yes | - | Template name used |
| recipient_email | text | No | - | Recipient email |
| resend_message_id | text | Yes | - | Resend service message ID |
| status | email_status | No | 'sent' | Email status |
| error_message | text | Yes | - | Error message if failed |
| sent_at | timestamp | No | now() | Send timestamp |
| delivered_at | timestamp | Yes | - | Delivery timestamp |

**Indexes**:
- `idx_email_logs_work_order` ON (work_order_id)
- `idx_email_logs_status` ON (status)
- `idx_email_logs_sent_at` ON (sent_at)

### 10. email_settings
**Purpose**: Email configuration per organization.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| organization_id | uuid | Yes | - | References organizations.id |
| updated_by_user_id | uuid | No | - | References profiles.id |
| setting_name | text | No | - | Setting identifier |
| setting_value | jsonb | No | - | Setting value |
| updated_at | timestamp | No | now() | Last update timestamp |

### 11. system_settings
**Purpose**: Global system configuration.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| updated_by_user_id | uuid | No | - | References profiles.id |
| category | text | No | - | Setting category |
| setting_key | text | No | - | Setting key |
| setting_value | jsonb | No | - | Setting value |
| description | text | Yes | - | Setting description |
| updated_at | timestamp | No | now() | Last update timestamp |

### 12. audit_logs
**Purpose**: Complete audit trail for all system changes.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| user_id | uuid | Yes | - | References profiles.id |
| table_name | text | No | - | Affected table |
| record_id | uuid | No | - | Affected record ID |
| action | text | No | - | Action performed |
| old_values | jsonb | Yes | - | Previous values |
| new_values | jsonb | Yes | - | New values |
| created_at | timestamp | No | now() | Action timestamp |

**Indexes**:
- `idx_audit_logs_table_record` ON (table_name, record_id)
- `idx_audit_logs_user` ON (user_id)
- `idx_audit_logs_created_at` ON (created_at)

## Materialized Views

### 1. mv_work_order_analytics
**Purpose**: Performance analytics for work orders with aggregated data.

| Column | Type | Description |
|--------|------|-------------|
| submission_date | date | Daily submission date |
| submission_week | date | Weekly submission date |
| submission_month | date | Monthly submission date |
| total_orders | bigint | Total work orders |
| received_count | bigint | Orders in received status |
| assigned_count | bigint | Orders in assigned status |
| in_progress_count | bigint | Orders in progress |
| completed_count | bigint | Completed orders |
| cancelled_count | bigint | Cancelled orders |
| avg_completion_hours | numeric | Average completion time in hours |
| total_invoice_amount | numeric | Total invoice amounts |
| trade_id | uuid | Trade category |
| organization_id | uuid | Organization |

**Indexes**:
- `idx_mv_work_order_analytics_submission_date` ON (submission_date)
- `idx_mv_work_order_analytics_trade_id` ON (trade_id)
- `idx_mv_work_order_analytics_organization_id` ON (organization_id)

### 2. mv_subcontractor_performance
**Purpose**: Subcontractor performance metrics and quality scores.

| Column | Type | Description |
|--------|------|-------------|
| subcontractor_id | uuid | Subcontractor profile ID |
| first_name | text | Subcontractor first name |
| last_name | text | Subcontractor last name |
| company_name | text | Company name |
| total_jobs | bigint | Total jobs assigned |
| completed_jobs | bigint | Successfully completed jobs |
| on_time_jobs | bigint | Jobs completed on time |
| avg_completion_hours | numeric | Average completion time |
| avg_invoice_amount | numeric | Average invoice amount |
| total_invoice_amount | numeric | Total invoice amount |
| quality_score | numeric | Quality score based on report approvals |

## Storage Configuration

### Storage Buckets

#### work-order-photos
**Purpose**: Public bucket for work order photo attachments
- **Bucket ID**: `work-order-photos`
- **Public**: Yes
- **Used by**: Work order reports and attachments

**Storage Policies**:
- Subcontractors can upload photos for their reports
- All authenticated users can view photos based on their role
- Subcontractors can update/delete their own photos
- File organization: `/{user_id}/{filename}`

## Database Functions

### User Management Functions

#### 1. get_current_user_type()
**Purpose**: Returns the current user's type for RLS policies.
```sql
CREATE OR REPLACE FUNCTION public.get_current_user_type()
RETURNS user_type
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
BEGIN
  RETURN public.get_user_type_secure(auth.uid());
END;
$function$
```

#### 2. get_user_type_secure(user_uuid)
**Purpose**: Secure function to get user type without RLS recursion.
```sql
CREATE OR REPLACE FUNCTION public.get_user_type_secure(user_uuid uuid DEFAULT auth.uid())
RETURNS user_type
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
DECLARE
  result user_type;
BEGIN
  SELECT user_type INTO result 
  FROM public.profiles 
  WHERE user_id = user_uuid 
  LIMIT 1;
  
  RETURN COALESCE(result, 'subcontractor'::user_type);
END;
$function$
```

#### 3. is_admin()
**Purpose**: Check if current user is admin.
```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
BEGIN
  RETURN public.get_user_type_secure(auth.uid()) = 'admin';
END;
$function$
```

#### 4. get_user_organizations()
**Purpose**: Returns organizations the current user belongs to.
```sql
CREATE OR REPLACE FUNCTION public.get_user_organizations()
RETURNS TABLE(organization_id uuid)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT uo.organization_id 
  FROM public.user_organizations uo
  JOIN public.profiles p ON p.id = uo.user_id
  WHERE p.user_id = auth.uid();
END;
$function$
```

#### 5. user_belongs_to_organization(org_id)
**Purpose**: Check if user belongs to specific organization.
```sql
CREATE OR REPLACE FUNCTION public.user_belongs_to_organization(org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.get_user_organizations() 
    WHERE organization_id = org_id
  );
END;
$function$
```

#### 6. user_assigned_to_work_order(wo_id)
**Purpose**: Check if user is assigned to specific work order.
```sql
CREATE OR REPLACE FUNCTION public.user_assigned_to_work_order(wo_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.work_orders wo
    JOIN public.profiles p ON p.id = wo.assigned_to
    WHERE wo.id = wo_id AND p.user_id = auth.uid()
  );
END;
$function$
```

### Work Order Functions

#### 7. generate_work_order_number()
**Purpose**: Auto-generate work order numbers.
```sql
CREATE OR REPLACE FUNCTION public.generate_work_order_number()
RETURNS text
LANGUAGE plpgsql
AS $function$
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
$function$
```

### Analytics Functions

#### 8. calculate_completion_time_by_trade(start_date, end_date)
**Purpose**: Calculate average completion times by trade category.
```sql
CREATE OR REPLACE FUNCTION public.calculate_completion_time_by_trade(
  start_date date DEFAULT CURRENT_DATE - INTERVAL '30 days',
  end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  trade_name text,
  avg_completion_hours numeric,
  total_orders bigint,
  completed_orders bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
```

#### 9. calculate_first_time_fix_rate(start_date, end_date)
**Purpose**: Calculate first-time fix rate percentage.
```sql
CREATE OR REPLACE FUNCTION public.calculate_first_time_fix_rate(
  start_date date DEFAULT CURRENT_DATE - INTERVAL '30 days',
  end_date date DEFAULT CURRENT_DATE
)
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
```

#### 10. get_geographic_distribution(start_date, end_date)
**Purpose**: Get work order distribution by geographic location.
```sql
CREATE OR REPLACE FUNCTION public.get_geographic_distribution(
  start_date date DEFAULT CURRENT_DATE - INTERVAL '30 days',
  end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  state text,
  city text,
  work_order_count bigint,
  avg_completion_hours numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
```

#### 11. refresh_analytics_views()
**Purpose**: Refresh materialized views for analytics.
```sql
CREATE OR REPLACE FUNCTION public.refresh_analytics_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW public.mv_work_order_analytics;
  REFRESH MATERIALIZED VIEW public.mv_subcontractor_performance;
END;
$function$
```

### Utility Functions

#### 12. update_updated_at_column()
**Purpose**: Trigger function to update timestamp columns.
```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
```

#### 13. handle_new_user()
**Purpose**: Automatically create profile when user signs up.
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  RETURN NEW;
END;
$function$
```

## Row Level Security (RLS) Policies

### profiles table
- **"Known admin users can manage all profiles"** - Admin with hardcoded UUID has full access
- **"Authenticated users can view profiles"** - All authenticated users can view profiles
- **"Users can update their own profile"** - Users can update own profile data
- **"Users can insert their own profile"** - Users can create own profile

### organizations table  
- **"Admins can manage all organizations"** - Admins have full CRUD access
- **"Partners can view their organizations"** - Partners see only their associated organizations
- **"Subcontractors can view organizations they work for"** - Subcontractors see organizations for assigned work orders

### user_organizations table
- **"Admins can manage all user organizations"** - Admin full access to relationships
- **"Partners can manage their organization relationships"** - Partners manage their org relationships  
- **"Users can view their own organization relationships"** - Users see their own relationships

### trades table
- **"Admins can manage all trades"** - Admin CRUD access to trade categories
- **"Partners and subcontractors can view trades"** - Read-only access for partners/subcontractors

### work_orders table
- **"Admins can manage all work orders"** - Admin full access to all work orders
- **"Partners can manage work orders in their organizations"** - Partners manage their org's work orders
- **"Subcontractors can view assigned work orders"** - Subcontractors see only assigned work orders

### work_order_reports table
- **"Admins can manage all work order reports"** - Admin full access to all reports
- **"Partners can view reports for their organization work orders"** - Partners view reports for their work orders
- **"Partners can review reports for their organization"** - Partners can approve/reject reports
- **"Subcontractors can manage their own reports"** - Subcontractors CRUD their own reports

### work_order_attachments table
- **"Admins can manage all work order attachments"** - Admin full access to all attachments
- **"Partners can view attachments for their organization work orders"** - Partners view their org's attachments
- **"Subcontractors can manage attachments for their work"** - Subcontractors manage their work attachments

### email_templates table
- **"Admins can manage email templates"** - Admin CRUD access to templates
- **"Partners and subcontractors can view email templates"** - Read-only access to active templates

### email_logs table
- **"Admins can view email logs"** - Admin access to all email logs
- **"Partners can view email logs for their organization"** - Partners see logs for their work orders

### email_settings table
- **"Admins can manage email settings"** - Admin CRUD access to email configuration

### system_settings table
- **"Admins can manage system settings"** - Admin CRUD access to system configuration

### audit_logs table
- **"Admins can view audit logs"** - Admin read-only access to audit trail

## Triggers

### Update Timestamp Triggers
- **Organizations**: `update_organizations_updated_at` - Updates `updated_at` on row changes
- **Profiles**: `update_profiles_updated_at` - Updates `updated_at` on row changes
- **Work Orders**: `update_work_orders_updated_at` - Updates `updated_at` on row changes

### User Management Triggers
- **Auth User Creation**: `on_auth_user_created` - Automatically creates profile when user signs up

## Email Templates

### Default Templates (Inserted via Migration)
1. **work_order_received** - Notification when new work order is submitted
2. **work_order_assigned** - Notification when work order is assigned to subcontractor
3. **report_submitted** - Notification when subcontractor submits completion report
4. **report_reviewed** - Notification when admin reviews/approves report
5. **work_order_completed** - Notification when work order is marked complete


## Performance Considerations

### Indexes
- **Primary Keys**: All tables have UUID primary keys with automatic indexes
- **Foreign Keys**: All foreign key relationships have supporting indexes
- **RLS Performance**: Composite indexes on commonly filtered combinations (organization_id + status)
- **Analytics**: Dedicated indexes on materialized views for dashboard performance

### Materialized Views
- **Refresh Strategy**: Manual refresh via `refresh_analytics_views()` function
- **Performance**: Pre-computed aggregations for dashboard analytics
- **Storage**: Additional storage overhead for materialized data

### Query Optimization
- **RLS Functions**: Use SECURITY DEFINER to avoid repeated policy evaluations
- **Joins**: Indexed foreign key relationships for efficient joins
- **Filtering**: Composite indexes on commonly filtered column combinations

This documentation reflects the exact current state of the database as of the latest migration on 2025-01-10.