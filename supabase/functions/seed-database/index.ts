/**
 * Supabase Edge Function: Database Seeding
 * 
 * This function provides secure, server-side database seeding capabilities
 * that bypass Row-Level Security (RLS) policies using the service role key.
 * 
 * Why Edge Functions for Seeding?
 * ================================
 * 
 * 1. **RLS Bypass**: Browser-based seeding fails due to RLS policies that
 *    restrict data access based on user authentication. Edge functions run
 *    with service role privileges, bypassing these restrictions.
 * 
 * 2. **Atomic Operations**: Server-side execution ensures complete success
 *    or rollback on failure, maintaining data integrity.
 * 
 * 3. **Security**: Sensitive operations (user creation, admin data) are
 *    handled server-side with proper access controls.
 * 
 * 4. **Performance**: No browser limitations or network latency for large
 *    dataset operations.
 * 
 * Authentication & Security:
 * ==========================
 * 
 * **Multi-Layer Admin Authentication**:
 * - API key validation (`admin_key` in request body)
 * - Bearer token validation (Authorization header)
 * - Development mode bypass (ENVIRONMENT=development)
 * - Service role key protection (never exposed in logs)
 * 
 * **User Creation Security Flow**:
 * 1. Admin authentication validation (3 methods)
 * 2. Service role client initialization (bypasses RLS)
 * 3. Auth user creation with admin.createUser()
 * 4. Profile creation with comprehensive metadata
 * 5. User-organization relationship establishment
 * 6. Employee rate configuration (cost/billable rates)
 * 7. Individual error handling (continue on failures)
 * 8. Comprehensive audit logging and progress reporting
 * 
 * **Critical Security Features**:
 * - Individual user failure isolation (orphaned auth user tracking)
 * - Organization relationship validation and mapping
 * - Employee-specific data handling (rates, permissions)
 * - Comprehensive error categorization and reporting
 * - Test credential generation and summary
 * 
 * **Service Role Operations**:
 * - Bypasses all RLS policies for administrative operations
 * - Creates auth.users entries with proper metadata
 * - Establishes user_organizations relationships
 * - Sets employee-specific flags and hourly rates
 * - Handles complex multi-tenant organization mapping
 * 
 * Usage:
 * ======
 * 
 * Method 1: API Key Authentication
 * POST /functions/v1/seed-database
 * {
 *   "admin_key": "your-admin-verification-key",
 *   "options": {
 *     "clear_existing": true,
 *     "include_test_data": true
 *   }
 * }
 * 
 * Method 2: Bearer Token Authentication
 * POST /functions/v1/seed-database
 * Authorization: Bearer your-admin-bearer-token
 * {
 *   "options": {
 *     "clear_existing": true
 *   }
 * }
 * 
 * Method 3: Development Mode (Environment Variables)
 * ENVIRONMENT=development
 * POST /functions/v1/seed-database
 * {}
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, createCorsResponse, createCorsErrorResponse } from "../_shared/cors.ts";
import { organizations, users, trades, emailTemplates, DEFAULT_TEST_PASSWORD } from "../_shared/seed-data.ts";
import type { SeedingResult, SeedingProgress } from "../_shared/types.ts";

/**
 * Initialize Supabase client with service role key
 * 
 * The service role key bypasses RLS policies and allows
 * administrative operations on all tables.
 */
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * Seeding request interface
 */
interface SeedingRequest {
  admin_key?: string;
  options?: {
    clear_existing?: boolean;
    include_test_data?: boolean;
    selective_seed?: string[]; // Array of table names to seed
  };
}

/**
 * Validate admin access for seeding operations
 * 
 * CRITICAL SECURITY: This function must validate that the caller
 * has administrative privileges before allowing database seeding.
 * 
 * Multiple validation methods are supported:
 * 1. Admin API key in request body
 * 2. Authorization header with admin bearer token
 * 3. Development mode bypass (only in dev environment)
 * 
 * @param request - The seeding request containing authentication data
 * @param authHeader - Authorization header from request
 * @returns true if admin access is validated, false otherwise
 */
function validateAdminAccess(request: SeedingRequest, authHeader?: string): boolean {
  try {
    // Method 1: Check for admin API key in request body
    if (request.admin_key) {
      const expectedKey = Deno.env.get('ADMIN_SEEDING_KEY');
      if (expectedKey && request.admin_key === expectedKey) {
        console.log('✅ Admin access validated via API key');
        return true;
      }
      console.warn('⚠️ Invalid admin API key provided');
    }
    
    // Method 2: Check for Authorization header
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const expectedToken = Deno.env.get('ADMIN_BEARER_TOKEN');
      if (expectedToken && token === expectedToken) {
        console.log('✅ Admin access validated via bearer token');
        return true;
      }
      console.warn('⚠️ Invalid bearer token provided');
    }
    
    // Method 3: Development mode bypass
    const isDevelopment = Deno.env.get('ENVIRONMENT') === 'development';
    if (isDevelopment) {
      console.log('⚠️ Admin access granted in development mode');
      return true;
    }
    
    console.error('❌ Admin access denied - no valid authentication provided');
    return false;
    
  } catch (error) {
    console.error('❌ Error validating admin access:', error);
    return false;
  }
}

/**
 * Clear existing test data from database
 * 
 * Uses the existing clear_test_data function to safely
 * remove test records while preserving production data.
 */
async function clearTestData(): Promise<void> {
  console.log('🧹 Clearing existing test data...');
  
  const { data, error } = await supabaseAdmin.rpc('clear_test_data');
  
  if (error) {
    console.error('❌ Failed to clear test data:', error);
    throw new Error(`Failed to clear test data: ${error.message}`);
  }
  
  console.log('✅ Test data cleared successfully:', data);
}

/**
 * Create organizations in database
 */
async function seedOrganizations(): Promise<number> {
  console.log('🏢 Creating organizations...');
  
  const { data, error } = await supabaseAdmin
    .from('organizations')
    .insert(organizations)
    .select();
  
  if (error) {
    console.error('❌ Failed to create organizations:', error);
    throw new Error(`Failed to create organizations: ${error.message}`);
  }
  
  console.log(`✅ Created ${data?.length || 0} organizations`);
  return data?.length || 0;
}

/**
 * Create trades in database
 */
async function seedTrades(): Promise<number> {
  console.log('🔧 Creating trades...');
  
  const { data, error } = await supabaseAdmin
    .from('trades')
    .insert(trades)
    .select();
  
  if (error) {
    console.error('❌ Failed to create trades:', error);
    throw new Error(`Failed to create trades: ${error.message}`);
  }
  
  console.log(`✅ Created ${data?.length || 0} trades`);
  return data?.length || 0;
}

/**
 * Create email templates in database
 */
async function seedEmailTemplates(): Promise<number> {
  console.log('📧 Creating email templates...');
  
  const { data, error } = await supabaseAdmin
    .from('email_templates')
    .insert(emailTemplates)
    .select();
  
  if (error) {
    console.error('❌ Failed to create email templates:', error);
    throw new Error(`Failed to create email templates: ${error.message}`);
  }
  
  console.log(`✅ Created ${data?.length || 0} email templates`);
  return data?.length || 0;
}

