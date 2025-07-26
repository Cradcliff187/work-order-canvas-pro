# WorkOrderPortal Test Scenarios & Data Guide

## Overview

This document provides a comprehensive guide to the test data structure and scenarios available in the WorkOrderPortal database after seeding. The test data is designed to cover all major business workflows, user interactions, and edge cases to provide thorough testing coverage.

## Test Data Summary

### Organizations (8 total)
- **1 Internal**: WorkOrderPortal Internal (admin & employee users)
- **3 Partners**: ABC Property Management, XYZ Commercial Properties, Premium Facilities Group
- **4 Subcontractors**: Pipes & More Plumbing, Sparks Electric, Cool Air HVAC, Wood Works Carpentry, Brush Strokes Painting, Fix-It Maintenance, Green Thumb Landscaping

### Users (14 total)
- **2 Admins**: admin1@workorderportal.com, admin2@workorderportal.com
- **3 Employees**: employee1@workorderportal.com, employee2@workorderportal.com, employee3@workorderportal.com
- **3 Partners**: partner1@abc.com, partner2@abc.com, partner3@xyz.com, partner4@premium.com
- **6 Subcontractors**: Various trade specialists across multiple companies

### Test Login Credentials
**Password for all test users**: `Test123!`

## Business Workflow Test Scenarios

### 1. Partner Multi-Location Management

**Organization**: ABC Property Management
**Test Users**: partner1@abc.com, partner2@abc.com
**Test Scenario**: Large property management company with multiple locations

#### Test Coverage:
- **4 Partner Locations** with unique numbering (504, 505, 506, 507)
- **Location-based work order numbering** (ABC-504-001, ABC-505-002, etc.)
- **Multi-location work order submissions**
- **Inactive location handling** (Location 507 is inactive)
- **Contact management** per location

#### Example Queries:
```sql
-- View all ABC Property locations
SELECT location_name, location_number, is_active, contact_name 
FROM partner_locations 
WHERE organization_id = (SELECT id FROM organizations WHERE name = 'ABC Property Management');

-- Check work order numbering by location
SELECT work_order_number, partner_location_number, title, status 
FROM work_orders 
WHERE organization_id = (SELECT id FROM organizations WHERE name = 'ABC Property Management')
ORDER BY work_order_number;
```

#### Expected User Journey:
1. Partner logs in and sees 4 locations (3 active, 1 inactive)
2. Submits work order for specific location
3. Work order gets smart number: ABC-[location]-[sequence]
4. Tracks work orders by location and status
5. Receives completion notifications per location

### 2. Subcontractor Complete Workflow

**Organization**: Cool Air HVAC
**Test Users**: hvac1@coolairhvac.com, hvac2@coolairhvac.com
**Test Scenario**: HVAC subcontractor with multiple technicians

#### Test Coverage:
- **Work order assignments** to different technicians
- **Work order reports** with materials and hours tracking
- **Invoice generation** from completed work
- **Multi-status workflow** (received → assigned → in_progress → completed)
- **Payment processing** through various invoice states

#### Example Queries:
```sql
-- View HVAC work orders and their status
SELECT wo.work_order_number, wo.title, wo.status, p.first_name, p.last_name
FROM work_orders wo
JOIN profiles p ON p.id = wo.assigned_to
WHERE wo.assigned_organization_id = (SELECT id FROM organizations WHERE name = 'Cool Air HVAC');

-- Check invoice pipeline for HVAC work
SELECT i.internal_invoice_number, i.status, i.total_amount, i.submitted_at, i.paid_at
FROM invoices i
WHERE i.subcontractor_organization_id = (SELECT id FROM organizations WHERE name = 'Cool Air HVAC');
```

#### Expected User Journey:
1. Subcontractor receives work order assignment notification
2. Views assigned work orders in dashboard
3. Updates work order status to "in_progress"
4. Completes work and submits report with photos/materials
5. Admin reviews and approves report
6. System generates invoice automatically
7. Invoice goes through approval and payment workflow

### 3. Employee Internal Operations

**Organization**: WorkOrderPortal Internal
**Test Users**: employee1@workorderportal.com, employee2@workorderportal.com, employee3@workorderportal.com
**Test Scenario**: Internal employees handling maintenance and oversight

#### Test Coverage:
- **Internal work order assignments**
- **Employee time tracking** with hourly rates
- **Expense receipt management** with work order allocation
- **Multi-assignee coordination** (employee + subcontractor teams)
- **Quality oversight** and report reviews

