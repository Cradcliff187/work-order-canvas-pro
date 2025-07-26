# WorkOrderPortal Row Level Security (RLS) Policies

## Overview

WorkOrderPortal implements comprehensive Row Level Security (RLS) with company-level access control to ensure proper data isolation between different user types and organizations. The system uses helper functions and a layered policy approach to avoid infinite recursion while providing efficient multi-tenant access control.

## Company Access Model

WorkOrderPortal supports both individual access (backward compatibility) and company-level access (new enhanced model) simultaneously:

### Access Patterns

| Access Type | Description | Use Cases |
|-------------|-------------|-----------|
| **Individual Access** | Work orders assigned to specific users | Legacy work orders, sensitive projects |
| **Company Access** | Work orders assigned to entire organizations | Team collaboration, scalable operations |

### Business Logic

**Company Access Patterns**:
- **Partner Organizations**: Can view/manage work orders they submitted
- **Subcontractor Organizations**: Can view/work on work orders assigned to their company
- **Internal Organization**: Full access to all work orders and system management
- **Financial Privacy**: Each organization only sees their own financial data (invoices, rates)

## User Types and Access Matrix

| User Type | Access Level | Description |
|-----------|--------------|-------------|
| **admin** | Full access to all data | System administrators with unrestricted access |
| **employee** | Full access to all profiles | Internal employees with broad operational access |
| **partner** | Organization-scoped access | Access limited to their organization's data (excluding employees) |
| **subcontractor** | Assignment-based access | Access limited to work orders assigned to them |

## Common Troubleshooting Issues

### "new row violates row-level security policy"
- **Cause**: Attempting user creation through browser/client code or missing user_id field
- **Solution**: Use Edge Functions with service role key, ensure user_id is set correctly
- **Details**: RLS policies prevent client-side user creation for security

### "infinite recursion detected in policy"
- **Cause**: Helper functions querying profiles table from within profile policies
- **Solution**: Use direct auth.uid() comparisons in profile policies
- **Prevention**: Never query profiles table from within profile RLS policies

### Permission denied errors
- **Verify**: User is authenticated (auth.uid() returns UUID)
- **Check**: User type assignment in profiles table
- **Verify**: Organization relationships in user_organizations table

### User creation and authentication failures
- **Missing profile record**: Ensure profile creation follows auth user creation
- **Organization access denied**: Missing user_organizations relationship
- **Invalid user types**: Check enum values match system requirements

## Access Rules by Table

### Table: audit_logs
**Purpose**: System audit trail for all data changes
**Migration**: 20250711000002_add_audit_triggers.sql
**Access Rules**:
- Admins: Can view all audit logs for system monitoring
- Other users: No access to audit data
**Security Notes**: Critical for compliance and debugging, admin-only access

### Table: email_logs  
**Purpose**: Email delivery tracking and history
**Migration**: 20250710161656-14296adf-69c7-4c0e-b298-a55bed74966f.sql
**Access Rules**:
- Admins: Can view and delete all email logs
- Partners: Can view email logs for their organization's work orders
- Other users: No access to email logs
**Security Notes**: Partners can track communication for their submitted work orders

### Table: email_settings
**Purpose**: Organization-specific email configuration
**Migration**: 20250710161656-14296adf-69c7-4c0e-b298-a55bed74966f.sql
**Access Rules**:
- Admins: Full management of all email settings
- Other users: No access to email configuration
**Security Notes**: Admin-only to prevent unauthorized email changes

### Table: email_templates
**Purpose**: System email templates for notifications
**Migration**: 20250710161656-14296adf-69c7-4c0e-b298-a55bed74966f.sql
**Access Rules**:
- Admins: Full management of all email templates
- Partners and Subcontractors: Can view active templates for reference
**Security Notes**: Template visibility helps users understand system communications

### Table: employee_reports
**Purpose**: Internal employee time and work reporting
**Migration**: 20250711142955-7d1847a2-7903-4af1-8ee7-d9c876078431.sql
**Access Rules**:
- Admins: Full management of all employee reports
- Employees: Can create, update, and view their own reports
**Security Notes**: Individual access prevents employees from seeing each other's data

### Table: invoice_attachments
**Purpose**: File attachments for subcontractor invoices
**Migration**: 20250711220728-c2133970-31fd-4255-a075-83709bcaafa1.sql
**Access Rules**:
- Admins: Full management of all invoice attachments
- Subcontractors: Can manage attachments for their organization's invoices
**Security Notes**: Organization-level access supports team invoice management