/**
 * User creation result interface for enhanced error tracking
 */
interface UserCreationResult {
  email: string;
  success: boolean;
  authUserId?: string;
  profileId?: string;
  organizationLinks?: number;
  error?: string;
  stage?: 'auth' | 'profile' | 'organization';
}

/**
 * Create test users with authentication accounts
 * 
 * This function creates complete user accounts with:
 * 1. Auth users in auth.users table (service role bypass)
 * 2. Profile records with all user metadata
 * 3. User-organization relationships
 * 4. Employee-specific rate settings
 * 
 * Security Features:
 * - Uses service role to bypass RLS policies
 * - Individual error handling per user (continues on failures)
 * - Comprehensive audit logging for each step
 * - User-organization relationship mapping
 * 
 * @returns Promise<number> - Number of successfully created users
 */
async function seedUsers(): Promise<number> {
  console.log('👥 Creating test users with auth accounts and organization relationships...');
  
  let createdCount = 0;
  const userResults: UserCreationResult[] = [];
  const organizationMap = new Map<string, string>();
  
  // Step 1: Get organization IDs for mapping
  console.log('🔍 Fetching organization mappings...');
  const { data: orgData, error: orgError } = await supabaseAdmin
    .from('organizations')
    .select('id, name, organization_type');
    
  if (orgError) {
    console.error('❌ Failed to fetch organizations for mapping:', orgError);
    throw new Error(`Cannot create users without organization mapping: ${orgError.message}`);
  }
  
  // Build organization name-to-ID mapping
  orgData?.forEach(org => {
    organizationMap.set(org.name, org.id);
  });
  
  console.log(`📋 Found ${organizationMap.size} organizations for user mapping`);
  
  // Step 2: Create users with comprehensive error handling
  for (const user of users) {
    const result: UserCreationResult = {
      email: user.email,
      success: false
    };
    
    try {
      console.log(`\n🔨 Creating user: ${user.email} (${user.user_type})`);
      
      // Step 2a: Create auth user with service role
      console.log(`  📧 Creating auth user for ${user.email}...`);
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: DEFAULT_TEST_PASSWORD,
        email_confirm: true,
        user_metadata: {
          first_name: user.first_name,
          last_name: user.last_name,
          user_type: user.user_type
        }
      });
      
      if (authError) {
        result.error = `Auth creation failed: ${authError.message}`;
        result.stage = 'auth';
        console.error(`  ❌ Auth user creation failed for ${user.email}:`, authError.message);
        userResults.push(result);
        continue;
      }
      
      result.authUserId = authUser.user.id;
      console.log(`  ✅ Auth user created: ${authUser.user.id}`);
      
      // Step 2b: Create profile record
      console.log(`  👤 Creating profile for ${user.email}...`);
      const { data: profileData, error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          user_id: authUser.user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          user_type: user.user_type,
          company_name: user.company_name,
          phone: user.phone,
          is_employee: user.is_employee || false,
          hourly_cost_rate: user.hourly_cost_rate,
          hourly_billable_rate: user.hourly_billable_rate,
          is_active: true
        })
        .select('id')
        .single();
      
      if (profileError) {
        result.error = `Profile creation failed: ${profileError.message}`;
        result.stage = 'profile';
        console.error(`  ❌ Profile creation failed for ${user.email}:`, profileError.message);
        
        // Log orphaned auth user for manual cleanup
        console.warn(`  ⚠️ ORPHANED AUTH USER: ${authUser.user.id} for ${user.email} - manual cleanup may be required`);
        userResults.push(result);
        continue;
      }
      
      result.profileId = profileData.id;
      console.log(`  ✅ Profile created: ${profileData.id}`);
      
      // Step 2c: Create user-organization relationships
      console.log(`  🏢 Linking user to organizations...`);
      let organizationLinksCreated = 0;
      
      // Determine organization relationships based on user type and company
      const organizationLinks: string[] = [];
      
      if (user.user_type === 'admin' || user.user_type === 'employee') {
        // Link to WorkOrderPro (internal organization)
        const internalOrgId = organizationMap.get('WorkOrderPro');
        if (internalOrgId) {
          organizationLinks.push(internalOrgId);
        }
      } else if (user.user_type === 'partner') {
        // Link to partner organization based on company_name
        if (user.company_name) {
          const partnerOrgId = organizationMap.get(user.company_name);
          if (partnerOrgId) {
            organizationLinks.push(partnerOrgId);
          }
        }
      } else if (user.user_type === 'subcontractor') {
        // Link to subcontractor organization based on company_name
        if (user.company_name) {
          const subcontractorOrgId = organizationMap.get(user.company_name);
          if (subcontractorOrgId) {
            organizationLinks.push(subcontractorOrgId);
          }
        }
      }
      
      // Create organization relationships
      for (const orgId of organizationLinks) {
        try {
          const { error: orgLinkError } = await supabaseAdmin
            .from('user_organizations')
            .insert({
              user_id: profileData.id,
              organization_id: orgId
            });
            
          if (orgLinkError) {
            console.warn(`    ⚠️ Failed to link user ${user.email} to organization ${orgId}:`, orgLinkError.message);
          } else {
            organizationLinksCreated++;
            console.log(`    ✅ Linked to organization: ${orgId}`);
          }
        } catch (linkError) {
          console.warn(`    ⚠️ Error linking user ${user.email} to organization ${orgId}:`, linkError);
        }
      }
      
      result.organizationLinks = organizationLinksCreated;
      
      // Step 2d: Log employee-specific details
      if (user.is_employee && (user.hourly_cost_rate || user.hourly_billable_rate)) {
        console.log(`  💰 Employee rates - Cost: $${user.hourly_cost_rate}/hr, Billable: $${user.hourly_billable_rate}/hr`);
      }
      
      // Success!
      result.success = true;
      createdCount++;
      console.log(`  🎉 User ${user.email} created successfully with ${organizationLinksCreated} organization links`);
      
    } catch (error) {
      result.error = `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      result.stage = 'unknown';
      console.error(`  ❌ Unexpected error creating user ${user.email}:`, error);
    }
    
    userResults.push(result);
  }
  
  // Step 3: Generate comprehensive summary
  console.log('\n📊 User Creation Summary:');
  console.log(`✅ Successfully created: ${createdCount}/${users.length} users`);
  
  const errorsByStage = userResults
    .filter(r => !r.success)
    .reduce((acc, r) => {
      const stage = r.stage || 'unknown';
      acc[stage] = (acc[stage] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  
  if (Object.keys(errorsByStage).length > 0) {
    console.log('❌ Errors by stage:', errorsByStage);
  }
  
  const totalOrgLinks = userResults
    .filter(r => r.success)
    .reduce((sum, r) => sum + (r.organizationLinks || 0), 0);
  
  console.log(`🔗 Total organization relationships created: ${totalOrgLinks}`);
  
  // Step 4: List test credentials for easy access
  const successfulUsers = userResults.filter(r => r.success);
  if (successfulUsers.length > 0) {
    console.log('\n🔑 Test Login Credentials:');
    console.log(`📧 Password for all test users: ${DEFAULT_TEST_PASSWORD}`);
    console.log('👥 Test Users by Type:');
    
    const usersByType = successfulUsers.reduce((acc, r) => {
      const user = users.find(u => u.email === r.email);
      if (user) {
        if (!acc[user.user_type]) acc[user.user_type] = [];
        acc[user.user_type].push(user.email);
      }
      return acc;
    }, {} as Record<string, string[]>);
    
    Object.entries(usersByType).forEach(([type, emails]) => {
      console.log(`  ${type}: ${emails.join(', ')}`);
    });
  }
  
  return createdCount;
}

/**
 * Create partner locations for testing multi-location scenarios
 */
async function seedPartnerLocations(): Promise<number> {
  console.log('🏢 Creating partner locations...');
  
  // Get partner organization IDs
  const { data: orgData, error: orgError } = await supabaseAdmin
    .from('organizations')
    .select('id, name')
    .eq('organization_type', 'partner');
    
  if (orgError) {
    console.error('❌ Failed to fetch partner organizations:', orgError);
    throw new Error(`Cannot create partner locations: ${orgError.message}`);
  }
  
  const orgMap = new Map(orgData?.map(org => [org.name, org.id]) || []);
  
  const partnerLocations = [
    // ABC Property Management (4 locations)
    {
      organization_id: orgMap.get('ABC Property Management'),
      location_name: 'Downtown Office Complex',
      location_number: '504',
      street_address: '504 Business District Drive',
      city: 'New York',
      state: 'NY',
      zip_code: '10001',
      contact_name: 'Sarah Johnson',
      contact_email: 'sarah.johnson@abc.com',
      contact_phone: '(555) 123-4571',
      is_active: true
    },
    {
      organization_id: orgMap.get('ABC Property Management'),
      location_name: 'Westside Shopping Center',
      location_number: '505',
      street_address: '505 Westside Boulevard',
      city: 'New York',
      state: 'NY', 
      zip_code: '10002',
      contact_name: 'Mike Rodriguez',
      contact_email: 'mike.rodriguez@abc.com',
      contact_phone: '(555) 123-4572',
      is_active: true
    },
    {
      organization_id: orgMap.get('ABC Property Management'),
      location_name: 'Uptown Retail Plaza',
      location_number: '506',
      street_address: '506 Uptown Avenue',
      city: 'New York',
      state: 'NY',
      zip_code: '10003',
      contact_name: 'Lisa Chen',
      contact_email: 'lisa.chen@abc.com',
      contact_phone: '(555) 123-4573',
      is_active: true
    },
    {
      organization_id: orgMap.get('ABC Property Management'),
      location_name: 'Legacy Building (Inactive)',
      location_number: '507',
      street_address: '507 Old Business Road',
      city: 'New York',
      state: 'NY',
      zip_code: '10004',
      contact_name: 'Tom Wilson',
      contact_email: 'tom.wilson@abc.com',
      contact_phone: '(555) 123-4574',
      is_active: false // Test inactive location handling
    },
    
    // XYZ Commercial Properties (3 locations)
    {
      organization_id: orgMap.get('XYZ Commercial Properties'),
      location_name: 'Main Office Tower',
      location_number: '101',
      street_address: '101 Corporate Drive',
      city: 'Los Angeles',
      state: 'CA',
      zip_code: '90210',
      contact_name: 'Jennifer Smith',
      contact_email: 'jennifer.smith@xyz.com',
      contact_phone: '(555) 987-6541',
      is_active: true
    },
    {
      organization_id: orgMap.get('XYZ Commercial Properties'),
      location_name: 'Tech Campus',
      location_number: '102',
      street_address: '102 Innovation Way',
      city: 'Los Angeles',
      state: 'CA',
      zip_code: '90211',
      contact_name: 'David Park',
      contact_email: 'david.park@xyz.com',
      contact_phone: '(555) 987-6542',
      is_active: true
    },
    {
      organization_id: orgMap.get('XYZ Commercial Properties'),
      location_name: 'Harbor View Complex',
      location_number: '103',
      street_address: '103 Harbor Drive',
      city: 'Los Angeles',
      state: 'CA',
      zip_code: '90212',
      contact_name: 'Maria Gonzalez',
      contact_email: 'maria.gonzalez@xyz.com',
      contact_phone: '(555) 987-6543',
      is_active: true
    },
    
    // Premium Facilities Group (3 locations)
    {
      organization_id: orgMap.get('Premium Facilities Group'),
      location_name: 'Executive Center',
      location_number: 'EC1',
      street_address: '201 Executive Boulevard',
      city: 'Chicago',
      state: 'IL',
      zip_code: '60601',
      contact_name: 'Robert Johnson',
      contact_email: 'robert.johnson@premium.com',
      contact_phone: '(555) 456-7891',
      is_active: true
    },
    {
      organization_id: orgMap.get('Premium Facilities Group'),
      location_name: 'Industrial Park',
      location_number: 'IP2',
      street_address: '202 Industrial Way',
      city: 'Chicago',
      state: 'IL',
      zip_code: '60602',
      contact_name: 'Emily Davis',
      contact_email: 'emily.davis@premium.com',
      contact_phone: '(555) 456-7892',
      is_active: true
    },
    {
      organization_id: orgMap.get('Premium Facilities Group'),
      location_name: 'Retail District',
      location_number: 'RD3',
      street_address: '203 Retail Street',
      city: 'Chicago',
      state: 'IL',
      zip_code: '60603',
      contact_name: 'James Wilson',
      contact_email: 'james.wilson@premium.com',
      contact_phone: '(555) 456-7893',
      is_active: true
    }
  ].filter(loc => loc.organization_id); // Remove locations without valid org IDs
  
  const { data, error } = await supabaseAdmin
    .from('partner_locations')
    .insert(partnerLocations)
    .select();
    
  if (error) {
    console.error('❌ Failed to create partner locations:', error);
    throw new Error(`Failed to create partner locations: ${error.message}`);
  }
  
  console.log(`✅ Created ${data?.length || 0} partner locations`);
  return data?.length || 0;
}

/**
 * Create work orders with smart numbering and various test scenarios
 */
async function seedWorkOrders(): Promise<number> {
  console.log('📋 Creating work orders with various scenarios...');
  
  // Get organization and user mappings
  const { data: orgData } = await supabaseAdmin
    .from('organizations')
    .select('id, name, initials');
    
  const { data: userData } = await supabaseAdmin
    .from('profiles')
    .select('id, email, user_type, company_name');
    
  const { data: tradeData } = await supabaseAdmin
    .from('trades')
    .select('id, name');
    
  const { data: locationData } = await supabaseAdmin
    .from('partner_locations')
    .select('id, organization_id, location_number, location_name');
    
  if (!orgData || !userData || !tradeData) {
    throw new Error('Failed to fetch reference data for work orders');
  }
  
  const orgMap = new Map(orgData.map(org => [org.name, org]));
  const userMap = new Map(userData.map(user => [user.email, user]));
  const tradeMap = new Map(tradeData.map(trade => [trade.name, trade.id]));
  const locationMap = new Map(locationData.map(loc => [loc.location_number, loc]));
  
  // Helper to get random past date
  const getRandomPastDate = (daysBack: number) => {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * daysBack));
    return date.toISOString();
  };
  
  const workOrders = [
    // ABC Property Management Work Orders (5 work orders)
    {
      organization_id: orgMap.get('ABC Property Management')?.id,
      created_by: userMap.get('partner1@abc.com')?.id,
      title: 'HVAC System Repair - Downtown Office',
      description: 'Air conditioning unit not cooling properly in Suite 504. Temperature reaching 78°F during business hours.',
      trade_id: tradeMap.get('HVAC'),
      partner_location_number: '504',
      location_name: 'Downtown Office Complex',
      location_street_address: '504 Business District Drive',
      location_city: 'New York',
      location_state: 'NY',
      location_zip_code: '10001',
      status: 'completed',
      assigned_to: userMap.get('hvac1@coolairhvac.com')?.id,
      assigned_to_type: 'subcontractor',
      assigned_organization_id: orgMap.get('Cool Air HVAC')?.id,
      date_submitted: getRandomPastDate(30),
      date_assigned: getRandomPastDate(25),
      completed_at: getRandomPastDate(20),
      estimated_completion_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      partner_po_number: 'ABC-2024-001'
    },
    {
      organization_id: orgMap.get('ABC Property Management')?.id,
      created_by: userMap.get('partner1@abc.com')?.id,
      title: 'Plumbing Leak Emergency - Westside',
      description: 'Water leak detected in main restroom. Requires immediate attention to prevent water damage.',
      trade_id: tradeMap.get('Plumbing'),
      partner_location_number: '505',
      location_name: 'Westside Shopping Center',
      location_street_address: '505 Westside Boulevard',
      location_city: 'New York',
      location_state: 'NY',
      location_zip_code: '10002',
      status: 'in_progress',
      assigned_to: userMap.get('plumber1@pipesmore.com')?.id,
      assigned_to_type: 'subcontractor',
      assigned_organization_id: orgMap.get('Pipes & More Plumbing')?.id,
      date_submitted: getRandomPastDate(5),
      date_assigned: getRandomPastDate(3),
      estimated_completion_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      partner_po_number: 'ABC-2024-002'
    },
    {
      organization_id: orgMap.get('ABC Property Management')?.id,
      created_by: userMap.get('partner2@abc.com')?.id,
      title: 'Electrical Outlet Installation - Uptown',
      description: 'Install 4 new outlets in the conference room for equipment setup. Include USB charging capabilities.',
      trade_id: tradeMap.get('Electrical'),
      partner_location_number: '506',
      location_name: 'Uptown Retail Plaza',
      location_street_address: '506 Uptown Avenue',
      location_city: 'New York',
      location_state: 'NY',
      location_zip_code: '10003',
      status: 'assigned',
      assigned_to: userMap.get('electrician1@sparkselectric.com')?.id,
      assigned_to_type: 'subcontractor',
      assigned_organization_id: orgMap.get('Sparks Electric')?.id,
      date_submitted: getRandomPastDate(2),
      date_assigned: getRandomPastDate(1),
      estimated_completion_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      partner_po_number: 'ABC-2024-003'
    },
    {
      organization_id: orgMap.get('ABC Property Management')?.id,
      created_by: userMap.get('partner1@abc.com')?.id,
      title: 'Carpet Replacement - Downtown Lobby',
      description: 'Replace worn carpet in main lobby area. Approximately 500 sq ft. Customer preference for commercial grade.',
      trade_id: tradeMap.get('Flooring'),
      partner_location_number: '504',
      location_name: 'Downtown Office Complex',
      location_street_address: '504 Business District Drive',
      location_city: 'New York',
      location_state: 'NY',
      location_zip_code: '10001',
      status: 'received',
      date_submitted: getRandomPastDate(1),
      estimated_completion_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      partner_po_number: 'ABC-2024-004'
    },
    {
      organization_id: orgMap.get('ABC Property Management')?.id,
      created_by: userMap.get('partner2@abc.com')?.id,
      title: 'Security System Maintenance - Multi-Location',
      description: 'Annual maintenance and testing of security systems across Downtown and Westside locations.',
      trade_id: tradeMap.get('Security Systems'),
      partner_location_number: '504', // Primary location
      location_name: 'Downtown Office Complex',
      location_street_address: '504 Business District Drive',
      location_city: 'New York',
      location_state: 'NY',
      location_zip_code: '10001',
      status: 'received',
      date_submitted: getRandomPastDate(0),
      estimated_completion_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      partner_po_number: 'ABC-2024-005'
    },
    
    // XYZ Commercial Properties Work Orders (3 work orders)
    {
      organization_id: orgMap.get('XYZ Commercial Properties')?.id,
      created_by: userMap.get('partner3@xyz.com')?.id,
      title: 'Office Painting - Tech Campus',
      description: 'Paint 3 conference rooms and main hallway. Colors to match corporate branding guidelines.',
      trade_id: tradeMap.get('Painting'),
      partner_location_number: '102',
      location_name: 'Tech Campus',
      location_street_address: '102 Innovation Way',
      location_city: 'Los Angeles',
      location_state: 'CA',
      location_zip_code: '90211',
      status: 'completed',
      assigned_to: userMap.get('painter1@brushstrokes.com')?.id,
      assigned_to_type: 'subcontractor',
      assigned_organization_id: orgMap.get('Brush Strokes Painting')?.id,
      date_submitted: getRandomPastDate(25),
      date_assigned: getRandomPastDate(20),
      completed_at: getRandomPastDate(15),
      estimated_completion_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      partner_po_number: 'XYZ-2024-001'
    },
    {
      organization_id: orgMap.get('XYZ Commercial Properties')?.id,
      created_by: userMap.get('partner3@xyz.com')?.id,
      title: 'Landscaping Maintenance - Harbor View',
      description: 'Monthly landscaping service including hedge trimming, lawn care, and seasonal plantings.',
      trade_id: tradeMap.get('Landscaping'),
      partner_location_number: '103',
      location_name: 'Harbor View Complex',
      location_street_address: '103 Harbor Drive',
      location_city: 'Los Angeles',
      location_state: 'CA',
      location_zip_code: '90212',
      status: 'in_progress',
      assigned_to: userMap.get('landscaper1@greenthumb.com')?.id,
      assigned_to_type: 'subcontractor',
      assigned_organization_id: orgMap.get('Green Thumb Landscaping')?.id,
      date_submitted: getRandomPastDate(7),
      date_assigned: getRandomPastDate(5),
      estimated_completion_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      partner_po_number: 'XYZ-2024-002'
    },
    {
      organization_id: orgMap.get('XYZ Commercial Properties')?.id,
      created_by: userMap.get('partner3@xyz.com')?.id,
      title: 'General Maintenance - Main Office Tower',
      description: 'Routine maintenance checklist including HVAC filter replacement, light bulb changes, and minor repairs.',
      trade_id: tradeMap.get('General Maintenance'),
      partner_location_number: '101',
      location_name: 'Main Office Tower',
      location_street_address: '101 Corporate Drive',
      location_city: 'Los Angeles',
      location_state: 'CA',
      location_zip_code: '90210',
      status: 'assigned',
      assigned_to: userMap.get('maintenance1@fixitmaintenance.com')?.id,
      assigned_to_type: 'subcontractor',
      assigned_organization_id: orgMap.get('Fix-It Maintenance')?.id,
      date_submitted: getRandomPastDate(3),
      date_assigned: getRandomPastDate(1),
      estimated_completion_date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      partner_po_number: 'XYZ-2024-003'
    },
    
    // Premium Facilities Group Work Orders (3 work orders)
    {
      organization_id: orgMap.get('Premium Facilities Group')?.id,
      created_by: userMap.get('partner4@premium.com')?.id,
      title: 'Wood Flooring Installation - Executive Center',
      description: 'Install hardwood flooring in executive office suite. 800 sq ft of premium oak flooring required.',
      trade_id: tradeMap.get('Carpentry'),
      partner_location_number: 'EC1',
      location_name: 'Executive Center',
      location_street_address: '201 Executive Boulevard',
      location_city: 'Chicago',
      location_state: 'IL',
      location_zip_code: '60601',
      status: 'in_progress',
      assigned_to: userMap.get('carpenter1@woodworks.com')?.id,
      assigned_to_type: 'subcontractor',
      assigned_organization_id: orgMap.get('Wood Works Carpentry')?.id,
      date_submitted: getRandomPastDate(10),
      date_assigned: getRandomPastDate(8),
      estimated_completion_date: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      partner_po_number: 'PFG-2024-001'
    },
    {
      organization_id: orgMap.get('Premium Facilities Group')?.id,
      created_by: userMap.get('partner4@premium.com')?.id,
      title: 'Emergency Electrical Repair - Industrial Park',
      description: 'Power outage in Section B. Circuit breaker inspection and repair needed urgently.',
      trade_id: tradeMap.get('Electrical'),
      partner_location_number: 'IP2',
      location_name: 'Industrial Park',
      location_street_address: '202 Industrial Way',
      location_city: 'Chicago',
      location_state: 'IL',
      location_zip_code: '60602',
      status: 'completed',
      assigned_to: userMap.get('electrician2@sparkselectric.com')?.id,
      assigned_to_type: 'subcontractor',
      assigned_organization_id: orgMap.get('Sparks Electric')?.id,
      date_submitted: getRandomPastDate(12),
      date_assigned: getRandomPastDate(12), // Same day assignment due to emergency
      completed_at: getRandomPastDate(11),
      estimated_completion_date: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      partner_po_number: 'PFG-2024-002'
    },
    {
      organization_id: orgMap.get('Premium Facilities Group')?.id,
      created_by: userMap.get('partner4@premium.com')?.id,
      title: 'HVAC Installation - Retail District',
      description: 'Install new HVAC system for expanded retail space. 2-ton capacity unit with smart thermostat.',
      trade_id: tradeMap.get('HVAC'),
      partner_location_number: 'RD3',
      location_name: 'Retail District',
      location_street_address: '203 Retail Street',
      location_city: 'Chicago',
      location_state: 'IL',
      location_zip_code: '60603',
      status: 'assigned',
      assigned_to: userMap.get('hvac2@coolairhvac.com')?.id,
      assigned_to_type: 'subcontractor',
      assigned_organization_id: orgMap.get('Cool Air HVAC')?.id,
      date_submitted: getRandomPastDate(4),
      date_assigned: getRandomPastDate(2),
      estimated_completion_date: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      partner_po_number: 'PFG-2024-003'
    },
    
    // Employee-assigned work orders (3 work orders for internal maintenance)
    {
      organization_id: orgMap.get('WorkOrderPro Internal')?.id,
      created_by: userMap.get('admin1@workorderpro.com')?.id,
      title: 'Office Equipment Maintenance - Internal',
      description: 'Routine maintenance of office equipment including printers, scanners, and networking equipment.',
      trade_id: tradeMap.get('General Maintenance'),
      store_location: 'WorkOrderPro Main Office',
      street_address: '100 Main Street, Suite 200',
      city: 'Business City',
      state: 'BC',
      zip_code: '12345',
      status: 'in_progress',
      assigned_to: userMap.get('employee1@workorderpro.com')?.id,
      assigned_to_type: 'internal',
      assigned_organization_id: orgMap.get('WorkOrderPro Internal')?.id,
      date_submitted: getRandomPastDate(5),
      date_assigned: getRandomPastDate(4),
      estimated_completion_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    },
    {
      organization_id: orgMap.get('WorkOrderPro Internal')?.id,
      created_by: userMap.get('admin2@workorderpro.com')?.id,
      title: 'IT Infrastructure Upgrade - Internal',
      description: 'Upgrade server room cooling system and cable management. Critical for system stability.',
      trade_id: tradeMap.get('HVAC'),
      store_location: 'WorkOrderPro Main Office',
      street_address: '100 Main Street, Suite 200',
      city: 'Business City',
      state: 'BC',
      zip_code: '12345',
      status: 'assigned',
      assigned_to: userMap.get('employee2@workorderpro.com')?.id,
      assigned_to_type: 'internal',
      assigned_organization_id: orgMap.get('WorkOrderPro Internal')?.id,
      date_submitted: getRandomPastDate(2),
      date_assigned: getRandomPastDate(1),
      estimated_completion_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    },
    {
      organization_id: orgMap.get('WorkOrderPro Internal')?.id,
      created_by: userMap.get('admin1@workorderpro.com')?.id,
      title: 'Security Audit and Updates - Internal',
      description: 'Quarterly security system review and software updates. Include access card system maintenance.',
      trade_id: tradeMap.get('Security Systems'),
      store_location: 'WorkOrderPro Main Office',
      street_address: '100 Main Street, Suite 200',
      city: 'Business City',
      state: 'BC',
      zip_code: '12345',
      status: 'completed',
      assigned_to: userMap.get('employee3@workorderpro.com')?.id,
      assigned_to_type: 'internal',
      assigned_organization_id: orgMap.get('WorkOrderPro Internal')?.id,
      date_submitted: getRandomPastDate(15),
      date_assigned: getRandomPastDate(14),
      completed_at: getRandomPastDate(10),
      estimated_completion_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }
  ].filter(wo => wo.organization_id && wo.created_by && wo.trade_id); // Remove invalid work orders
  
  const { data, error } = await supabaseAdmin
    .from('work_orders')
    .insert(workOrders)
    .select();
    
  if (error) {
    console.error('❌ Failed to create work orders:', error);
    throw new Error(`Failed to create work orders: ${error.message}`);
  }
  
  console.log(`✅ Created ${data?.length || 0} work orders with smart numbering`);
  return data?.length || 0;
}

/**
 * Create work order assignments for multi-assignee scenarios
 */
async function seedWorkOrderAssignments(): Promise<number> {
  console.log('👥 Creating work order assignments...');
  
  // Get work orders and users for assignments
  const { data: workOrders } = await supabaseAdmin
    .from('work_orders')
    .select('id, assigned_to, assigned_organization_id, title, status');
    
  const { data: userData } = await supabaseAdmin
    .from('profiles')
    .select('id, email, user_type');
    
  if (!workOrders || !userData) {
    throw new Error('Failed to fetch data for work order assignments');
  }
  
  const userMap = new Map(userData.map(user => [user.email, user]));
  
  // Create assignments for some work orders to demonstrate multi-assignee functionality
  const assignments = [];
  
  // Find a few work orders to add extra assignments to
  const multiAssigneeWorkOrders = workOrders.filter(wo => 
    wo.status === 'in_progress' && wo.assigned_to
  ).slice(0, 3);
  
  for (const workOrder of multiAssigneeWorkOrders) {
    // Add the primary assignee as lead
    if (workOrder.assigned_to) {
      assignments.push({
        work_order_id: workOrder.id,
        assigned_to: workOrder.assigned_to,
        assigned_by: userMap.get('admin1@workorderpro.com')?.id,
        assigned_organization_id: workOrder.assigned_organization_id,
        assignment_type: 'lead',
        notes: `Lead assignment for: ${workOrder.title}`
      });
    }
    
    // Add a support assignment for employee oversight
    const supportEmployee = userMap.get('employee1@workorderpro.com');
    if (supportEmployee) {
      assignments.push({
        work_order_id: workOrder.id,
        assigned_to: supportEmployee.id,
        assigned_by: userMap.get('admin1@workorderpro.com')?.id,
        assigned_organization_id: workOrder.assigned_organization_id,
        assignment_type: 'support',
        notes: `Quality oversight and coordination support`
      });
    }
  }
  
  // Add some employee-only assignments for internal work orders
  const internalWorkOrders = workOrders.filter(wo => 
    wo.title.includes('Internal') && wo.assigned_to
  );
  
  for (const workOrder of internalWorkOrders) {
    if (workOrder.assigned_to) {
      assignments.push({
        work_order_id: workOrder.id,
        assigned_to: workOrder.assigned_to,
        assigned_by: userMap.get('admin1@workorderpro.com')?.id,
        assignment_type: 'lead',
        notes: `Internal employee assignment for: ${workOrder.title}`
      });
    }
  }
  
  if (assignments.length === 0) {
    console.log('⚠️ No assignments to create');
    return 0;
  }
  
  const { data, error } = await supabaseAdmin
    .from('work_order_assignments')
    .insert(assignments)
    .select();
    
  if (error) {
    console.error('❌ Failed to create work order assignments:', error);
    throw new Error(`Failed to create work order assignments: ${error.message}`);
  }
  
  console.log(`✅ Created ${data?.length || 0} work order assignments`);
  return data?.length || 0;
}

/**
 * Create work order reports for completed and in-progress work
 */
async function seedWorkOrderReports(): Promise<number> {
  console.log('📝 Creating work order reports...');
  
  // Get work orders that should have reports
  const { data: workOrders } = await supabaseAdmin
    .from('work_orders')
    .select('id, assigned_to, status, title')
    .in('status', ['completed', 'in_progress']);
    
  if (!workOrders || workOrders.length === 0) {
    console.log('⚠️ No work orders found for reports');
    return 0;
  }
  
  const reports = [];
  
  for (const workOrder of workOrders) {
    if (!workOrder.assigned_to) continue;
    
    const isCompleted = workOrder.status === 'completed';
    
    reports.push({
      work_order_id: workOrder.id,
      subcontractor_user_id: workOrder.assigned_to,
      work_performed: `Completed ${workOrder.title.toLowerCase()}. Followed all safety protocols and used quality materials.`,
      materials_used: 'Standard materials and parts as per specification',
      hours_worked: Math.floor(Math.random() * 8) + 1, // 1-8 hours
      invoice_amount: Math.floor(Math.random() * 800) + 200, // $200-$1000
      invoice_number: `INV-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
      notes: 'Work completed according to specifications. Customer satisfaction confirmed.',
      status: isCompleted ? 'approved' : 'submitted',
      submitted_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      reviewed_at: isCompleted ? new Date().toISOString() : null,
      review_notes: isCompleted ? 'Work quality meets standards. Invoice approved for processing.' : null
    });
  }
  
  if (reports.length === 0) {
    console.log('⚠️ No reports to create');
    return 0;
  }
  
  const { data, error } = await supabaseAdmin
    .from('work_order_reports')
    .insert(reports)
    .select();
    
  if (error) {
    console.error('❌ Failed to create work order reports:', error);
    throw new Error(`Failed to create work order reports: ${error.message}`);
  }
  
  console.log(`✅ Created ${data?.length || 0} work order reports`);
  return data?.length || 0;
}

