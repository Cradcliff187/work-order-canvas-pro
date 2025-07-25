
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCors, createCorsResponse, createCorsErrorResponse } from "../_shared/cors.ts";

// Organization validation utilities
type UserType = 'admin' | 'partner' | 'subcontractor' | 'employee';
type OrganizationType = 'partner' | 'subcontractor' | 'internal';

function getUserTypeOrganizationTypes(userType: UserType): OrganizationType[] {
  switch (userType) {
    case 'partner':
      return ['partner'];
    case 'subcontractor':
      return ['subcontractor'];
    case 'employee':
      return ['internal'];
    case 'admin':
      return ['partner', 'subcontractor', 'internal']; // Admins can see all
    default:
      return [];
  }
}

function getUserExpectedOrganizationType(userType: UserType): OrganizationType | null {
  switch (userType) {
    case 'partner':
      return 'partner';
    case 'subcontractor':
      return 'subcontractor';
    case 'employee':
      return 'internal';
    case 'admin':
      return null; // Admins don't have a specific org type
    default:
      return null;
  }
}

function validateUserOrganizationType(userType: UserType, organizationType: OrganizationType): boolean {
  const allowedTypes = getUserTypeOrganizationTypes(userType);
  return allowedTypes.includes(organizationType);
}

async function getOrganizationsForAutoAssignment(supabaseAdmin: any, userType: UserType): Promise<any[]> {
  const expectedOrgType = getUserExpectedOrganizationType(userType);
  if (!expectedOrgType) {
    return [];
  }

  const { data: organizations, error } = await supabaseAdmin
    .from('organizations')
    .select('*')
    .eq('organization_type', expectedOrgType)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch organizations for auto-assignment:', error);
    return [];
  }

  return organizations || [];
}

