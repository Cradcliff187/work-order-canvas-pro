
# WorkOrderPro Database Schema Documentation

## Overview

WorkOrderPro uses a PostgreSQL database hosted on Supabase with comprehensive Row Level Security (RLS) policies. The system supports multi-organization architecture with role-based access control across Partners, Subcontractors, and Internal Employees.

## Core Tables

### users (Supabase Auth)
Managed by Supabase Auth service - contains authentication data only.

### profiles
Stores user profile information and links to Supabase Auth users.

```sql
- id (UUID, primary key) 
- user_id (UUID, references auth.users)
- email (string, unique)
- first_name (string)
- last_name (string) 
- user_type (enum: 'admin', 'partner', 'subcontractor', 'employee')
- company_name (string, auto-updated from organization)
- phone (string, nullable)
- hourly_cost_rate (decimal, nullable)
- hourly_billable_rate (decimal, nullable)
- is_employee (boolean, default false)
- is_active (boolean, default true)
- created_at (timestamp)
- updated_at (timestamp)
```

### organizations
Stores company/organization information for partners and subcontractors.

```sql
- id (UUID, primary key)
- name (string, unique)
- organization_type (enum: 'internal', 'partner', 'subcontractor')
- contact_email (string)
- contact_phone (string)
- address (text, nullable)
- initials (string, 2-4 chars for work order numbering)
- uses_partner_location_numbers (boolean, default false)
- next_location_sequence (integer, default 1)
- next_sequence_number (integer, default 1)
- is_active (boolean, default true)
- created_at (timestamp)
- updated_at (timestamp)
```

### user_organizations
Junction table linking users to organizations with validation.

```sql
- id (UUID, primary key)
- user_id (UUID, references profiles.id)
- organization_id (UUID, references organizations.id)
- created_at (timestamp)
```

### trades
Defines available trade types (Plumbing, Electrical, HVAC, etc.).

```sql
- id (UUID, primary key)
- name (string, unique not null)
- description (text)
- is_active (boolean, default true)
- created_at (timestamp)
- updated_at (timestamp)
```

### partner_locations
Physical locations for partner organizations.

```sql
- id (UUID, primary key)
- organization_id (UUID, references organizations)
- location_name (string)
- location_number (string) -- Auto-generated or manual
- street_address (string)
- city (string)
- state (string)
- zip_code (string)
- contact_name (string, nullable)
- contact_email (string, nullable)
- contact_phone (string, nullable)
- is_active (boolean, default true)
- created_at (timestamp)
- updated_at (timestamp)
```

### work_orders
Core work order management table.

```sql
- id (UUID, primary key)
- work_order_number (string, unique, auto-generated)
- title (string)
- description (text)
- organization_id (UUID, references organizations)
- trade_id (UUID, references trades)
- status (enum: 'received', 'assigned', 'in_progress', 'completed', 'cancelled')
- assigned_to (UUID, references profiles.id, nullable)
- estimated_hours (decimal, nullable)
- actual_hours (decimal, nullable)
- estimated_completion_date (date, nullable)
- completed_at (timestamp, nullable)
- date_submitted (timestamp, default now())
- date_assigned (timestamp, nullable)
- store_location (string)
- street_address (string)
- city (string)
- state (string)
- zip_code (string)
- created_by (UUID, references profiles.id)
- created_at (timestamp)
- updated_at (timestamp)
```

### work_order_assignments
Modern assignment system supporting multiple assignees per work order.

```sql
- id (UUID, primary key)
- work_order_id (UUID, references work_orders)
- assigned_to (UUID, references profiles.id)
- assigned_by (UUID, references profiles.id)
- assigned_organization_id (UUID, references organizations)
- assignment_type (enum: 'lead', 'support')
- notes (text, nullable)
- created_at (timestamp)
- updated_at (timestamp)
```

### work_order_reports
Subcontractor completion reports with approval workflow.

```sql
- id (UUID, primary key)
- work_order_id (UUID, references work_orders)
- subcontractor_user_id (UUID, references profiles.id)
- work_performed (text)
- materials_used (text, nullable)
- hours_worked (decimal, nullable)
- invoice_amount (decimal)
- invoice_number (string, nullable)
- notes (text, nullable)
- status (enum: 'submitted', 'approved', 'rejected')
- submitted_at (timestamp, default now())
- reviewed_by (UUID, references profiles.id, nullable)
- reviewed_at (timestamp, nullable)
- review_notes (text, nullable)
- created_at (timestamp)
- updated_at (timestamp)
```

### work_order_attachments
File attachments for work orders and reports.

```sql
- id (UUID, primary key)
- work_order_id (UUID, references work_orders, nullable)
- work_order_report_id (UUID, references work_order_reports, nullable)
- file_name (string)
- file_url (string)
- file_type (string) -- "photo", "invoice", "document"
- file_size (integer, nullable)
- uploaded_by (UUID, references profiles.id)
- uploaded_at (timestamp, default now())
```

## Email System Tables

### email_templates
Stores all email templates for the unified Resend email system.