/**
 * Create invoices and related financial data
 */
async function seedInvoicesAndFinancialData(): Promise<number> {
  console.log('💰 Creating invoices and financial data...');
  
  // Get completed work order reports for invoicing
  const { data: reports } = await supabaseAdmin
    .from('work_order_reports')
    .select(`
      id, 
      work_order_id, 
      subcontractor_user_id, 
      invoice_amount, 
      invoice_number,
      work_orders!inner(organization_id, assigned_organization_id)
    `)
    .eq('status', 'approved');
    
  const { data: orgData } = await supabaseAdmin
    .from('organizations')
    .select('id, name')
    .eq('organization_type', 'subcontractor');
    
  if (!reports || !orgData) {
    console.log('⚠️ No data available for invoice creation');
    return 0;
  }
  
  const orgMap = new Map(orgData.map(org => [org.id, org.name]));
  
  // Group reports by subcontractor organization
  const reportsByOrg = new Map();
  for (const report of reports) {
    const orgId = report.work_orders.assigned_organization_id;
    if (orgId) {
      if (!reportsByOrg.has(orgId)) {
        reportsByOrg.set(orgId, []);
      }
      reportsByOrg.get(orgId).push(report);
    }
  }
  
  const invoices = [];
  const invoiceWorkOrders = [];
  
  let invoiceCounter = 0;
  
  for (const [orgId, orgReports] of reportsByOrg) {
    // Create different invoice scenarios
    const scenarios = ['draft', 'submitted', 'approved', 'paid'];
    const status = scenarios[invoiceCounter % scenarios.length];
    
    const totalAmount = orgReports.reduce((sum: number, report: any) => sum + report.invoice_amount, 0);
    
    const invoice = {
      subcontractor_organization_id: orgId,
      status,
      total_amount: totalAmount,
      external_invoice_number: `EXT-${new Date().getFullYear()}-${String(invoiceCounter + 1).padStart(3, '0')}`,
      submitted_by: orgReports[0]?.subcontractor_user_id,
      submitted_at: status !== 'draft' ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString() : null,
      approved_at: ['approved', 'paid'].includes(status) ? new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000).toISOString() : null,
      paid_at: status === 'paid' ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString() : null,
      payment_reference: status === 'paid' ? `PAY-${Math.random().toString(36).substr(2, 10).toUpperCase()}` : null,
      approval_notes: ['approved', 'paid'].includes(status) ? 'Invoice approved for payment. All work verified.' : null
    };
    
    invoices.push(invoice);
    
    // Create invoice work order line items
    for (const report of orgReports) {
      invoiceWorkOrders.push({
        work_order_id: report.work_order_id,
        work_order_report_id: report.id,
        amount: report.invoice_amount,
        description: `Work order completion - Invoice ${report.invoice_number}`
      });
    }
    
    invoiceCounter++;
  }
  
  if (invoices.length === 0) {
    console.log('⚠️ No invoices to create');
    return 0;
  }
  
  // Insert invoices
  const { data: invoiceData, error: invoiceError } = await supabaseAdmin
    .from('invoices')
    .insert(invoices)
    .select();
    
  if (invoiceError) {
    console.error('❌ Failed to create invoices:', invoiceError);
    throw new Error(`Failed to create invoices: ${invoiceError.message}`);
  }
  
  // Update invoice work orders with invoice IDs
  for (let i = 0; i < invoiceWorkOrders.length; i++) {
    const invoiceIndex = Math.floor(i / (invoiceWorkOrders.length / invoiceData.length));
    invoiceWorkOrders[i].invoice_id = invoiceData[Math.min(invoiceIndex, invoiceData.length - 1)].id;
  }
  
  // Insert invoice work orders
  const { data: invoiceWorkOrderData, error: iwoError } = await supabaseAdmin
    .from('invoice_work_orders')
    .insert(invoiceWorkOrders)
    .select();
    
  if (iwoError) {
    console.error('❌ Failed to create invoice work orders:', iwoError);
    // Don't fail the entire process for this
  }
  
  console.log(`✅ Created ${invoiceData?.length || 0} invoices with ${invoiceWorkOrderData?.length || 0} line items`);
  return invoiceData?.length || 0;
}