async function validateAndProcessOrganizations(
  supabaseAdmin: any, 
  userType: UserType, 
  organizationIds: string[]
): Promise<{ validOrganizations: any[], errors: string[] }> {
  const validOrganizations = [];
  const errors = [];

  // Fetch all provided organizations
  const { data: organizations, error } = await supabaseAdmin
    .from('organizations')
    .select('*')
    .in('id', organizationIds);

  if (error) {
    throw new Error(`Failed to fetch organizations: ${error.message}`);
  }

  // Validate each organization
  for (const org of organizations || []) {
    if (!validateUserOrganizationType(userType, org.organization_type)) {
      errors.push(`User type '${userType}' cannot belong to organization type '${org.organization_type}' (${org.name})`);
    } else {
      validOrganizations.push(org);
    }
  }

  return { validOrganizations, errors };
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;
  
  const startTime = Date.now();
  const requestId = crypto.randomUUID().slice(0, 8);
  
  console.log(`[${requestId}] 🚀 Starting user creation request at ${new Date().toISOString()}`);
  
  try {
    // Health check endpoint
    if (req.url.includes('/health')) {
      return createCorsResponse({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        services: ['supabase', 'auth', 'database']
      });
    }

    console.log(`[${requestId}] 🔍 Verifying environment variables...`);
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      console.error(`[${requestId}] ❌ Missing environment variables:`, {
        hasUrl: !!supabaseUrl,
        hasServiceRole: !!serviceRoleKey,
        hasAnonKey: !!anonKey
      });
      return createCorsErrorResponse('Server configuration error', 500);
    }

    console.log(`[${requestId}] ✅ Environment variables verified`);

    // Create authenticated Supabase client for user verification
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error(`[${requestId}] ❌ Missing Authorization header`);
      return createCorsErrorResponse('Missing authorization', 401);
    }
    
    const supabaseClient = createClient(
      supabaseUrl,
      anonKey,
      { global: { headers: { Authorization: authHeader } } }
    );

    console.log(`[${requestId}] 🔐 Verifying admin authentication...`);
    
    // Verify admin user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error(`[${requestId}] ❌ Authentication failed:`, authError);
      return createCorsErrorResponse('Unauthorized', 401);
    }

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('user_type')
      .eq('user_id', user.id)
      .single();

    if (profile?.user_type !== 'admin') {
      console.error(`[${requestId}] ❌ Non-admin user attempted access:`, { userId: user.id, userType: profile?.user_type });
      return createCorsErrorResponse('Only admins can create users', 403);
    }

    console.log(`[${requestId}] ✅ Admin authentication verified for user:`, user.id);

    // Get request body
    const { userData } = await req.json();

    console.log(`[${requestId}] 📝 Processing user creation request:`, { 
      email: userData.email, 
      userType: userData.user_type,
      hasOrganizations: !!(userData.organization_ids?.length)
    });

    // Validate required fields
    if (!userData.email || !userData.first_name || !userData.last_name || !userData.user_type) {
      console.error(`[${requestId}] ❌ Missing required fields:`, {
        hasEmail: !!userData.email,
        hasFirstName: !!userData.first_name,
        hasLastName: !!userData.last_name,
        hasUserType: !!userData.user_type
      });
      return createCorsErrorResponse('Missing required fields', 400);
    }

    // Create admin client with service role
    console.log(`[${requestId}] 🔧 Creating admin client...`);
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Test database connection
    console.log(`[${requestId}] 🔍 Testing database connection...`);
    const { data: connectionTest, error: connectionError } = await supabaseAdmin
      .from('profiles')
      .select('count')
      .limit(1);

    if (connectionError) {
      console.error(`[${requestId}] ❌ Database connection failed:`, connectionError);
      return createCorsErrorResponse('Database connection failed', 500);
    }

    console.log(`[${requestId}] ✅ Database connection verified`);

    // Generate a secure temporary password for initial creation
    const temporaryPassword = crypto.randomUUID() + crypto.randomUUID();

    console.log(`[${requestId}] 👤 Creating auth user...`);

    // Create auth user with retry logic
    let authUser, createError;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      const result = await supabaseAdmin.auth.admin.createUser({
        email: userData.email,
        password: temporaryPassword,
        email_confirm: true, // Enable Supabase auth confirmation email
        app_metadata: {  // Security data (admin-only)
          user_type: userData.user_type
        },
        user_metadata: {  // Non-security data (user-editable)
          first_name: userData.first_name,
          last_name: userData.last_name
        }
      });

      authUser = result.data;
      createError = result.error;

      if (!createError) break;

      retryCount++;
      console.warn(`[${requestId}] ⚠️ Auth user creation attempt ${retryCount} failed:`, createError);
      
      if (retryCount < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
      }
    }

    if (createError) {
      console.error(`[${requestId}] ❌ Auth user creation failed after ${maxRetries} attempts:`, createError);
      throw createError;
    }

    console.log(`[${requestId}] ✅ Auth user created:`, authUser.user.id);

    // Manually create profile since we can't use triggers on auth.users
    console.log(`[${requestId}] 📋 Creating user profile...`);
    
    const { data: newProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        user_id: authUser.user.id,
        email: userData.email,
        first_name: userData.first_name,
        last_name: userData.last_name,
        user_type: userData.user_type,
        phone: userData.phone,
        is_employee: userData.user_type === 'employee',
      })
      .select()
      .single();

    if (profileError) {
      console.error(`[${requestId}] ❌ Profile creation failed:`, {
        error: profileError,
        userInfo: {
          user_id: authUser.user.id,
          email: userData.email,
          user_type: userData.user_type
        }
      });
      
      // Clean up auth user if profile creation fails
      console.log(`[${requestId}] 🧹 Cleaning up auth user due to profile creation failure...`);
      try {
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
        console.log(`[${requestId}] ✅ Auth user cleanup completed`);
      } catch (cleanupError) {
        console.error(`[${requestId}] ❌ Failed to cleanup auth user:`, cleanupError);
      }
      
      throw new Error(`Profile creation failed: ${profileError.message}`);
    }

    console.log(`[${requestId}] ✅ Profile created:`, newProfile.id);

    // Send welcome email using the send-email function
    try {
      console.log('Sending welcome email to:', userData.email);
      const { data: emailResult, error: emailError } = await supabaseAdmin.functions.invoke('send-email', {
        body: {
          template_name: 'welcome_email',
          test_mode: false,
          custom_data: {
            user_name: `${userData.first_name} ${userData.last_name}`,
            user_email: userData.email,
            first_name: userData.first_name,
            last_name: userData.last_name,
            user_type: userData.user_type
          }
        }
      });

      if (emailError) {
        console.error('Welcome email failed:', emailError);
        // Don't throw error - user creation should succeed even if email fails
      } else {
        console.log('Welcome email sent successfully:', emailResult);
      }
    } catch (emailErr) {
      console.error('Welcome email error:', emailErr);
      // Don't throw error - user creation should succeed even if email fails
    }

    // Handle organization relationships with validation and auto-assignment
    let finalOrganizationIds: string[] = [];
    let autoAssignedOrganizations: any[] = [];
    
    if (userData.organization_ids && userData.organization_ids.length > 0) {
      // Validate provided organizations
      console.log('Validating provided organizations:', userData.organization_ids);
      const { validOrganizations, errors } = await validateAndProcessOrganizations(
        supabaseAdmin,
        userData.user_type,
        userData.organization_ids
      );

      if (errors.length > 0) {
        console.error('Organization validation failed:', errors);
        throw new Error(`Organization validation failed: ${errors.join(', ')}`);
      }

      finalOrganizationIds = validOrganizations.map(org => org.id);
      console.log('Validated organizations:', validOrganizations.map(org => org.name));
    } else {
      // Auto-assign organizations for partner, subcontractor, and employee users
      if (userData.user_type !== 'admin') {
        console.log('Auto-assigning organizations for user type:', userData.user_type);
        const availableOrganizations = await getOrganizationsForAutoAssignment(supabaseAdmin, userData.user_type);
        
        if (availableOrganizations.length === 0) {
          const expectedType = getUserExpectedOrganizationType(userData.user_type);
          throw new Error(`No ${expectedType} organizations available for auto-assignment. Please create a ${expectedType} organization first.`);
        }
        
        // Auto-assign to the first available organization
        const selectedOrg = availableOrganizations[0];
        finalOrganizationIds = [selectedOrg.id];
        autoAssignedOrganizations = [selectedOrg];
        console.log('Auto-assigned to organization:', selectedOrg.name);
      }
    }

    // Create organization relationships
    if (finalOrganizationIds.length > 0) {
      console.log(`[${requestId}] 🏢 Creating organization relationships...`);
      console.log(`[${requestId}] Organization IDs:`, finalOrganizationIds);
      
      const orgRelationships = finalOrganizationIds.map((orgId: string) => ({
        user_id: newProfile.id,
        organization_id: orgId,
      }));

      console.log(`[${requestId}] Inserting organization relationships:`, orgRelationships);

      // Verify user_organizations table exists
      const { data: tableCheck, error: tableError } = await supabaseAdmin
        .from('user_organizations')
        .select('count')
        .limit(1);

      if (tableError) {
        console.error(`[${requestId}] ❌ user_organizations table check failed:`, {
          error: tableError,
          message: tableError.message,
          details: tableError.details,
          hint: tableError.hint,
          code: tableError.code
        });
        throw new Error(`Database table verification failed: ${tableError.message}`);
      }

      console.log(`[${requestId}] ✅ user_organizations table verified`);

      const { data: insertedRelationships, error: orgError } = await supabaseAdmin
        .from('user_organizations')
        .insert(orgRelationships)
        .select();

      if (orgError) {
        console.error(`[${requestId}] ❌ Organization relationship creation failed:`, {
          error: orgError,
          message: orgError.message,
          details: orgError.details,
          hint: orgError.hint,
          code: orgError.code,
          orgRelationships: orgRelationships
        });
        
        // For auto-assignment, this is more critical
        if (autoAssignedOrganizations.length > 0) {
          throw new Error(`Failed to assign user to organization: ${orgError.message}`);
        }
      } else {
        console.log(`[${requestId}] ✅ Organization relationships created successfully:`, insertedRelationships);
      }
    }

    // Return success response
    const endTime = Date.now();
    const duration = endTime - startTime;
    const message = 'User created successfully. They will receive a welcome email with login instructions.';

    console.log(`[${requestId}] ✅ User creation process completed in ${duration}ms:`, { 
      userId: newProfile.id, 
      email: userData.email,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });

    return createCorsResponse({
      success: true,
      user: newProfile,
      message,
      meta: {
        requestId,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.error(`[${requestId}] ❌ Create user error after ${duration}ms:`, {
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });
    
    return createCorsErrorResponse(
      error.message || 'Internal error', 
      400, 
      {
        requestId,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      }
    );
  }
});
