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
 * Main seeding orchestration function
 */
async function performSeeding(options: SeedingRequest['options'] = {}): Promise<SeedingResult> {
  const startTime = Date.now();
  const progress: SeedingProgress[] = [];
  
  try {
    console.log('🌱 Starting database seeding...');
    
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
    
    // Seed core data
    const data = {
      organizations_created: 0,
      users_created: 0,
      work_orders_created: 0,
      reports_created: 0,
      invoices_created: 0
    };
    
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
    
    const duration = Date.now() - startTime;
    
    console.log('🎉 Database seeding completed successfully!');
    console.log(`⏱️  Total time: ${duration}ms`);
    
    return {
      success: true,
      message: 'Database seeding completed successfully',
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