### Table: invoice_work_orders
**Purpose**: Links invoices to specific work orders with amounts
**Migration**: 20250711220728-c2133970-31fd-4255-a075-83709bcaafa1.sql
**Access Rules**:
- Admins: Can view all invoice work order relationships
- Subcontractors: Can manage relationships for modifiable invoices (submitted/rejected status)
**Security Notes**: Status-based editing prevents changes to approved invoices

### Table: invoices
**Purpose**: Subcontractor invoice management and approval workflow
**Migration**: 20250711220728-c2133970-31fd-4255-a075-83709bcaafa1.sql
**Access Rules**:
- Admins: Can view and update all invoices for approval/payment
- Subcontractors: Can create drafts, view their company invoices, update modifiable invoices, delete draft invoices
**Security Notes**: Status-based workflow prevents unauthorized changes to processed invoices

## Messaging System Policies

The WorkOrderPortal messaging system enables secure communication between different user types while maintaining strict visibility controls based on message type and organizational relationships.

### Message Visibility Rules

**Public Messages (is_internal=false)**:
- Visible to partner organizations that submitted the work order
- Visible to all internal team members (admins/employees)
- Used for client-facing communication and updates

**Internal Messages (is_internal=true)**:
- Visible to internal team members (admins/employees)
- Visible to assigned subcontractors for the specific work order
- Used for operational coordination and sensitive information

### Message Creation Restrictions

**Partners**:
- Can only create public messages (is_internal=false)
- Limited to work orders from their organization
- Ensures client communication remains professional and accessible

**Subcontractors**:
- Can only create internal messages (is_internal=true)
- Limited to work orders assigned to them
- Keeps operational details private from clients

**Admins/Employees**:
- Can create both public and internal messages
- Full access to all work order conversations
- Can moderate and manage all communications

### Table: work_order_messages
**Purpose**: Real-time messaging system for work order communication
**Migration**: 20250712204423-9a1234b5-6c78-9d01-2e34-56789abcdef0.sql
**Access Rules (8 policies)**:
- Admins: Full management of all messages (select, insert, update, delete)
- Employees: Full management of all messages (select, insert, update, delete) 
- Partners: Can view public messages for their org work orders, can insert public messages only
- Subcontractors: Can view all messages for assigned work orders, can insert internal messages only
**Security Notes**: Message visibility strictly enforced through is_internal flag and organizational boundaries

### Table: message_read_receipts  
**Purpose**: Tracks when users have read specific messages for notification management
**Migration**: 20250712204423-9a1234b5-6c78-9d01-2e34-56789abcdef0.sql
**Access Rules (1 policy)**:
- All authenticated users: Full management of their own read receipts only
**Security Notes**: Individual read tracking prevents cross-user visibility of reading habits

### Table: organizations
**Purpose**: Company/organization master data
**Migration**: 20250710162019-bb5da63a-ae41-496a-9614-5056c64eb672.sql
**Access Rules**:
- Admins: Full management of all organizations
- Partners: Can view their own organizations
- Subcontractors: Can view organizations they work for through assignments
**Security Notes**: Organization visibility based on business relationships

### Table: partner_locations
**Purpose**: Physical locations managed by partner organizations
**Migration**: 20250711150648-e7ae348e-52c6-4faf-9707-2ce383a49345.sql
**Access Rules**:
- Admins: Full management of all partner locations
- Partners: Full management of their organization's locations
- Subcontractors: Can view locations for their assigned work orders
**Security Notes**: Location access tied to work assignments for operational needs

### Table: profiles
**Purpose**: User profile information and system access control
**Migration**: 20250711034638-ec031157-2ac8-445b-aaf5-6ecf0870a7c5.sql
**Access Rules**:
- All authenticated users: Can read basic profile info (for app functionality)
- Users: Can read and update their own profile, can create their own profile
- Admins: Can delete profiles, can insert/update any profile, can update employee profiles
**Security Notes**: Anti-recursion design prevents infinite loops in access checks

### Table: receipt_work_orders
**Purpose**: Links employee receipts to specific work orders for cost allocation
**Migration**: 20250712230350-1c8b9302-7eae-42b6-aed1-6bea8154e019.sql
**Access Rules**:
- Admins: Full management of all receipt allocations
- Employees: Can create and view their own receipt allocations
**Security Notes**: Individual access prevents cross-employee receipt visibility

### Table: receipts
**Purpose**: Employee expense receipts and reimbursement tracking
**Migration**: 20250712230350-1c8b9302-7eae-42b6-aed1-6bea8154e019.sql
**Access Rules**:
- Admins: Full management of all receipts
- Employees: Can create, update, and view their own receipts
**Security Notes**: Individual access protects employee financial privacy

