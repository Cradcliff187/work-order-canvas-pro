/**
 * Comprehensive Seed Data Module for WorkOrderPortal
 * 
 * This module contains all test data used to populate the database with realistic scenarios
 * for development, testing, and demonstration purposes. The data is organized by user journey
 * and business workflow to ensure comprehensive test coverage.
 * 
 * @fileoverview Edge Function seed data - extracted from browser-based seeding
 * @author WorkOrderPortal Team
 * @since 2024-07-13
 */

import { Organization, Profile, Trade, WorkOrder, PartnerLocation, EmailTemplate } from './types.ts';

// ============================================================================
// CONSTANTS & UTILITIES
// ============================================================================

/**
 * Default password for all test users - simple for testing purposes
 * @constant
 */
export const DEFAULT_TEST_PASSWORD = 'Test123!';

/**
 * Helper function to generate random dates for realistic test scenarios
 * @param startDays - Number of days ago for start range
 * @param endDays - Number of days ago for end range
 * @returns ISO date string
 */
export const getRandomDate = (startDays: number, endDays: number): string => {
  const start = new Date();
  start.setDate(start.getDate() - Math.abs(startDays));
  const end = new Date();
  end.setDate(end.getDate() - Math.abs(endDays));
  const randomTime = start.getTime() + Math.random() * (end.getTime() - start.getTime());
  return new Date(randomTime).toISOString();
};

/**
 * Helper function to select random element from array
 * @param array - Array to select from
 * @returns Random element
 */
export const getRandomElement = <T>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};

// ============================================================================
// ORGANIZATIONS - Multi-tenant test structure
// ============================================================================

/**
 * Test Organizations (8 total)
 * 
 * Represents the complete organizational structure for testing multi-tenant
 * scenarios, work order assignments, and financial workflows.
 * 
 * Structure:
 * - 1 Internal organization (general contractor)
 * - 3 Partner organizations (property management companies)
 * - 4 Subcontractor organizations (trade specialists)
 * 
 * Each organization has realistic contact information and initials for
 * the smart work order numbering system.
 */
export const organizations: Omit<Organization, 'id' | 'created_at' | 'updated_at' | 'next_sequence_number'>[] = [
  {
    /**
     * Internal Organization - WorkOrderPortal Internal
     * 
     * Purpose: Houses admin users and employees who manage the platform
     * Test Scenarios: Admin oversight, employee assignments, internal reporting
     */
    name: 'WorkOrderPortal Internal',
    contact_email: 'admin@workorderportal.com',
    contact_phone: '(555) 000-0000',
    address: '100 Main Street, Suite 200, Business City, BC 12345',
    organization_type: 'internal',
    initials: 'WOP',
    is_active: true
  },
  
  // ========== PARTNER ORGANIZATIONS ==========
  {
    /**
     * ABC Property Management
     * 
     * Purpose: Large property management company with multiple locations
     * Test Scenarios: Multi-location work orders, bulk submissions, location-specific numbering
     * User Journey: partner1@abc.com submits work orders for 4 different locations
     */
    name: 'ABC Property Management',
    contact_email: 'contact@abc.com',
    contact_phone: '(555) 123-4567',
    address: '123 Business Ave, New York, NY 10001',
    organization_type: 'partner',
    initials: 'ABC',
    is_active: true
  },
  {
    /**
     * XYZ Commercial Properties
     * 
     * Purpose: Mid-size commercial property manager
     * Test Scenarios: Commercial properties, tenant work orders, maintenance requests
     * User Journey: partner2@xyz.com handles commercial building maintenance
     */
    name: 'XYZ Commercial Properties',
    contact_email: 'contact@xyz.com',
    contact_phone: '(555) 234-5678',
    address: '456 Corporate Blvd, Los Angeles, CA 90210',
    organization_type: 'partner',
    initials: 'XYZ',
    is_active: true
  },
  {
    /**
     * Premium Facilities Group
     * 
     * Purpose: High-end facilities management
     * Test Scenarios: Premium services, expedited work orders, quality focus
     * User Journey: partner3@premium.com manages upscale properties with high standards
     */
    name: 'Premium Facilities Group',
    contact_email: 'contact@premium.com',
    contact_phone: '(555) 345-6789',
    address: '789 Enterprise Dr, Chicago, IL 60601',
    organization_type: 'partner',
    initials: 'PFG',
    is_active: true
  },
  
  // ========== SUBCONTRACTOR ORGANIZATIONS ==========
  {
    /**
     * Pipes & More Plumbing
     * 
     * Purpose: Specialized plumbing contractor with multiple plumbers
     * Test Scenarios: Plumbing work orders, emergency calls, multi-technician assignments
     * User Journey: plumber1@trade.com and plumber2@trade.com handle plumbing work
     * Specialties: Residential/commercial plumbing, leak repairs, installations
     */
    name: 'Pipes & More Plumbing',
    contact_email: 'contact@pipesmore.com',
    contact_phone: '(555) 987-6543',
    address: '456 Trade Ave, Plumber City, PC 67890',
    organization_type: 'subcontractor',
    initials: 'PMP',
    is_active: true
  },
  {
    /**
     * Sparks Electric
     * 
     * Purpose: Licensed electrical contractor
     * Test Scenarios: Electrical work orders, code compliance, safety protocols
     * User Journey: electrician@trade.com handles all electrical assignments
     * Specialties: Electrical repairs, panel upgrades, lighting installations
     */
    name: 'Sparks Electric',
    contact_email: 'contact@sparkselectric.com',
    contact_phone: '(555) 876-5432',
    address: '789 Electric Blvd, Sparks Town, ST 54321',
    organization_type: 'subcontractor',
    initials: 'SPE',
    is_active: true
  },
  {
    /**
     * Cool Air HVAC
     * 
     * Purpose: HVAC specialist with multiple technicians
     * Test Scenarios: HVAC work orders, seasonal maintenance, equipment replacements
     * User Journey: hvac1@trade.com and hvac2@trade.com handle HVAC work
     * Specialties: Air conditioning, heating, ventilation systems
     */
    name: 'Cool Air HVAC',
    contact_email: 'contact@coolairhvac.com',
    contact_phone: '(555) 765-4321',
    address: '321 HVAC Street, Cool City, CC 43210',
    organization_type: 'subcontractor',
    initials: 'CAH',
    is_active: true
  },
  {
    /**
     * Fix-It Maintenance
     * 
     * Purpose: General maintenance contractor
     * Test Scenarios: General maintenance, handyman services, multi-trade work
     * User Journey: maintenance@trade.com handles general maintenance requests
     * Specialties: General repairs, preventive maintenance, multi-trade services
     */
    name: 'Fix-It Maintenance',
    contact_email: 'contact@fixit.com',
    contact_phone: '(555) 432-1098',
    address: '147 Repair Road, Fix City, FC 10987',
    organization_type: 'subcontractor',
    initials: 'FIM',
    is_active: true
  }
];