```sql
- id (UUID, primary key)
- template_name (string, unique)
- subject (string)
- html_content (text)
- description (text, nullable)
- variables (jsonb, nullable) -- Available template variables
- is_active (boolean, default true)
- created_at (timestamp)
- updated_at (timestamp)
```

**Email Templates**:
All templates route through the `send-email` Edge Function using Resend API:

**Transactional Templates**:
- `work_order_created` - Notifies admins of new work orders
- `work_order_assigned` - Notifies assigned subcontractor
- `work_order_completed` - Notifies partner of completion
- `report_submitted` - Notifies admins of new reports
- `report_reviewed` - Notifies subcontractor of review status
- `welcome_email` - Welcome message for new users
- `test_email` - System testing template

**Authentication Templates**:
- `auth_confirmation` - Account confirmation email with activation link
- `password_reset` - Password reset email with recovery link

### email_logs
Comprehensive email delivery tracking for all emails sent via Resend.

```sql
- id (UUID, primary key)
- template_name (string)
- recipient_email (string)
- resend_message_id (string, nullable)
- record_id (string, nullable) -- Associated record UUID
- record_type (string, nullable) -- 'work_order', 'work_order_report', 'user', etc.
- status (enum: 'sent', 'delivered', 'failed', 'bounced')
- error_message (text, nullable)
- test_mode (boolean, default false)
- sent_at (timestamp, default now())
- delivered_at (timestamp, nullable)
- metadata (jsonb, nullable)
```

## Financial Management Tables

### invoices
Subcontractor invoice management.

```sql
- id (UUID, primary key)
- invoice_number (string, unique)
- subcontractor_id (UUID, references profiles.id)
- total_amount (decimal)
- status (enum: 'draft', 'submitted', 'approved', 'paid')
- invoice_date (date)
- due_date (date, nullable)
- notes (text, nullable)
- created_at (timestamp)
- updated_at (timestamp)
```

### invoice_work_orders
Links invoices to work orders for billing.

```sql
- id (UUID, primary key)
- invoice_id (UUID, references invoices)
- work_order_id (UUID, references work_orders)
- amount (decimal)
- created_at (timestamp)
```

### receipts
Expense receipt management for subcontractors.

```sql
- id (UUID, primary key)
- subcontractor_id (UUID, references profiles.id)
- amount (decimal)
- description (text)
- receipt_date (date)
- category (string, nullable)
- created_at (timestamp)
- updated_at (timestamp)
```

### employee_reports
Internal employee time tracking reports.

```sql
- id (UUID, primary key)
- employee_id (UUID, references profiles.id)
- work_order_id (UUID, references work_orders)
- hours_worked (decimal)
- work_performed (text)
- report_date (date)
- notes (text, nullable)
- created_at (timestamp)
- updated_at (timestamp)
```

## System Tables

### audit_logs
Comprehensive audit trail for all system changes.

```sql
- id (UUID, primary key)
- table_name (string)
- record_id (UUID)
- action (enum: 'create', 'update', 'delete', 'STATUS_CHANGE')
- old_values (jsonb, nullable)
- new_values (jsonb, nullable)
- user_id (UUID, references profiles.id, nullable)
- created_at (timestamp, default now())
```

## Key Features

### Format Validation Constraints
The database enforces consistent data formatting through CHECK constraints:

**Phone Number Format:**
- Pattern: `(555) 123-4567`
- Regex: `^\(\d{3}\) \d{3}-\d{4}$`
- Allows NULL and empty strings
- Applied to: `profiles.phone`, `organizations.contact_phone`, `partner_locations.contact_phone`

**Email Format:**
- Pattern: lowercase, trimmed, valid email format
- Regex: `^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$`
- Ensures email = lower(trim(email))
- Allows NULL and empty strings
- Applied to: `profiles.email`, `organizations.contact_email`, `partner_locations.contact_email`

These constraints work with our FormattedInput components to ensure data consistency at both the UI and database levels.

### Multi-Organization Architecture
- Organizations are typed (internal, partner, subcontractor)
- Users belong to exactly one organization (except admins)
- Work orders are scoped to requesting organization
- Financial privacy between organizations

### Work Order Numbering
Auto-generated format: `{ORG_INITIALS}-{LOCATION}-{SEQUENCE}`
- Example: `ABC-001-025` (ABC Property, Location 001, 25th work order)

### Status Workflow
**Work Orders**: received → assigned → in_progress → completed
**Reports**: submitted → approved/rejected

### Email System Architecture
- **Unified Delivery**: All emails (transactional + auth) use Resend API
- **Template Management**: 9 templates stored in `email_templates` table
- **Delivery Tracking**: Complete audit trail in `email_logs` table
- **Bypass Supabase**: Custom auth email flow bypasses unreliable Supabase SMTP
- **Edge Function**: Single `send-email` function handles all email types

### Security Features
- Row Level Security (RLS) on all tables
- Role-based access control
- Organization-scoped data access
- Comprehensive audit logging
- Secure file storage integration

This schema supports the complete WorkOrderPro workflow from partner work order submission through subcontractor assignment, completion reporting, and financial management.
