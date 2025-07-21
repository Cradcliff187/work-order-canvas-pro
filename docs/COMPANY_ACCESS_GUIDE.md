# WorkOrderPortal Company Access Guide

## Executive Summary

WorkOrderPortal provides **company-level access control** that enables teams to collaborate on work orders while maintaining financial privacy between organizations. This guide explains how the system works for business users and provides real-world usage scenarios.

## Business Model Overview

WorkOrderPortal facilitates a three-party construction management workflow:

**🏢 Partners** submit work orders → **🔧 WorkOrderPortal** manages workflow → **⚡ Subcontractors** complete work

### Organization Types

| Type | Role | Access Level | Examples |
|------|------|--------------|----------|
| **🏢 Partner** | Work order submitters | Own organization data + progress tracking | Property management companies, retail chains |
| **⚡ Subcontractor** | Work performers | Assigned work orders + team reports | Plumbing companies, HVAC contractors, electricians |
| **🔧 Internal** | Workflow managers | Full system access | General contractor, WorkOrderPortal administration |

## Company Access Features

### 1. Team-Based Work Orders

**Traditional Model**: Work orders assigned to individual users only
**Company Model**: Work orders assigned to entire organizations

```
❌ Old: Work order → Individual subcontractor
✅ New: Work order → Subcontractor organization → Any team member can work on it
```

**Business Benefits**:
- **Flexibility**: Any qualified team member can take on work
- **Scalability**: Add unlimited team members without individual setup
- **Continuity**: Work continues even if specific employees are unavailable
- **Load Balancing**: Distribute work across available team members

### 2. Organization-Level Assignments

**Example Scenario**: ABC Plumbing (5 employees) receives work order assignment

**Before Company Access**:
- Work order assigned to "John Smith" only
- Other ABC Plumbing employees cannot see or work on it
- If John is unavailable, work stops

**With Company Access**:
- Work order assigned to "ABC Plumbing" organization
- All 5 ABC Plumbing employees can see and work on it
- Any team member can submit reports
- Automatic backup coverage

### 3. Financial Privacy Model

**Company-Level Sharing with Cross-Company Privacy**:

| Data Type | Partner Visibility | Subcontractor Visibility | Admin Visibility |
|-----------|-------------------|-------------------------|------------------|
| Work Order Details | ✅ Own submissions | ✅ Assigned work | ✅ All work orders |
| Work Reports | ✅ For own work orders | ✅ Own organization reports | ✅ All reports |
| Invoice Amounts | ❌ Cannot see | ✅ Own organization invoices | ✅ All invoices |
| Employee Rates | ❌ Cannot see | ❌ Cannot see | ✅ All rates |

**Privacy Protection**:
- ABC Plumbing cannot see XYZ Electric's invoice amounts
- Partners cannot see any subcontractor financial data
- Each organization only sees their own financial information

## User Workflows by Type

### 🏢 Partner Organization Users

**Example**: Sarah (Property Manager) at Premium Properties

**Typical Workflow**:
1. **Submit Work Order**: "HVAC maintenance needed at Store #247"
2. **Track Progress**: Monitor assignment and completion status
3. **Review Reports**: See work performed and photos (no financial details)
4. **Approve Completion**: Confirm work meets requirements

**Team Collaboration**:
- Sarah submits work order
- Mike (Facilities Manager) tracks progress
- Lisa (Site Coordinator) reviews completion
- All Premium Properties team members see the same work order

**Access Permissions**:
- ✅ View/edit own organization's work orders
- ✅ See work progress and reports
- ✅ Submit new work requests
- ❌ Cannot see invoice amounts or rates
- ❌ Cannot access other partner organizations' data

### ⚡ Subcontractor Organization Users

**Example**: Tom (Lead Technician) at ABC Plumbing

**Typical Workflow**:
1. **Receive Assignment**: Work order appears for entire ABC Plumbing team
2. **Coordinate Internally**: Team decides who will handle the work
3. **Perform Work**: Complete the assigned tasks
4. **Submit Report**: Upload photos, document work performed, submit invoice
5. **Track Payment**: Monitor invoice approval and payment status

**Team Collaboration**:
- Tom sees new assignment notification
- Maria (Plumber) volunteers to take the job
- David (Supervisor) reviews Maria's report before submission
- All ABC Plumbing team members can contribute

**Access Permissions**:
- ✅ View assigned work orders for organization
- ✅ Submit reports for any organization work
- ✅ See team reports and invoices
- ✅ Upload photos and documentation
- ❌ Cannot see other subcontractor organizations' data
- ❌ Cannot access partner financial information

### 🔧 Internal Organization Users

**Example**: Jennifer (Project Manager) at WorkOrderPortal Internal

**Administrative Workflow**:
1. **Monitor Submissions**: Review incoming partner work orders
2. **Assign Work**: Route work orders to appropriate subcontractor organizations
3. **Track Progress**: Monitor work completion across all organizations
4. **Review Reports**: Approve/reject subcontractor reports
5. **Manage Payments**: Process invoice approvals and payments

**Employee Workflow** (for field employees):
1. **Receive Assignment**: Internal work orders for direct completion
2. **Track Time**: Log hours worked on each project
3. **Submit Reports**: Document work performed and expenses
4. **Expense Management**: Upload receipts and allocate costs to work orders

**Access Permissions**:
- ✅ Full access to all system data
- ✅ Assign work to any organization
- ✅ View financial data across all organizations
- ✅ Manage user accounts and permissions

## Real-World Usage Scenarios

