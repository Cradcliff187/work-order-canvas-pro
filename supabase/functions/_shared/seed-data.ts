/**
 * Centralized seed data definitions for database seeding
 * 
 * This module contains all the test data used for seeding the database.
 * It provides realistic, comprehensive data scenarios for testing all
 * aspects of the WorkOrderPro application.
 * 
 * Data Categories:
 * - Organizations (Partners, Subcontractors, Internal)
 * - Users (Admins, Partners, Subcontractors, Employees)
 * - Trades and Skills
 * - Email Templates
 * - Work Order Templates
 */

import type { Organization, Profile, Trade, EmailTemplate } from './types.ts';

/**
 * Test organizations representing different business types
 * 
 * Includes:
 * - Partner organizations (property managers, facility groups)
 * - Subcontractor organizations (specialized trades)
 * - Internal organization (main company)
 */
export const organizations: Organization[] = [
  // Partner Organizations
  {
    name: 'ABC Property Management',
    contact_email: 'operations@abcproperties.com',
    contact_phone: '(555) 123-4567',
    organization_type: 'partner',
    initials: 'ABC',
    address: '123 Business Park Dr, Suite 100, Dallas, TX 75201',
  },
  {
    name: 'XYZ Commercial Properties',
    contact_email: 'facilities@xyzcommercial.com', 
    contact_phone: '(555) 234-5678',
    organization_type: 'partner',
    initials: 'XYZ',
    address: '456 Corporate Blvd, Houston, TX 77002',
  },
  {
    name: 'Premium Facilities Group',
    contact_email: 'maintenance@premiumfacilities.com',
    contact_phone: '(555) 345-6789',
    organization_type: 'partner',
    initials: 'PFG',
    address: '789 Executive Way, Austin, TX 78701',
  },

  // Subcontractor Organizations
  {
    name: 'Pipes & More Plumbing',
    contact_email: 'dispatch@pipesandmore.com',
    contact_phone: '(555) 456-7890',
    organization_type: 'subcontractor',
    initials: 'PAM',
    address: '321 Trade Center Dr, Fort Worth, TX 76102',
  },
  {
    name: 'Sparks Electric',
    contact_email: 'jobs@sparkselectric.com',
    contact_phone: '(555) 567-8901',
    organization_type: 'subcontractor', 
    initials: 'SE',
    address: '654 Industrial Pkwy, San Antonio, TX 78201',
  },
  {
    name: 'Cool Air HVAC',
    contact_email: 'service@coolairhvac.com',
    contact_phone: '(555) 678-9012',
    organization_type: 'subcontractor',
    initials: 'CA',
    address: '987 Service Road, El Paso, TX 79901',
  },

  // Internal Organization
  {
    name: 'WorkOrderPro Inc',
    contact_email: 'admin@workorderpro.com',
    contact_phone: '(555) 789-0123',
    organization_type: 'internal',
    initials: 'WOP',
    address: '100 Innovation Dr, Suite 500, Austin, TX 78759',
  },
];

/**
 * Test user profiles covering all user types and scenarios
 * 
 * Includes realistic names, emails, and role assignments
 * Password for all test users: "Test123!"
 */
export const users: Omit<Profile, 'id' | 'user_id'>[] = [
  // Admin Users
  {
    email: 'admin@workorderpro.com',
    first_name: 'Sarah',
    last_name: 'Johnson',
    user_type: 'admin',
    company_name: 'WorkOrderPro Inc',
    phone: '(555) 100-0001',
  },
  {
    email: 'manager@workorderpro.com', 
    first_name: 'Michael',
    last_name: 'Chen',
    user_type: 'admin',
    company_name: 'WorkOrderPro Inc',
    phone: '(555) 100-0002',
  },

  // Partner Users
  {
    email: 'facilities@abcproperties.com',
    first_name: 'Jennifer',
    last_name: 'Williams',
    user_type: 'partner',
    company_name: 'ABC Property Management',
    phone: '(555) 200-0001',
  },
  {
    email: 'maintenance@xyzcommercial.com',
    first_name: 'David',
    last_name: 'Brown',
    user_type: 'partner', 
    company_name: 'XYZ Commercial Properties',
    phone: '(555) 200-0002',
  },
  {
    email: 'operations@premiumfacilities.com',
    first_name: 'Lisa',
    last_name: 'Davis',
    user_type: 'partner',
    company_name: 'Premium Facilities Group', 
    phone: '(555) 200-0003',
  },

  // Subcontractor Users
  {
    email: 'mike@pipesandmore.com',
    first_name: 'Mike',
    last_name: 'Rodriguez',
    user_type: 'subcontractor',
    company_name: 'Pipes & More Plumbing',
    phone: '(555) 300-0001',
  },
  {
    email: 'sarah@sparkselectric.com',
    first_name: 'Sarah',
    last_name: 'Thompson',
    user_type: 'subcontractor',
    company_name: 'Sparks Electric',
    phone: '(555) 300-0002',
  },
  {
    email: 'tech@coolairhvac.com',
    first_name: 'Carlos',
    last_name: 'Martinez',
    user_type: 'subcontractor',
    company_name: 'Cool Air HVAC',
    phone: '(555) 300-0003',
  },

  // Employee Users (Internal staff with hourly rates)
  {
    email: 'john.smith@workorderpro.com',
    first_name: 'John',
    last_name: 'Smith',
    user_type: 'employee',
    company_name: 'WorkOrderPro Inc',
    phone: '(555) 400-0001',
    is_employee: true,
    hourly_cost_rate: 25.00,
    hourly_billable_rate: 65.00,
  },
  {
    email: 'jane.doe@workorderpro.com',
    first_name: 'Jane',
    last_name: 'Doe', 
    user_type: 'employee',
    company_name: 'WorkOrderPro Inc',
    phone: '(555) 400-0002',
    is_employee: true,
    hourly_cost_rate: 30.00,
    hourly_billable_rate: 75.00,
  },
];