// ============================================================================
// USER PROFILES - Complete user journey testing
// ============================================================================

/**
 * Test User Profiles (14 total)
 * 
 * Comprehensive user structure covering all user types and workflow scenarios.
 * Each user represents specific test scenarios and business workflows.
 * 
 * Structure:
 * - 2 Admin users (platform management)
 * - 3 Employee users (internal workforce with different rates)
 * - 3 Partner users (one per partner organization)
 * - 6 Subcontractor users (distributed across trade companies)
 * 
 * All users use the same password for testing: 'Test123!'
 */
export const users: Omit<Profile, 'id' | 'user_id' | 'created_at' | 'updated_at'>[] = [
  
  // ========== ADMIN USERS ==========
  {
    /**
     * Primary Admin User
     * 
     * Purpose: System administration, user management, work order oversight
     * Test Scenarios: Admin dashboard, system configuration, user creation
     * Login: admin@workorderportal.com / Test123!
     */
    email: 'admin@workorderportal.com',
    first_name: 'Admin',
    last_name: 'User',
    user_type: 'admin',
    company_name: 'WorkOrderPortal Internal',
    is_employee: true,
    is_active: true
  },
  {
    /**
     * Employee Admin User
     * 
     * Purpose: Employee management, time tracking oversight, payroll administration
     * Test Scenarios: Employee reports, time tracking, internal operations
     * Login: employee@workorderportal.com / Test123!
     */
    email: 'employee@workorderportal.com',
    first_name: 'Emily',
    last_name: 'Employee',
    user_type: 'employee',
    company_name: 'WorkOrderPortal Internal',
    is_employee: true,
    is_active: true
  },
  
  // ========== INTERNAL EMPLOYEES ==========
  {
    /**
     * Senior Employee - Highest Rate Tier
     * 
     * Purpose: Lead technician, complex assignments, mentoring
     * Test Scenarios: High-value work orders, lead assignments, overtime tracking
     * Rates: $75/hr cost, $150/hr billable (2x markup)
     * Login: senior@workorderportal.com / Test123!
     */
    email: 'senior@workorderportal.com',
    first_name: 'David',
    last_name: 'Senior',
    user_type: 'employee',
    company_name: 'WorkOrderPortal Internal',
    is_employee: true,
    hourly_cost_rate: 75,
    hourly_billable_rate: 150,
    phone: '(555) 100-0001',
    is_active: true
  },
  {
    /**
     * Mid-Level Employee - Standard Rate Tier
     * 
     * Purpose: Regular technician, standard assignments, skill development
     * Test Scenarios: Standard work orders, skill-based assignments, training scenarios
     * Rates: $50/hr cost, $100/hr billable (2x markup)
     * Login: midlevel@workorderportal.com / Test123!
     */
    email: 'midlevel@workorderportal.com',
    first_name: 'Jennifer',
    last_name: 'Mid',
    user_type: 'employee',
    company_name: 'WorkOrderPortal Internal',
    is_employee: true,
    hourly_cost_rate: 50,
    hourly_billable_rate: 100,
    phone: '(555) 100-0002',
    is_active: true
  },
  {
    /**
     * Junior Employee - Entry Level Rate Tier
     * 
     * Purpose: Apprentice, support role, learning assignments
     * Test Scenarios: Support assignments, training work orders, skill progression
     * Rates: $35/hr cost, $70/hr billable (2x markup)
     * Login: junior@workorderportal.com / Test123!
     */
    email: 'junior@workorderportal.com',
    first_name: 'Alex',
    last_name: 'Junior',
    user_type: 'employee',
    company_name: 'WorkOrderPortal Internal',
    is_employee: true,
    hourly_cost_rate: 35,
    hourly_billable_rate: 70,
    phone: '(555) 100-0003',
    is_active: true
  },
  
  // ========== PARTNER USERS ==========
  {
    /**
     * ABC Property Management Partner
     * 
     * Purpose: Multi-location property management, bulk work order submission
     * Test Scenarios: Multiple locations (4), location-specific numbering, batch submissions
     * Properties: Downtown Office, Uptown Retail, Westside Apartments, Southend Mall
     * Login: partner1@abc.com / Test123!
     */
    email: 'partner1@abc.com',
    first_name: 'John',
    last_name: 'Smith',
    user_type: 'partner',
    company_name: 'ABC Property Management',
    phone: '(555) 200-0001',
    is_employee: false,
    is_active: true
  },
  {
    /**
     * XYZ Commercial Properties Partner
     * 
     * Purpose: Commercial property maintenance, tenant-focused services
     * Test Scenarios: Commercial work orders, tenant requests, business hours constraints
     * Properties: Tech Center, Business Park, Corporate Plaza
     * Login: partner2@xyz.com / Test123!
     */
    email: 'partner2@xyz.com',
    first_name: 'Sarah',
    last_name: 'Johnson',
    user_type: 'partner',
    company_name: 'XYZ Commercial Properties',
    phone: '(555) 200-0002',
    is_employee: false,
    is_active: true
  },
  {
    /**
     * Premium Facilities Group Partner
     * 
     * Purpose: High-end facilities, premium service requirements
     * Test Scenarios: Expedited service, quality standards, premium pricing
     * Properties: Executive Tower, Luxury Condos, Premium Office Complex
     * Login: partner3@premium.com / Test123!
     */
    email: 'partner3@premium.com',
    first_name: 'Mike',
    last_name: 'Wilson',
    user_type: 'partner',
    company_name: 'Premium Facilities Group',
    phone: '(555) 200-0003',
    is_employee: false,
    is_active: true
  },
  
  // ========== SUBCONTRACTOR USERS ==========
  {
    /**
     * Senior Plumber - Pipes & More Plumbing
     * 
     * Purpose: Lead plumber, complex plumbing work, emergency response
     * Test Scenarios: Plumbing work orders, leak repairs, pipe installations
     * Specialties: Commercial plumbing, emergency repairs, code compliance
     * Login: plumber1@trade.com / Test123!
     */
    email: 'plumber1@trade.com',
    first_name: 'Bob',
    last_name: 'Pipes',
    user_type: 'subcontractor',
    company_name: 'Pipes & More Plumbing',
    phone: '(555) 300-0001',
    is_employee: false,
    is_active: true
  },
  {
    /**
     * Junior Plumber - Pipes & More Plumbing
     * 
     * Purpose: Support plumber, routine maintenance, learning complex work
     * Test Scenarios: Support assignments, routine plumbing, apprentice scenarios
     * Specialties: Basic plumbing, maintenance, support work
     * Login: plumber2@trade.com / Test123!
     */
    email: 'plumber2@trade.com',
    first_name: 'Joe',
    last_name: 'Wrench',
    user_type: 'subcontractor',
    company_name: 'Pipes & More Plumbing',
    phone: '(555) 300-0002',
    is_employee: false,
    is_active: true
  },
  {
    /**
     * Licensed Electrician - Sparks Electric
     * 
     * Purpose: All electrical work, code compliance, safety protocols
     * Test Scenarios: Electrical work orders, panel work, lighting systems
     * Specialties: Commercial electrical, panel upgrades, troubleshooting
     * Login: electrician@trade.com / Test123!
     */
    email: 'electrician@trade.com',
    first_name: 'Tom',
    last_name: 'Sparks',
    user_type: 'subcontractor',
    company_name: 'Sparks Electric',
    phone: '(555) 300-0003',
    is_employee: false,
    is_active: true
  },
  {
    /**
     * Senior HVAC Technician - Cool Air HVAC
     * 
     * Purpose: Lead HVAC technician, system installations, complex repairs
     * Test Scenarios: HVAC work orders, system troubleshooting, installations
     * Specialties: Commercial HVAC, system design, energy efficiency
     * Login: hvac1@trade.com / Test123!
     */
    email: 'hvac1@trade.com',
    first_name: 'Lisa',
    last_name: 'Cool',
    user_type: 'subcontractor',
    company_name: 'Cool Air HVAC',
    phone: '(555) 300-0004',
    is_employee: false,
    is_active: true
  },
  {
    /**
     * HVAC Support Technician - Cool Air HVAC
     * 
     * Purpose: Support technician, maintenance, routine service
     * Test Scenarios: Support assignments, preventive maintenance, routine service
     * Specialties: HVAC maintenance, filter changes, basic repairs
     * Login: hvac2@trade.com / Test123!
     */
    email: 'hvac2@trade.com',
    first_name: 'Carl',
    last_name: 'Freeze',
    user_type: 'subcontractor',
    company_name: 'Cool Air HVAC',
    phone: '(555) 300-0005',
    is_employee: false,
    is_active: true
  },
  {
    /**
     * General Maintenance Technician - Fix-It Maintenance
     * 
     * Purpose: Multi-trade maintenance, handyman services, general repairs
     * Test Scenarios: General maintenance work orders, multi-trade assignments, routine maintenance
     * Specialties: General repairs, preventive maintenance, multi-trade services
     * Login: maintenance@trade.com / Test123!
     */
    email: 'maintenance@trade.com',
    first_name: 'Jim',
    last_name: 'Fix',
    user_type: 'subcontractor',
    company_name: 'Fix-It Maintenance',
    phone: '(555) 300-0006',
    is_employee: false,
    is_active: true
  }
];