#### Example Queries:
```sql
-- View employee time reports and costs
SELECT er.report_date, er.hours_worked, er.hourly_rate_snapshot, er.total_labor_cost, p.first_name
FROM employee_reports er
JOIN profiles p ON p.id = er.employee_user_id
ORDER BY er.report_date DESC;

-- Check expense receipt allocations
SELECT r.vendor_name, r.amount, r.description, rwo.allocated_amount, wo.title
FROM receipts r
JOIN receipt_work_orders rwo ON rwo.receipt_id = r.id
JOIN work_orders wo ON wo.id = rwo.work_order_id
ORDER BY r.receipt_date DESC;
```

#### Expected User Journey:
1. Employee receives internal work order assignment
2. Logs time worked with hourly rate tracking
3. Submits expense receipts for materials/fuel
4. Allocates expenses across multiple work orders
5. Coordinates with subcontractors on complex jobs
6. Reviews and approves subcontractor reports

### 4. Admin Management & Oversight

**Test Users**: admin1@workorderportal.com, admin2@workorderportal.com
**Test Scenario**: Administrative oversight and system management

#### Test Coverage:
- **Organization management** across all entity types
- **User management** with role-based permissions
- **Work order assignment** and reassignment
- **Report review** and approval workflow
- **Invoice approval** and payment authorization
- **System analytics** and performance monitoring

#### Example Queries:
```sql
-- System overview dashboard data
SELECT 
  COUNT(CASE WHEN status = 'received' THEN 1 END) as received_orders,
  COUNT(CASE WHEN status = 'assigned' THEN 1 END) as assigned_orders,
  COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_orders,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders
FROM work_orders;

-- Invoice approval pipeline
SELECT i.status, COUNT(*) as count, SUM(i.total_amount) as total_value
FROM invoices i
GROUP BY i.status
ORDER BY CASE i.status 
  WHEN 'submitted' THEN 1 
  WHEN 'approved' THEN 2 
  WHEN 'paid' THEN 3 
  ELSE 4 END;
```

#### Expected User Journey:
1. Admin views system dashboard with key metrics
2. Assigns incoming work orders to appropriate subcontractors
3. Reviews submitted work order reports for quality
4. Approves invoices for payment processing
5. Manages user accounts and organization relationships
6. Monitors system performance and audit logs

## Advanced Test Scenarios

### 5. Multi-Assignee Work Order Coordination

**Test Coverage**: Complex work orders with multiple assignees
- **Lead assignments** (primary responsibility)
- **Support assignments** (coordination and oversight)
- **Mixed internal/external** teams
- **Assignment notifications** and communication

#### Example Data:
- Work orders with both subcontractor lead and employee support
- Internal work orders with multiple employee assignments
- Complex multi-trade projects requiring coordination

### 6. Financial Data Complexity

**Test Coverage**: Complete financial workflow scenarios
- **Draft invoices** (not yet submitted)
- **Submitted invoices** (pending approval)
- **Approved invoices** (ready for payment)
- **Paid invoices** (completed workflow)
- **Multi work order invoices** (bundled billing)
- **Partial work order billing** (split across invoices)

### 7. Geographic Distribution Testing

**Test Coverage**: Multi-state, multi-city operations
- **New York** (ABC Property Management - 4 locations)
- **Los Angeles** (XYZ Commercial Properties - 3 locations)
- **Chicago** (Premium Facilities Group - 3 locations)
- **Cross-state** coordination and management

### 8. Audit Trail & Compliance

**Test Coverage**: Complete audit logging and compliance tracking
- **User creation** and modification logs
- **Work order status** change tracking
- **Invoice approval** audit trail
- **Report submission** and review history

## Data Relationships & Dependencies

### Core Relationships
```
Organizations (8)
├── Users (14) via user_organizations
├── Partner Locations (10) for partners only
└── Work Orders (16) created by partners/admins

Work Orders (16)
├── Assignments (15+) multi-assignee support
├── Reports (8) from completed/in-progress work
└── Attachments (file uploads)

Reports (8)
├── Invoice Work Orders (17) line items
└── Invoices (10) in various states

Employees (3)
├── Employee Reports (8) time tracking
├── Receipts (6) expense management
└── Receipt Allocations (10) work order distribution
```

### Smart Numbering System
- **ABC Property**: ABC-504-001, ABC-505-002, etc.
- **XYZ Commercial**: XYZ-101-001, XYZ-102-002, etc.
- **Premium Facilities**: PFG-EC1-001, PFG-IP2-002, etc.
- **Internal Work**: WOP-0001, WOP-0002, etc.

## Testing Best Practices

### 1. User Authentication Testing
```typescript
// Test all user types can log in
const testCredentials = [
  { email: 'admin1@workorderportal.com', type: 'admin' },
  { email: 'employee1@workorderportal.com', type: 'employee' },
  { email: 'partner1@abc.com', type: 'partner' },
  { email: 'hvac1@coolairhvac.com', type: 'subcontractor' }
];
```