### Scenario 1: Multi-Site Retail Chain

**Premium Properties** (Partner) manages 50 retail locations across 3 states.

**Team Structure**:
- Regional Managers (3): Submit work orders for their regions
- Facilities Coordinator (1): Tracks all maintenance requests
- Site Managers (50): Report issues and verify completion

**Workflow Example**:
1. Site Manager reports "Store #23 - Broken freezer unit"
2. Regional Manager creates work order in system
3. WorkOrderPortal assigns to "Cool Air HVAC" organization
4. Any Cool Air technician can accept and complete work
5. Facilities Coordinator monitors progress across all stores

**Benefits**:
- Centralized tracking across 50 locations
- Any team member can handle urgent requests
- Regional visibility with central coordination

### Scenario 2: Large Subcontractor Organization

**ABC Plumbing** (Subcontractor) has 15 employees including plumbers, apprentices, and supervisors.

**Team Structure**:
- Master Plumbers (4): Handle complex installations
- Journey Plumbers (6): Standard repairs and maintenance
- Apprentices (3): Assist and learn
- Supervisors (2): Review work and manage assignments

**Workflow Example**:
1. Work order assigned to ABC Plumbing organization
2. Supervisor reviews requirements and complexity
3. Assigns Master Plumber for complex job
4. Apprentice assists and documents work
5. Supervisor reviews report before submission

**Benefits**:
- Flexible team allocation based on skills needed
- Mentorship opportunities with apprentices
- Quality control through supervisor review
- No work disruption if specific employee unavailable

### Scenario 3: Emergency Response

**Critical HVAC Failure** at Premium Properties Store #45 during summer heat wave.

**Traditional Response**:
- Work order assigned to specific HVAC technician "John Smith"
- John is on vacation - work cannot proceed
- Must wait for John's return or manually reassign

**Company Access Response**:
- Work order assigned to "Cool Air HVAC" organization
- Any available Cool Air technician can respond immediately
- Emergency team deployed within hours
- Work proceeds without administrative delays

**Result**: 
- 24-hour resolution vs. potential 1-week delay
- Maintained business operations during critical period
- Demonstrated system reliability under pressure

## Implementation Benefits

### For Partners (Property Management)
- **Simplified Vendor Management**: Deal with organizations, not individuals
- **Reliable Service**: Multiple contact points prevent single-person dependencies
- **Consistent Quality**: Organization-level accountability and processes
- **Scalable Growth**: Easy to add new properties without vendor setup complexity

### For Subcontractors (Trade Companies)
- **Business Growth**: Accept more work without individual capacity constraints
- **Team Development**: Train employees on live projects with backup support
- **Work Flexibility**: Distribute work based on availability and skills
- **Professional Image**: Present as organized company rather than individual service

### For General Contractors (Internal)
- **Operational Efficiency**: Manage organizations instead of individual relationships
- **Risk Mitigation**: Multiple contact points reduce project risk
- **Quality Assurance**: Organization-level standards and oversight
- **Growth Support**: Scale operations with reliable partner networks

## Migration from Individual to Company Access

### Backward Compatibility

The system supports both individual and company-level access simultaneously:

- **Legacy Work Orders**: Individual assignments continue to work
- **New Work Orders**: Can use organization-level assignments
- **Gradual Migration**: Move to company access at your own pace
- **No Data Loss**: All existing work orders and relationships preserved

### Migration Strategies

**Strategy 1: Immediate Organization Switch**
- Convert all future assignments to organization-level
- Benefits: Immediate team access improvements
- Considerations: Requires user training and process updates

**Strategy 2: Gradual Transition**
- Start with new subcontractor partners
- Migrate existing partners during contract renewals
- Benefits: Smooth transition with learning opportunities
- Considerations: Longer timeline to full benefits

**Strategy 3: Pilot Program**
- Test with select high-volume partners/subcontractors
- Refine processes based on pilot feedback
- Roll out system-wide after validation
- Benefits: Risk mitigation and process optimization

## Troubleshooting Company Access

### Common Questions

**Q: Can individual assignments still be used?**
A: Yes, the system supports both individual and organization-level assignments. Legacy work orders continue to function normally.

**Q: What happens if only one person in an organization needs access?**
A: Single-person organizations work perfectly. The company access model scales from 1 to unlimited users.

**Q: How do we prevent unauthorized team members from seeing sensitive work?**
A: Use organization assignments for general work, individual assignments for sensitive projects requiring specific clearance levels.

**Q: Can we restrict which team members can submit reports?**
A: Currently, any organization member can submit reports. Consider implementing internal approval processes before final submission.

### Access Issues

**Problem**: Team member cannot see organization work orders
**Solution**: Verify user is properly assigned to organization in user_organizations table

**Problem**: User sees work from wrong organization  
**Solution**: Check user organization assignments - users should only belong to their own organization

**Problem**: Financial data visible to wrong users
**Solution**: Review RLS policies - financial data should only be visible to same organization + admins

## Next Steps

1. **Review Current Setup**: Audit existing user-organization relationships
2. **Plan Migration**: Choose appropriate migration strategy for your organization
3. **Train Users**: Educate teams on company access benefits and workflows  
4. **Monitor Performance**: Track adoption and identify additional training needs
5. **Optimize Processes**: Refine workflows based on real-world usage patterns

For technical implementation details, see:
- [RLS Policies Documentation](./RLS_POLICIES.md)
- [Database Schema Guide](./DATABASE_SCHEMA.md)  
- [Database Functions Reference](./DATABASE_FUNCTIONS.md)