// ============================================================================
// PARTNER LOCATIONS - Multi-location test scenarios
// ============================================================================

/**
 * Partner Locations (10 total)
 * 
 * Realistic location data for testing multi-location scenarios, location-based
 * work order numbering, and partner location management.
 * 
 * Distribution:
 * - ABC Property Management: 4 locations (1 inactive for testing)
 * - XYZ Commercial Properties: 3 locations
 * - Premium Facilities Group: 3 locations
 */
export const partnerLocations = [
  
  // ========== ABC PROPERTY MANAGEMENT LOCATIONS ==========
  {
    /**
     * ABC Downtown Office - Active Location
     * 
     * Purpose: Primary business location, high-traffic work orders
     * Test Scenarios: Commercial work orders, business hours constraints, high-priority work
     */
    organization_name: 'ABC Property Management',
    location_number: '504',
    location_name: 'Downtown Office',
    street_address: '504 Main Street',
    city: 'New York',
    state: 'NY',
    zip_code: '10001',
    contact_name: 'John Smith',
    contact_email: 'downtown@abc.com',
    contact_phone: '(555) 123-4567',
    is_active: true
  },
  {
    /**
     * ABC Uptown Retail - Active Location
     * 
     * Purpose: Retail space, customer-facing environment, quick turnaround needs
     * Test Scenarios: Retail work orders, customer impact considerations, aesthetic concerns
     */
    organization_name: 'ABC Property Management',
    location_number: '502',
    location_name: 'Uptown Retail',
    street_address: '502 Broadway',
    city: 'New York',
    state: 'NY',
    zip_code: '10025',
    contact_name: 'Alice Manager',
    contact_email: 'uptown@abc.com',
    contact_phone: '(555) 123-4568',
    is_active: true
  },
  {
    /**
     * ABC Westside Apartments - Active Location
     * 
     * Purpose: Residential complex, tenant-related work orders
     * Test Scenarios: Residential work orders, tenant notifications, after-hours access
     */
    organization_name: 'ABC Property Management',
    location_number: '503',
    location_name: 'Westside Apartments',
    street_address: '503 West Side Ave',
    city: 'New York',
    state: 'NY',
    zip_code: '10024',
    contact_name: 'Bob Residential',
    contact_email: 'westside@abc.com',
    contact_phone: '(555) 123-4569',
    is_active: true
  },
  {
    /**
     * ABC Southend Mall - Inactive Location
     * 
     * Purpose: Testing inactive location scenarios, historical data
     * Test Scenarios: Inactive location handling, data archival, location deactivation
     */
    organization_name: 'ABC Property Management',
    location_number: '501',
    location_name: 'Southend Mall',
    street_address: '501 South End Blvd',
    city: 'New York',
    state: 'NY',
    zip_code: '10002',
    contact_name: 'Carol Inactive',
    contact_email: 'southend@abc.com',
    contact_phone: '(555) 123-4570',
    is_active: false  // Inactive for testing
  },
  
  // ========== XYZ COMMERCIAL PROPERTIES LOCATIONS ==========
  {
    /**
     * XYZ Tech Center - Active Location
     * 
     * Purpose: Technology-focused commercial space, specialized equipment
     * Test Scenarios: Commercial work orders, technology infrastructure, specialized requirements
     */
    organization_name: 'XYZ Commercial Properties',
    location_number: 'TC-101',
    location_name: 'Tech Center',
    street_address: '101 Innovation Drive',
    city: 'Los Angeles',
    state: 'CA',
    zip_code: '90210',
    contact_name: 'Sarah Johnson',
    contact_email: 'techcenter@xyz.com',
    contact_phone: '(555) 234-5678',
    is_active: true
  },
  {
    /**
     * XYZ Business Park - Active Location
     * 
     * Purpose: Multi-tenant business park, shared facilities
     * Test Scenarios: Multi-tenant considerations, shared space work orders, coordination requirements
     */
    organization_name: 'XYZ Commercial Properties',
    location_number: 'BP-201',
    location_name: 'Business Park',
    street_address: '201 Business Park Way',
    city: 'Los Angeles',
    state: 'CA',
    zip_code: '90211',
    contact_name: 'Dave Business',
    contact_email: 'businesspark@xyz.com',
    contact_phone: '(555) 234-5679',
    is_active: true
  },
  {
    /**
     * XYZ Corporate Plaza - Active Location
     * 
     * Purpose: Executive office space, high-end finishes, premium service expectations
     * Test Scenarios: Executive environment, minimal disruption requirements, premium service
     */
    organization_name: 'XYZ Commercial Properties',
    location_number: 'CP-301',
    location_name: 'Corporate Plaza',
    street_address: '301 Corporate Avenue',
    city: 'Los Angeles',
    state: 'CA',
    zip_code: '90212',
    contact_name: 'Eve Corporate',
    contact_email: 'corporateplaza@xyz.com',
    contact_phone: '(555) 234-5680',
    is_active: true
  },
  
  // ========== PREMIUM FACILITIES GROUP LOCATIONS ==========
  {
    /**
     * Premium Executive Tower - Active Location
     * 
     * Purpose: High-end executive office building, premium service standards
     * Test Scenarios: Premium service requirements, executive environment, quality standards
     */
    organization_name: 'Premium Facilities Group',
    location_number: 'ET-001',
    location_name: 'Executive Tower',
    street_address: '1 Executive Plaza',
    city: 'Chicago',
    state: 'IL',
    zip_code: '60601',
    contact_name: 'Mike Wilson',
    contact_email: 'executive@premium.com',
    contact_phone: '(555) 345-6789',
    is_active: true
  },
  {
    /**
     * Premium Luxury Condos - Active Location
     * 
     * Purpose: Luxury residential property, high-end finishes, resident satisfaction focus
     * Test Scenarios: Luxury residential work orders, resident communication, quality standards
     */
    organization_name: 'Premium Facilities Group',
    location_number: 'LC-002',
    location_name: 'Luxury Condos',
    street_address: '2 Luxury Lane',
    city: 'Chicago',
    state: 'IL',
    zip_code: '60602',
    contact_name: 'Grace Luxury',
    contact_email: 'luxury@premium.com',
    contact_phone: '(555) 345-6790',
    is_active: true
  },
  {
    /**
     * Premium Office Complex - Active Location
     * 
     * Purpose: Premium office space, corporate tenants, professional environment
     * Test Scenarios: Corporate environment work orders, professional standards, tenant coordination
     */
    organization_name: 'Premium Facilities Group',
    location_number: 'OC-003',
    location_name: 'Premium Office Complex',
    street_address: '3 Premium Circle',
    city: 'Chicago',
    state: 'IL',
    zip_code: '60603',
    contact_name: 'Henry Premium',
    contact_email: 'office@premium.com',
    contact_phone: '(555) 345-6791',
    is_active: true
  }
];