### 2. Permission Testing
```sql
-- Test RLS policies by switching users
SET request.jwt.claims TO '{"sub": "partner_user_id", "email": "partner1@abc.com"}';
SELECT * FROM work_orders; -- Should only see own organization's orders
```

### 3. Workflow Testing
```sql
-- Test complete work order lifecycle
SELECT wo.work_order_number, wo.status, wor.status as report_status, i.status as invoice_status
FROM work_orders wo
LEFT JOIN work_order_reports wor ON wor.work_order_id = wo.id
LEFT JOIN invoice_work_orders iwo ON iwo.work_order_id = wo.id
LEFT JOIN invoices i ON i.id = iwo.invoice_id
WHERE wo.status = 'completed';
```

### 4. Financial Accuracy Testing
```sql
-- Verify invoice totals match work order report amounts
SELECT 
  i.internal_invoice_number,
  i.total_amount as invoice_total,
  SUM(iwo.amount) as line_item_total,
  SUM(wor.invoice_amount) as report_total
FROM invoices i
JOIN invoice_work_orders iwo ON iwo.invoice_id = i.id
JOIN work_order_reports wor ON wor.id = iwo.work_order_report_id
GROUP BY i.id, i.internal_invoice_number, i.total_amount
HAVING i.total_amount != SUM(iwo.amount);
```

## Development & QA Usage

### Quick Data Reset
```sql
-- Use the seed function to reset test data
SELECT * FROM clear_test_data();
-- Then re-run seeding via edge function
```

### Performance Testing
- **16 work orders** with various states for load testing
- **14 users** across 4 user types for permission testing
- **10 invoices** in different states for financial workflow testing
- **Multiple assignments** per work order for coordination testing

### Integration Testing
- **Email notifications** triggered by status changes
- **File uploads** for work order photos and invoice documents
- **Real-time updates** for dashboard and status changes
- **Multi-tenant isolation** verification

This comprehensive test data structure ensures thorough coverage of all WorkOrderPortal features and workflows while providing realistic business scenarios for development and quality assurance testing.

## Messaging Test Scenarios

### Overview
The messaging system provides in-app real-time communication between users with role-based visibility. These test scenarios verify message visibility rules, real-time functionality, and cross-organizational boundaries.

### 9. Partner Posts Public Message on Work Order ABC-001-001

**Test Scenario**: Partner user posts a public message that should be visible to all authorized users
**Test User**: partner1@abc.com
**Target Work Order**: ABC-001-001 (ABC Property Management work order)

#### Test Coverage:
- **Public message visibility** to subcontractors and admins
- **Message creation** by partner users
- **Real-time message delivery** across user types
- **Cross-organization communication** boundaries

#### Example Test Query:
```sql
-- Create public message from partner
INSERT INTO work_order_messages (work_order_id, sender_id, message, is_internal)
VALUES (
  (SELECT id FROM work_orders WHERE work_order_number = 'ABC-001-001'),
  (SELECT id FROM profiles WHERE email = 'partner1@abc.com'),
  'Work site is ready for HVAC installation. Please coordinate entry with building manager.',
  false
);

-- Verify message visibility for subcontractor
SELECT m.message, m.is_internal, p.first_name, p.last_name, p.user_type
FROM work_order_messages m
JOIN profiles p ON p.id = m.sender_id
WHERE m.work_order_id = (SELECT id FROM work_orders WHERE work_order_number = 'ABC-001-001')
  AND m.is_internal = false;
```

#### Expected Results:
- Partner can post public message
- Assigned subcontractor can see the message
- Admin users can see the message
- Message appears in real-time for all authorized users

### 10. Subcontractor Posts Internal Note on Assigned Work Order

**Test Scenario**: Subcontractor posts internal note that partners should NOT see
**Test User**: hvac1@coolairhvac.com
**Target Work Order**: ABC-001-001 (assigned to Cool Air HVAC)

#### Test Coverage:
- **Internal message creation** by subcontractors
- **Message visibility restriction** from partners
- **Admin access** to internal communications
- **RLS policy enforcement** for message privacy