### Table: system_settings
**Purpose**: Global system configuration and settings
**Migration**: 20250710161656-14296adf-69c7-4c0e-b298-a55bed74966f.sql
**Access Rules**:
- Admins: Full management of all system settings
- Other users: No access to system configuration
**Security Notes**: Admin-only access prevents unauthorized system changes

### Table: trades
**Purpose**: Work specialization categories (plumbing, electrical, etc.)
**Migration**: 20250710160818-53288303-3330-4191-b5f4-5ced60ea15b5.sql
**Access Rules**:
- Admins: Full management of all trades
- Partners and Subcontractors: Can view active trades for work order creation
**Security Notes**: Read access enables proper work categorization

### Table: user_organizations
**Purpose**: Links users to their organizations for access control
**Migration**: 20250710162019-bb5da63a-ae41-496a-9614-5056c64eb672.sql
**Access Rules**:
- Admins: Full management of all user-organization relationships
- Users: Can view their own organization relationships
- Partners: Can manage relationships within their organizations
**Security Notes**: Foundation for organization-based access control

### Table: work_order_assignments
**Purpose**: Tracks who is assigned to work on specific work orders
**Migration**: 20250711192433-5ff087f7-7d27-49ea-8aba-921d49fb27e6.sql
**Access Rules**:
- Admins: Full management of all work order assignments
- Employees: Can view their own assignments
- Partners: Can view assignments for their organization's work orders
- Subcontractors: Can view their own assignments and organization assignments
**Security Notes**: Visibility based on assignment relationship for operational coordination

### Table: work_order_attachments
**Purpose**: File attachments for work orders and reports (photos, documents)
**Migration**: 20250710170456-0beb27c1-5b99-4c44-af2b-2ecccb490a26.sql
**Access Rules**:
- Admins: Full management of all work order attachments
- Partners: Can view attachments for their organization's work orders
- Subcontractors: Can manage attachments for their work (uploads, assigned work, reports)
**Security Notes**: Comprehensive access for subcontractors supports full workflow participation

### Table: work_order_reports
**Purpose**: Completion reports submitted by subcontractors
**Migration**: 20250710173317-553aa188-441e-4fc2-85d9-e5f8af7c515d.sql
**Access Rules**:
- Admins: Full management of all work order reports
- Partners: Can view and update reports for their organization's work orders
- Subcontractors: Can manage their own reports and organization reports
**Security Notes**: Partners can review work completion for their submitted orders

### Table: work_orders
**Purpose**: Core work request and assignment management
**Migration**: 20250710162019-bb5da63a-ae41-496a-9614-5056c64eb672.sql
**Access Rules**:
- Admins: Full management of all work orders
- Partners: Full management of work orders in their organizations
- Subcontractors: Can view work orders assigned to them or their organization
**Security Notes**: Assignment-based access ensures subcontractors only see relevant work

## Authentication and User Creation

### Service Role User Creation
User creation must be performed through Edge Functions using the service role key to bypass RLS policies. Direct browser-based user creation will fail due to security restrictions.

### Admin Access Validation
Database functions validate admin access using existing authentication mechanisms. The system uses SECURITY DEFINER functions to safely bypass RLS when necessary for administrative operations.

### Organization Relationships
Access control heavily relies on user_organizations table relationships. Missing relationships are a common cause of permission issues.

## Financial Data Access Patterns

**Organization-Level Access (Invoices)**:
- Subcontractors access invoices through organization membership
- Restricted by invoice status (submitted/rejected only for modifications)
- Status-based workflow prevents unauthorized changes to processed invoices

**Individual-Level Access (Reports & Receipts)**:
- Employees access only their own reports and receipts
- Direct profile ID comparison for security
- Full CRUD access to their personal data

**Status-Based Security Model**:
- Subcontractors can only resubmit rejected invoices
- Only admins can approve/reject invoices or mark as paid
- Protected financial fields prevent unauthorized changes

## Performance Considerations

**Key Indexes Supporting RLS Performance**:
- Organization membership lookups on user_organizations table
- Work order assignments and organization relationships
- Profile lookups by user_id and user_type
- Financial table performance indexes for status and organization queries

**Function Performance**:
- All helper functions use STABLE qualifier for caching
- SECURITY DEFINER prevents infinite recursion
- Functions avoid complex JOINs where possible

## Email System Security

**Function Security**:
- Email notification functions use SECURITY DEFINER to access pg_net extension safely
- Template access restricted through is_active flag for version control
- Edge function integration provides asynchronous email delivery
- Error isolation ensures email failures don't block main database operations

**Access Control**:
- Admin users: Full management of email templates and logs
- Partner/Subcontractor users: Read-only access to active templates only
- Partner organizations: Can view email logs for their work orders only
- Delivery tracking includes status updates from email service