// ============================================================================
// TRADES - Comprehensive skill categories
// ============================================================================

/**
 * Trade Categories (10 total)
 * 
 * Comprehensive list of trade skills and categories for work order classification
 * and assignment. Each trade represents a specific skill set and service category.
 */
export const trades: Omit<Trade, 'id' | 'created_at'>[] = [
  {
    /**
     * Plumbing Trade
     * 
     * Purpose: All plumbing-related work orders
     * Test Scenarios: Leak repairs, pipe installations, drain cleaning, water heater service
     * Assigned To: Pipes & More Plumbing (plumber1@trade.com, plumber2@trade.com)
     */
    name: 'Plumbing',
    description: 'Plumbing repairs and maintenance including leak repairs, pipe installations, drain cleaning, and water heater service',
    is_active: true
  },
  {
    /**
     * Electrical Trade
     * 
     * Purpose: All electrical work orders requiring licensed electrician
     * Test Scenarios: Outlet repairs, panel upgrades, lighting installations, code compliance
     * Assigned To: Sparks Electric (electrician@trade.com)
     */
    name: 'Electrical',
    description: 'Electrical work and repairs including outlet repairs, panel upgrades, lighting systems, and code compliance',
    is_active: true
  },
  {
    /**
     * HVAC Trade
     * 
     * Purpose: Heating, ventilation, and air conditioning systems
     * Test Scenarios: AC repairs, heating service, filter changes, system installations
     * Assigned To: Cool Air HVAC (hvac1@trade.com, hvac2@trade.com)
     */
    name: 'HVAC',
    description: 'Heating, ventilation, and air conditioning systems including repairs, maintenance, and installations',
    is_active: true
  },
  {
    /**
     * Carpentry Trade
     * 
     * Purpose: Wood work and construction projects
     * Test Scenarios: Door repairs, cabinet work, trim installation, structural repairs
     * Assigned To: Internal employees or general contractors
     */
    name: 'Carpentry',
    description: 'Wood work and construction including door repairs, cabinet installation, trim work, and structural carpentry',
    is_active: true
  },
  {
    /**
     * Painting Trade
     * 
     * Purpose: Interior and exterior painting services
     * Test Scenarios: Wall painting, touch-ups, prep work, commercial painting
     * Assigned To: Internal employees or specialized painters
     */
    name: 'Painting',
    description: 'Interior and exterior painting services including wall painting, touch-ups, surface preparation, and protective coatings',
    is_active: true
  },
  {
    /**
     * General Maintenance Trade
     * 
     * Purpose: Multi-trade maintenance and handyman services
     * Test Scenarios: Routine maintenance, small repairs, preventive maintenance
     * Assigned To: Fix-It Maintenance (maintenance@trade.com) or internal employees
     */
    name: 'General Maintenance',
    description: 'General repairs and maintenance including routine upkeep, small repairs, and preventive maintenance services',
    is_active: true
  },
  {
    /**
     * Landscaping Trade
     * 
     * Purpose: Grounds and outdoor maintenance
     * Test Scenarios: Lawn care, tree trimming, irrigation, outdoor lighting
     * Assigned To: External landscaping contractors or internal maintenance
     */
    name: 'Landscaping',
    description: 'Grounds and landscaping work including lawn care, tree maintenance, irrigation systems, and outdoor improvements',
    is_active: true
  },
  {
    /**
     * Roofing Trade
     * 
     * Purpose: Roof repairs and maintenance
     * Test Scenarios: Leak repairs, gutter cleaning, roof inspections, emergency repairs
     * Assigned To: Specialized roofing contractors
     */
    name: 'Roofing',
    description: 'Roof repairs and maintenance including leak repairs, gutter service, inspections, and emergency roofing work',
    is_active: true
  },
  {
    /**
     * Flooring Trade
     * 
     * Purpose: Floor installation and repair services
     * Test Scenarios: Carpet repairs, tile replacement, hardwood maintenance, floor cleaning
     * Assigned To: Specialized flooring contractors
     */
    name: 'Flooring',
    description: 'Floor installation and repair including carpet, tile, hardwood, and specialty flooring services',
    is_active: true
  },
  {
    /**
     * Appliance Repair Trade
     * 
     * Purpose: Kitchen and laundry appliance service
     * Test Scenarios: Refrigerator repairs, washer/dryer service, dishwasher maintenance
     * Assigned To: Specialized appliance repair services
     */
    name: 'Appliance Repair',
    description: 'Kitchen and laundry appliance repairs including refrigerators, washers, dryers, dishwashers, and small appliances',
    is_active: true
  }
];