#### Example Test Query:
```sql
-- Create internal message from subcontractor
INSERT INTO work_order_messages (work_order_id, sender_id, message, is_internal)
VALUES (
  (SELECT id FROM work_orders WHERE work_order_number = 'ABC-001-001'),
  (SELECT id FROM profiles WHERE email = 'hvac1@coolairhvac.com'),
  'Found additional damage to ductwork. Will need extra materials and 2 more hours.',
  true
);

-- Test partner CANNOT see internal message (should return empty)
SET request.jwt.claims TO '{"sub": "partner_user_id", "email": "partner1@abc.com"}';
SELECT COUNT(*) as visible_internal_messages
FROM work_order_messages m
WHERE m.work_order_id = (SELECT id FROM work_orders WHERE work_order_number = 'ABC-001-001')
  AND m.is_internal = true;
-- Should return 0

-- Test admin CAN see internal message
SET request.jwt.claims TO '{"sub": "admin_user_id", "email": "admin1@workorderportal.com"}';
SELECT m.message, m.is_internal, p.first_name, p.user_type
FROM work_order_messages m
JOIN profiles p ON p.id = m.sender_id
WHERE m.work_order_id = (SELECT id FROM work_orders WHERE work_order_number = 'ABC-001-001')
  AND m.is_internal = true;
```

#### Expected Results:
- Subcontractor can post internal message
- Partner users CANNOT see internal messages
- Admin users CAN see all messages (public and internal)
- RLS policies correctly restrict visibility

### 11. Admin Sees Both Types of Messages

**Test Scenario**: Admin user has full visibility to all message types
**Test User**: admin1@workorderportal.com
**Target Work Order**: ABC-001-001

#### Test Coverage:
- **Admin full message visibility** (public + internal)
- **Message type filtering** and display
- **Administrative oversight** capabilities
- **Cross-organizational message access**

#### Example Test Query:
```sql
-- Admin views all messages on work order
SET request.jwt.claims TO '{"sub": "admin_user_id", "email": "admin1@workorderportal.com"}';
SELECT 
  m.message,
  m.is_internal,
  p.first_name,
  p.last_name,
  p.user_type,
  o.name as sender_organization,
  m.created_at
FROM work_order_messages m
JOIN profiles p ON p.id = m.sender_id
LEFT JOIN user_organizations uo ON uo.user_id = p.id
LEFT JOIN organizations o ON o.id = uo.organization_id
WHERE m.work_order_id = (SELECT id FROM work_orders WHERE work_order_number = 'ABC-001-001')
ORDER BY m.created_at;
```

#### Expected Results:
- Admin sees both public and internal messages
- Messages are properly categorized by type
- Sender information and organization context is visible
- Full audit trail of work order communications

### 12. Test Partner Cannot See Internal Messages

**Test Scenario**: Verify RLS policies prevent partners from accessing internal communications
**Test User**: partner2@abc.com
**Target**: Multiple work orders with internal messages

#### Test Coverage:
- **RLS policy enforcement** for message visibility
- **Cross-work order message isolation**
- **Partner access boundaries** verification
- **Security compliance** testing

#### Example Test Query:
```sql
-- Attempt to view internal messages as partner (should fail/return empty)
SET request.jwt.claims TO '{"sub": "partner_user_id", "email": "partner2@abc.com"}';

-- This should return 0 internal messages visible to partner
SELECT COUNT(*) as partner_visible_internal_messages
FROM work_order_messages m
JOIN work_orders wo ON wo.id = m.work_order_id
WHERE wo.organization_id = (SELECT id FROM organizations WHERE name = 'ABC Property Management')
  AND m.is_internal = true;

-- Verify partner can only see public messages
SELECT 
  m.message,
  m.is_internal,
  wo.work_order_number
FROM work_order_messages m
JOIN work_orders wo ON wo.id = m.work_order_id
WHERE wo.organization_id = (SELECT id FROM organizations WHERE name = 'ABC Property Management')
  AND m.is_internal = false
ORDER BY m.created_at DESC;
```

#### Expected Results:
- Partner sees 0 internal messages
- Partner can only access public messages on their work orders
- Security boundaries are properly maintained
- No data leakage between message types

### Real-Time Testing Scenarios

#### 13. Message Synchronization Testing
- **Test offline message queuing** when network is unavailable
- **Verify message delivery** when connection is restored
- **Test real-time subscriptions** across multiple browser tabs
- **Validate message order** and timestamp accuracy

#### 14. Cross-Organization Message Boundaries
- **Verify organization isolation** for work order messages
- **Test subcontractor message access** only to assigned work orders
- **Validate partner message scope** to their organization's work orders
- **Confirm admin global access** across all organizations

### Message System Performance Testing

#### Test Data for Load Testing:
```sql
-- Generate test messages for performance testing
INSERT INTO work_order_messages (work_order_id, sender_id, message, is_internal)
SELECT 
  wo.id,
  (SELECT id FROM profiles WHERE email = 'admin1@workorderportal.com'),
  'Test message ' || generate_series,
  (generate_series % 2 = 0) -- Alternate between public and internal
FROM work_orders wo, generate_series(1, 100)
WHERE wo.work_order_number LIKE 'ABC-%';
```

This messaging test framework ensures comprehensive validation of the real-time communication system while maintaining security and organizational boundaries.