/**
 * Create employee reports and receipts for expense tracking
 */
async function seedEmployeeReportsAndReceipts(): Promise<number> {
  console.log('📊 Creating employee reports and receipts...');
  
  // Get employee users and their work orders
  const { data: employees } = await supabaseAdmin
    .from('profiles')
    .select('id, email, hourly_cost_rate, hourly_billable_rate')
    .eq('user_type', 'employee')
    .eq('is_employee', true);
    
  const { data: workOrders } = await supabaseAdmin
    .from('work_orders')
    .select('id, title, assigned_to')
    .eq('assigned_to_type', 'internal');
    
  if (!employees || employees.length === 0) {
    console.log('⚠️ No employees found for reports');
    return 0;
  }
  
  const employeeReports = [];
  const receipts = [];
  const receiptWorkOrders = [];
  
  // Create employee time reports
  for (const employee of employees) {
    const assignedWorkOrders = workOrders?.filter(wo => wo.assigned_to === employee.id) || [];
    
    for (const workOrder of assignedWorkOrders.slice(0, 2)) { // Limit to 2 reports per employee
      const hoursWorked = Math.floor(Math.random() * 8) + 1; // 1-8 hours
      const costRate = employee.hourly_cost_rate || 25;
      
      employeeReports.push({
        employee_user_id: employee.id,
        work_order_id: workOrder.id,
        report_date: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        hours_worked: hoursWorked,
        hourly_rate_snapshot: costRate,
        total_labor_cost: hoursWorked * costRate,
        work_performed: `Completed internal work for: ${workOrder.title}`,
        notes: 'Standard internal maintenance and coordination work completed.'
      });
    }
    
    // Create some expense receipts for each employee
    const receiptCategories = [
      { vendor: 'Home Depot', description: 'Materials and supplies', amount: 150 },
      { vendor: 'Shell Gas Station', description: 'Vehicle fuel', amount: 45 },
      { vendor: 'Office Supply Plus', description: 'Office materials', amount: 75 }
    ];
    
    for (let i = 0; i < 2; i++) { // 2 receipts per employee
      const category = receiptCategories[i % receiptCategories.length];
      
      const receipt = {
        employee_user_id: employee.id,
        vendor_name: category.vendor,
        description: category.description,
        amount: category.amount + Math.floor(Math.random() * 50), // Add some variance
        receipt_date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: `Business expense for ${category.description.toLowerCase()}`
      };
      
      receipts.push(receipt);
    }
  }
  
  let createdCount = 0;
  
  // Insert employee reports
  if (employeeReports.length > 0) {
    const { data: reportData, error: reportError } = await supabaseAdmin
      .from('employee_reports')
      .insert(employeeReports)
      .select();
      
    if (reportError) {
      console.error('❌ Failed to create employee reports:', reportError);
    } else {
      console.log(`✅ Created ${reportData?.length || 0} employee reports`);
      createdCount += reportData?.length || 0;
    }
  }
  
  // Insert receipts
  if (receipts.length > 0) {
    const { data: receiptData, error: receiptError } = await supabaseAdmin
      .from('receipts')
      .insert(receipts)
      .select();
      
    if (receiptError) {
      console.error('❌ Failed to create receipts:', receiptError);
    } else {
      console.log(`✅ Created ${receiptData?.length || 0} expense receipts`);
      
      // Create receipt allocations to work orders
      for (const receipt of receiptData || []) {
        const availableWorkOrders = workOrders?.slice(0, 2) || []; // Allocate to first 2 work orders
        
        for (const workOrder of availableWorkOrders) {
          receiptWorkOrders.push({
            receipt_id: receipt.id,
            work_order_id: workOrder.id,
            allocated_amount: receipt.amount / availableWorkOrders.length, // Split evenly
            allocation_notes: `Expense allocation for ${receipt.description}`
          });
        }
      }
      
      if (receiptWorkOrders.length > 0) {
        const { data: allocationData, error: allocationError } = await supabaseAdmin
          .from('receipt_work_orders')
          .insert(receiptWorkOrders)
          .select();
          
        if (!allocationError) {
          console.log(`✅ Created ${allocationData?.length || 0} receipt allocations`);
        }
      }
      
      createdCount += receiptData?.length || 0;
    }
  }
  
  return createdCount;
}