// ============================================================================
// EMAIL TEMPLATES - Communication workflow
// ============================================================================

/**
 * Email Templates (5 total)
 * 
 * Complete email notification workflow templates for all system communications.
 * Each template supports variable substitution for personalized messages.
 */
export const emailTemplates: Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at'>[] = [
  {
    /**
     * Work Order Received Template
     * 
     * Purpose: Notify admins when new work order is submitted
     * Trigger: Partner submits new work order
     * Recipients: Admin users
     * Variables: {{work_order_number}}, {{partner_name}}, {{location}}
     */
    template_name: 'work_order_received',
    subject: 'New Work Order Received - {{work_order_number}}',
    html_content: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
          New Work Order Received
        </h1>
        <p style="font-size: 16px; line-height: 1.5;">
          A new work order has been submitted and requires your attention.
        </p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <strong>Work Order Number:</strong> {{work_order_number}}<br>
          <strong>Submitted By:</strong> {{partner_name}}<br>
          <strong>Location:</strong> {{location}}
        </div>
        <p>Please review and assign this work order in the admin dashboard.</p>
      </div>
    `,
    text_content: `
      New Work Order Received
      
      A new work order has been submitted: {{work_order_number}}
      Submitted by: {{partner_name}}
      Location: {{location}}
      
      Please review and assign this work order in the admin dashboard.
    `,
    is_active: true
  },
  {
    /**
     * Work Order Assigned Template
     * 
     * Purpose: Notify assignee when work order is assigned to them
     * Trigger: Admin assigns work order to subcontractor/employee
     * Recipients: Assigned worker
     * Variables: {{work_order_number}}, {{assignee_name}}, {{due_date}}
     */
    template_name: 'work_order_assigned',
    subject: 'Work Order Assigned - {{work_order_number}}',
    html_content: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #059669; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
          Work Order Assigned
        </h1>
        <p style="font-size: 16px; line-height: 1.5;">
          You have been assigned a new work order.
        </p>
        <div style="background-color: #ecfdf5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <strong>Work Order Number:</strong> {{work_order_number}}<br>
          <strong>Assigned To:</strong> {{assignee_name}}<br>
          <strong>Due Date:</strong> {{due_date}}
        </div>
        <p>Please review the work order details and begin work as scheduled.</p>
      </div>
    `,
    text_content: `
      Work Order Assigned
      
      You have been assigned work order: {{work_order_number}}
      Assigned to: {{assignee_name}}
      Due date: {{due_date}}
      
      Please review the work order details and begin work as scheduled.
    `,
    is_active: true
  },
  {
    /**
     * Report Submitted Template
     * 
     * Purpose: Notify admins when work report is submitted
     * Trigger: Subcontractor/employee submits completion report
     * Recipients: Admin users
     * Variables: {{work_order_number}}, {{submitter_name}}, {{invoice_amount}}
     */
    template_name: 'report_submitted',
    subject: 'Work Report Submitted - {{work_order_number}}',
    html_content: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #7c3aed; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
          Work Report Submitted
        </h1>
        <p style="font-size: 16px; line-height: 1.5;">
          A work report has been submitted for review.
        </p>
        <div style="background-color: #faf5ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <strong>Work Order Number:</strong> {{work_order_number}}<br>
          <strong>Submitted By:</strong> {{submitter_name}}<br>
          <strong>Invoice Amount:</strong> ${{invoice_amount}}
        </div>
        <p>Please review the work report and approve or request changes.</p>
      </div>
    `,
    text_content: `
      Work Report Submitted
      
      A work report has been submitted for: {{work_order_number}}
      Submitted by: {{submitter_name}}
      Invoice amount: ${{invoice_amount}}
      
      Please review the work report and approve or request changes.
    `,
    is_active: true
  },
  {
    /**
     * Report Reviewed Template
     * 
     * Purpose: Notify submitter when their report is reviewed
     * Trigger: Admin approves or rejects work report
     * Recipients: Report submitter
     * Variables: {{work_order_number}}, {{status}}, {{review_notes}}
     */
    template_name: 'report_reviewed',
    subject: 'Work Report {{status}} - {{work_order_number}}',
    html_content: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #dc2626; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
          Work Report {{status}}
        </h1>
        <p style="font-size: 16px; line-height: 1.5;">
          Your work report has been reviewed and {{status}}.
        </p>
        <div style="background-color: #fef2f2; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <strong>Work Order Number:</strong> {{work_order_number}}<br>
          <strong>Status:</strong> {{status}}<br>
          {{#if review_notes}}<strong>Review Notes:</strong> {{review_notes}}{{/if}}
        </div>
        <p>{{#if approved}}Thank you for completing this work order.{{else}}Please review the feedback and resubmit if necessary.{{/if}}</p>
      </div>
    `,
    text_content: `
      Work Report {{status}}
      
      Your work report has been {{status}} for: {{work_order_number}}
      Status: {{status}}
      {{#if review_notes}}Review notes: {{review_notes}}{{/if}}
      
      {{#if approved}}Thank you for completing this work order.{{else}}Please review the feedback and resubmit if necessary.{{/if}}
    `,
    is_active: true
  },
  {
    /**
     * Work Order Completed Template
     * 
     * Purpose: Notify partner when their work order is completed
     * Trigger: Work order status changes to completed
     * Recipients: Original partner who submitted the work order
     * Variables: {{work_order_number}}, {{partner_name}}, {{completion_date}}
     */
    template_name: 'work_order_completed',
    subject: 'Work Order Completed - {{work_order_number}}',
    html_content: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #059669; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
          Work Order Completed
        </h1>
        <p style="font-size: 16px; line-height: 1.5;">
          Your work order has been completed successfully.
        </p>
        <div style="background-color: #ecfdf5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <strong>Work Order Number:</strong> {{work_order_number}}<br>
          <strong>Completion Date:</strong> {{completion_date}}<br>
          <strong>Location:</strong> {{location}}
        </div>
        <p>Thank you for using our services. Please contact us if you have any questions or concerns.</p>
      </div>
    `,
    text_content: `
      Work Order Completed
      
      Your work order has been completed: {{work_order_number}}
      Completion date: {{completion_date}}
      Location: {{location}}
      
      Thank you for using our services. Please contact us if you have any questions or concerns.
    `,
    is_active: true
  }
];

// ============================================================================
// USER JOURNEY HELPERS
// ============================================================================

/**
 * Helper function to get organization by name
 * @param name - Organization name to find
 * @returns Organization object or undefined if not found
 */
export const getOrganizationByName = (name: string) => {
  return organizations.find(org => org.name === name);
};

/**
 * Helper function to get users by company name
 * @param companyName - Company name to filter by
 * @returns Array of users belonging to the company
 */
export const getUsersByCompany = (companyName: string) => {
  return users.filter(user => user.company_name === companyName);
};

/**
 * Helper function to get trade by name
 * @param name - Trade name to find
 * @returns Trade object or undefined if not found
 */
export const getTradeByName = (name: string) => {
  return trades.find(trade => trade.name === name);
};

/**
 * Helper function to get all test user credentials
 * @returns Array of login credentials for all test users
 */
export const getTestCredentials = () => {
  return users.map(user => ({
    email: user.email,
    password: DEFAULT_TEST_PASSWORD,
    type: user.user_type,
    name: `${user.first_name} ${user.last_name}`,
    company: user.company_name
  }));
};

/**
 * User Journey Test Scenarios
 * 
 * Organized test data by business workflow for comprehensive testing
 */
export const userJourneys = {
  /**
   * Partner Journey: Work order creation and management
   * 
   * Flow: Partner logs in → Creates work order → Tracks progress → Receives completion notification
   * Test Users: partner1@abc.com, partner2@xyz.com, partner3@premium.com
   */
  partnerFlow: {
    users: getUsersByCompany('ABC Property Management')
      .concat(getUsersByCompany('XYZ Commercial Properties'))
      .concat(getUsersByCompany('Premium Facilities Group')),
    organizations: organizations.filter(org => org.organization_type === 'partner'),
    locations: partnerLocations,
    testScenarios: [
      'Multi-location work order submission',
      'Location-specific work order numbering',
      'Work order status tracking',
      'Completion notifications'
    ]
  },
  
  /**
   * Subcontractor Journey: Work assignment and completion
   * 
   * Flow: Receives assignment → Performs work → Submits report → Receives feedback → Invoice processing
   * Test Users: All subcontractor users (plumber1@trade.com, etc.)
   */
  subcontractorFlow: {
    users: users.filter(user => user.user_type === 'subcontractor'),
    organizations: organizations.filter(org => org.organization_type === 'subcontractor'),
    testScenarios: [
      'Work order assignment notifications',
      'Multi-technician assignments',
      'Work report submission',
      'Invoice creation and submission',
      'Report review and feedback'
    ]
  },
  
  /**
   * Employee Journey: Internal work management
   * 
   * Flow: Receives assignment → Time tracking → Expense reporting → Report submission
   * Test Users: senior@workorderpro.com, midlevel@workorderpro.com, junior@workorderpro.com
   */
  employeeFlow: {
    users: users.filter(user => user.is_employee && user.user_type === 'employee'),
    organization: getOrganizationByName('WorkOrderPro Internal'),
    testScenarios: [
      'Internal work assignments',
      'Time tracking and hourly rates',
      'Expense receipt management',
      'Multi-level employee structure',
      'Lead and support role assignments'
    ]
  },
  
  /**
   * Admin Journey: System management and oversight
   * 
   * Flow: Reviews submissions → Assigns work → Monitors progress → Reviews reports → Manages system
   * Test Users: admin@workorderpro.com, employee@workorderpro.com
   */
  adminFlow: {
    users: users.filter(user => user.user_type === 'admin'),
    organization: getOrganizationByName('WorkOrderPro Internal'),
    testScenarios: [
      'Work order assignment and management',
      'Multi-assignee work orders',
      'Report review and approval',
      'Invoice processing and approval',
      'System administration and user management',
      'Analytics and performance monitoring'
    ]
  }
};

/**
 * Financial Test Scenarios
 * 
 * Data structure for testing financial workflows and invoice processing
 */
export const financialTestScenarios = {
  /**
   * Invoice Status Workflow
   * 
   * Tests complete invoice lifecycle from draft to payment
   */
  invoiceStatuses: ['draft', 'submitted', 'approved', 'paid', 'rejected'],
  
  /**
   * Rate Structure Testing
   * 
   * Tests different billing rates and cost structures
   */
  employeeRates: {
    senior: { cost: 75, billable: 150 },
    midLevel: { cost: 50, billable: 100 },
    junior: { cost: 35, billable: 70 }
  },
  
  /**
   * Multi-work-order Invoice Testing
   * 
   * Tests invoices that span multiple work orders
   */
  invoiceComplexity: [
    'Single work order invoice',
    'Multi work order invoice',
    'Partial work order billing',
    'Split billing scenarios'
  ]
};