/**
 * Trade categories for work order classification
 */
export const trades: Trade[] = [
  {
    name: 'Plumbing',
    description: 'Water systems, pipes, fixtures, and drainage',
  },
  {
    name: 'Electrical',
    description: 'Wiring, outlets, lighting, and electrical systems',
  },
  {
    name: 'HVAC',
    description: 'Heating, ventilation, and air conditioning systems',
  },
  {
    name: 'Carpentry',
    description: 'Wood work, trim, doors, and structural repairs',
  },
  {
    name: 'Painting',
    description: 'Interior and exterior painting and finishing',
  },
  {
    name: 'General Maintenance',
    description: 'Basic repairs and maintenance tasks',
  },
  {
    name: 'Landscaping',
    description: 'Grounds maintenance and outdoor improvements',
  },
];

/**
 * Email templates for automated notifications
 */
export const emailTemplates: EmailTemplate[] = [
  {
    template_name: 'work_order_created',
    subject: 'New Work Order Created - {{work_order_number}}',
    html_content: `
      <h2>New Work Order Created</h2>
      <p>A new work order has been created and requires attention.</p>
      <ul>
        <li><strong>Work Order:</strong> {{work_order_number}}</li>
        <li><strong>Title:</strong> {{title}}</li>
        <li><strong>Location:</strong> {{location}}</li>
        <li><strong>Trade:</strong> {{trade}}</li>
        <li><strong>Created By:</strong> {{created_by}}</li>
      </ul>
      <p>Please review and assign this work order as appropriate.</p>
    `,
    text_content: 'New work order {{work_order_number}} has been created for {{location}}.',
  },
  {
    template_name: 'work_order_assigned',
    subject: 'Work Order Assigned - {{work_order_number}}',
    html_content: `
      <h2>Work Order Assigned</h2>
      <p>You have been assigned a new work order.</p>
      <ul>
        <li><strong>Work Order:</strong> {{work_order_number}}</li>
        <li><strong>Title:</strong> {{title}}</li>
        <li><strong>Location:</strong> {{location}}</li>
        <li><strong>Description:</strong> {{description}}</li>
      </ul>
      <p>Please review the details and begin work as scheduled.</p>
    `,
    text_content: 'Work order {{work_order_number}} has been assigned to you.',
  },
  {
    template_name: 'report_submitted',
    subject: 'Work Report Submitted - {{work_order_number}}',
    html_content: `
      <h2>Work Report Submitted</h2>
      <p>A work report has been submitted for review.</p>
      <ul>
        <li><strong>Work Order:</strong> {{work_order_number}}</li>
        <li><strong>Submitted By:</strong> {{submitted_by}}</li>
        <li><strong>Work Performed:</strong> {{work_performed}}</li>
        <li><strong>Invoice Amount:</strong> ${{invoice_amount}}</li>
      </ul>
      <p>Please review and approve or request changes.</p>
    `,
    text_content: 'Work report submitted for work order {{work_order_number}}.',
  },
  {
    template_name: 'work_order_completed',
    subject: 'Work Order Completed - {{work_order_number}}',
    html_content: `
      <h2>Work Order Completed</h2>
      <p>Work order has been completed successfully.</p>
      <ul>
        <li><strong>Work Order:</strong> {{work_order_number}}</li>
        <li><strong>Location:</strong> {{location}}</li>
        <li><strong>Completed By:</strong> {{completed_by}}</li>
        <li><strong>Completion Date:</strong> {{completion_date}}</li>
      </ul>
      <p>Thank you for your business!</p>
    `,
    text_content: 'Work order {{work_order_number}} has been completed.',
  },
];

/**
 * Default password for all test users
 */
export const DEFAULT_TEST_PASSWORD = 'Test123!';

/**
 * Helper function to get organization by name
 */
export function getOrganizationByName(name: string): Organization | undefined {
  return organizations.find(org => org.name === name);
}

/**
 * Helper function to get users by organization
 */
export function getUsersByCompany(companyName: string): typeof users {
  return users.filter(user => user.company_name === companyName);
}

/**
 * Helper function to get trade by name
 */
export function getTradeByName(name: string): Trade | undefined {
  return trades.find(trade => trade.name === name);
}