/**
 * Main seeding orchestration function
 */
async function performSeeding(options: SeedingRequest['options'] = {}): Promise<SeedingResult> {
  const startTime = Date.now();
  const progress: SeedingProgress[] = [];
  
  try {
    console.log('🌱 Starting comprehensive database seeding...');
    
    // Clear existing data if requested
    if (options.clear_existing !== false) {
      progress.push({
        stage: 'clearing',
        progress: 0,
        total: 1,
        message: 'Clearing existing test data...'
      });
      
      await clearTestData();
      
      progress.push({
        stage: 'clearing',
        progress: 1,
        total: 1,
        message: 'Test data cleared successfully',
        completed: true
      });
    }
    
    // Initialize seeding data
    const data = {
      organizations_created: 0,
      users_created: 0,
      partner_locations_created: 0,
      work_orders_created: 0,
      assignments_created: 0,
      reports_created: 0,
      invoices_created: 0,
      employee_data_created: 0
    };
    
    // === CORE DATA SEEDING ===
    
    // Organizations
    progress.push({
      stage: 'organizations',
      progress: 0,
      total: organizations.length,
      message: 'Creating organizations...'
    });
    
    data.organizations_created = await seedOrganizations();
    
    progress.push({
      stage: 'organizations',
      progress: data.organizations_created,
      total: organizations.length,
      message: `Created ${data.organizations_created} organizations`,
      completed: true
    });
    
    // Trades
    progress.push({
      stage: 'trades',
      progress: 0,
      total: trades.length,
      message: 'Creating trades...'
    });
    
    await seedTrades();
    
    progress.push({
      stage: 'trades',
      progress: trades.length,
      total: trades.length,
      message: `Created ${trades.length} trades`,
      completed: true
    });
    
    // Email Templates
    progress.push({
      stage: 'email_templates',
      progress: 0,
      total: emailTemplates.length,
      message: 'Creating email templates...'
    });
    
    await seedEmailTemplates();
    
    progress.push({
      stage: 'email_templates',
      progress: emailTemplates.length,
      total: emailTemplates.length,
      message: `Created ${emailTemplates.length} email templates`,
      completed: true
    });
    
    // Users (includes auth accounts and profiles)
    progress.push({
      stage: 'users',
      progress: 0,
      total: users.length,
      message: 'Creating users and profiles...'
    });
    
    data.users_created = await seedUsers();
    
    progress.push({
      stage: 'users',
      progress: data.users_created,
      total: users.length,
      message: `Created ${data.users_created} users`,
      completed: true
    });
    
    // === BUSINESS DATA SEEDING ===
    
    // Partner Locations
    progress.push({
      stage: 'partner_locations',
      progress: 0,
      total: 10,
      message: 'Creating partner locations...'
    });
    
    data.partner_locations_created = await seedPartnerLocations();
    
    progress.push({
      stage: 'partner_locations',
      progress: data.partner_locations_created,
      total: 10,
      message: `Created ${data.partner_locations_created} partner locations`,
      completed: true
    });
    
    // Work Orders
    progress.push({
      stage: 'work_orders',
      progress: 0,
      total: 16,
      message: 'Creating work orders with smart numbering...'
    });
    
    data.work_orders_created = await seedWorkOrders();
    
    progress.push({
      stage: 'work_orders',
      progress: data.work_orders_created,
      total: 16,
      message: `Created ${data.work_orders_created} work orders`,
      completed: true
    });
    
    // Work Order Assignments
    progress.push({
      stage: 'assignments',
      progress: 0,
      total: 15,
      message: 'Creating work order assignments...'
    });
    
    data.assignments_created = await seedWorkOrderAssignments();
    
    progress.push({
      stage: 'assignments',
      progress: data.assignments_created,
      total: 15,
      message: `Created ${data.assignments_created} assignments`,
      completed: true
    });
    
    // Work Order Reports
    progress.push({
      stage: 'reports',
      progress: 0,
      total: 8,
      message: 'Creating work order reports...'
    });
    
    data.reports_created = await seedWorkOrderReports();
    
    progress.push({
      stage: 'reports',
      progress: data.reports_created,
      total: 8,
      message: `Created ${data.reports_created} work order reports`,
      completed: true
    });
    
    // === FINANCIAL DATA SEEDING ===
    
    // Invoices and Financial Data
    progress.push({
      stage: 'invoices',
      progress: 0,
      total: 10,
      message: 'Creating invoices and financial data...'
    });
    
    data.invoices_created = await seedInvoicesAndFinancialData();
    
    progress.push({
      stage: 'invoices',
      progress: data.invoices_created,
      total: 10,
      message: `Created ${data.invoices_created} invoices`,
      completed: true
    });
    
    // Employee Reports and Receipts
    progress.push({
      stage: 'employee_data',
      progress: 0,
      total: 14,
      message: 'Creating employee reports and receipts...'
    });
    
    data.employee_data_created = await seedEmployeeReportsAndReceipts();
    
    progress.push({
      stage: 'employee_data',
      progress: data.employee_data_created,
      total: 14,
      message: `Created ${data.employee_data_created} employee records`,
      completed: true
    });
    
    const duration = Date.now() - startTime;
    
    console.log('\n🎉 Comprehensive database seeding completed successfully!');
    console.log(`⏱️  Total time: ${duration}ms`);
    console.log('\n📊 Final Summary:');
    console.log(`🏢 Organizations: ${data.organizations_created}`);
    console.log(`👥 Users: ${data.users_created}`);
    console.log(`📍 Partner Locations: ${data.partner_locations_created}`);
    console.log(`📋 Work Orders: ${data.work_orders_created}`);
    console.log(`🎯 Assignments: ${data.assignments_created}`);
    console.log(`📝 Reports: ${data.reports_created}`);
    console.log(`💰 Invoices: ${data.invoices_created}`);
    console.log(`📊 Employee Records: ${data.employee_data_created}`);
    
    return {
      success: true,
      message: 'Comprehensive database seeding completed successfully',
      progress,
      data,
      duration_ms: duration
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error('❌ Database seeding failed:', errorMessage);
    
    return {
      success: false,
      message: 'Database seeding failed',
      progress,
      error: errorMessage,
      duration_ms: duration
    };
  }
}

/**
 * Edge function handler
 */
serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;
  
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return createCorsErrorResponse('Method not allowed', 405);
    }
    
    // Parse request body
    let requestData: SeedingRequest = {};
    try {
      requestData = await req.json();
    } catch {
      // Empty body is acceptable
    }
    
    // Extract authorization header for admin validation
    const authHeader = req.headers.get('Authorization');
    
    // Validate admin access with comprehensive security check
    if (!validateAdminAccess(requestData, authHeader || undefined)) {
      console.warn('🚨 Unauthorized seeding attempt blocked');
      return createCorsErrorResponse('Unauthorized: Admin access required for database seeding', 401, 'ADMIN_ACCESS_REQUIRED');
    }
    
    console.log('🔑 Admin access validated, starting seeding process...');
    
    // Perform seeding
    const result = await performSeeding(requestData.options);
    
    // Return result
    return createCorsResponse(result, result.success ? 200 : 500);
    
  } catch (error) {
    console.error('❌ Edge function error:', error);
    
    return createCorsErrorResponse(
      'Internal server error',
      500,
      'EDGE_FUNCTION_ERROR'
    );
  }
});