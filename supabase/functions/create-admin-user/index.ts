
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCors, createCorsResponse, createCorsErrorResponse } from "../_shared/cors.ts";

// Organization validation utilities
type UserType = 'admin' | 'partner' | 'subcontractor' | 'employee';
type OrganizationType = 'partner' | 'subcontractor' | 'internal';
type OrganizationRole = 'admin' | 'manager' | 'employee' | 'member';

// Interface for the expected request payload
interface CreateUserRequest {
  userData: {
    email: string;
    first_name: string;
    last_name: string;
    phone?: string;
    organization_id: string;  // Single org selected by admin
    organization_role: OrganizationRole;  // Role selected by admin
  };
}

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
      organizationId: userData.organization_id,
      organizationRole: userData.organization_role,
      firstName: userData.first_name,
      lastName: userData.last_name,
      phone: userData.phone,
      fullUserData: userData
    });

    // Validate required fields - using new interface
    if (!userData.email || !userData.first_name || !userData.last_name || !userData.organization_id || !userData.organization_role) {
      console.error(`[${requestId}] ❌ Missing required fields:`, {
        hasEmail: !!userData.email,
        hasFirstName: !!userData.first_name,
        hasLastName: !!userData.last_name,
        hasOrganizationId: !!userData.organization_id,
        hasOrganizationRole: !!userData.organization_role
      });
      return createCorsErrorResponse('Missing required fields: email, first_name, last_name, organization_id, and organization_role are required', 400);
    }

    // Create admin client with service role
    console.log(`[${requestId}] 🔧 Creating admin client...`);
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Test database connectivity with multiple tables
    console.log(`[${requestId}] 🔍 Testing database connectivity...`);
    try {
      // Test basic connection
      const { data: profileTest, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('count')
        .limit(1);

      if (profileError) {
        console.error(`[${requestId}] ❌ Profiles table access failed:`, profileError);
        return createCorsErrorResponse('Database profiles access error: ' + profileError.message, 500);
      }

      // Test organization_members table specifically
      const { data: orgMemberTest, error: orgMemberError } = await supabaseAdmin
        .from('organization_members')
        .select('id')
        .limit(1);

      if (orgMemberError) {
        console.error(`[${requestId}] ❌ organization_members table access failed:`, orgMemberError);
        return createCorsErrorResponse('Database organization_members access error: ' + orgMemberError.message, 500);
      }

      // Test organizations table
      const { data: orgTest, error: orgError } = await supabaseAdmin
        .from('organizations')
        .select('id')
        .limit(1);

      if (orgError) {
        console.error(`[${requestId}] ❌ Organizations table access failed:`, orgError);
        return createCorsErrorResponse('Database organizations access error: ' + orgError.message, 500);
      }

      console.log(`[${requestId}] ✅ Database connectivity verified for all required tables`);
    } catch (dbError) {
      console.error(`[${requestId}] ❌ Critical database connectivity error:`, dbError);
      return createCorsErrorResponse('Critical database connectivity error', 500);
    }

    // Generate a secure temporary password for initial creation
    const temporaryPassword = crypto.randomUUID() + crypto.randomUUID();

    console.log(`[${requestId}] 👤 Creating auth user...`);

    // Create auth user with enhanced error handling
    let authUser;
    try {
      // First check if user already exists
      const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) {
        console.warn(`[${requestId}] ⚠️ Could not check existing users:`, listError);
      } else {
        const existingUser = existingUsers.users?.find(u => u.email === userData.email);
        if (existingUser) {
          console.error(`[${requestId}] ❌ User already exists with email:`, userData.email);
          throw new Error(`User with email ${userData.email} already exists`);
        }
      }

      // Create the auth user with proper metadata for the trigger
      const authUserPayload = {
        email: userData.email,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: {
          first_name: userData.first_name,
          last_name: userData.last_name,
        },
        app_metadata: {
          organization_id: userData.organization_id,
          organization_role: userData.organization_role,
        }
      };

      console.log(`[${requestId}] 👤 DEBUG - Auth user creation payload:`, {
        email: authUserPayload.email,
        hasPassword: !!authUserPayload.password,
        emailConfirm: authUserPayload.email_confirm,
        userMetadata: authUserPayload.user_metadata,
        appMetadata: authUserPayload.app_metadata,
        organizationId: authUserPayload.app_metadata.organization_id,
        organizationRole: authUserPayload.app_metadata.organization_role
      });

      const result = await supabaseAdmin.auth.admin.createUser(authUserPayload);

      if (result.error) {
        console.error(`[${requestId}] ❌ Auth creation error details:`, {
          error: result.error,
          message: result.error.message,
          code: result.error.code || result.error.status,
          details: result.error
        });
        throw new Error(`Auth user creation failed: ${result.error.message}`);
      }

      if (!result.data?.user) {
        throw new Error('No user data returned from auth creation');
      }

      authUser = result.data;
      console.log(`[${requestId}] ✅ Auth user created successfully:`, authUser.user.id);
      
    } catch (error) {
      console.error(`[${requestId}] ❌ Auth user creation failed:`, {
        error: error.message,
        type: error.constructor.name,
        stack: error.stack
      });
      throw new Error(`Failed to create authentication user: ${error.message}`);
    }

    console.log(`[${requestId}] ✅ Auth user created:`, authUser.user.id);

    // Verify the trigger created the profile with proper metadata
    console.log(`[${requestId}] 🔍 Verifying trigger created profile...`);

    // Retry logic to wait for trigger to complete
    let newProfile = null;
    let profileError = null;
    let retryCount = 0;
    const maxRetries = 5;
    const retryDelay = 500; // 500ms

    while (retryCount < maxRetries) {
        const { data, error } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('user_id', authUser.user.id)
            .single();
        
        if (data) {
            newProfile = data;
            profileError = null;
            console.log(`[${requestId}] ✅ Profile found on attempt ${retryCount + 1}`);
            break;
        }
        
        profileError = error;
        retryCount++;
        
        if (retryCount < maxRetries) {
            console.log(`[${requestId}] ⏳ Profile not found yet, retrying in ${retryDelay}ms... (attempt ${retryCount}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
    }

    console.log(`[${requestId}] 🔍 DEBUG - Profile verification result:`, {
        profileFound: !!newProfile,
        profileError: profileError,
        profileData: newProfile,
        profileUserType: newProfile?.user_type,
        profileEmail: newProfile?.email,
        expectedUserType: userData.user_type,
        userTypeMatches: newProfile?.user_type === userData.user_type,
        retriesNeeded: retryCount
    });
    
    if (profileError || !newProfile) {
      console.error(`[${requestId}] ❌ Profile was not created by trigger:`, profileError);
      
      // Clean up auth user if profile creation fails
      console.log(`[${requestId}] 🧹 Cleaning up auth user due to profile creation failure...`);
      try {
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
        console.log(`[${requestId}] ✅ Auth user cleanup completed`);
      } catch (cleanupError) {
        console.error(`[${requestId}] ❌ Failed to cleanup auth user:`, cleanupError);
      }
      
      throw new Error('Profile was not created by database trigger');
    }
    
    console.log(`[${requestId}] ✅ Profile created by trigger:`, newProfile.id);
    
    // Update the profile with additional fields that the trigger doesn't set
    console.log(`[${requestId}] 📝 Updating profile with additional fields...`);
    
    const updateFields: any = {};
    if (userData.phone) updateFields.phone = userData.phone;
    // Remove legacy user_type handling since we're using organization-based permissions now
    
    if (Object.keys(updateFields).length > 0) {
      const { data: updatedProfile, error: updateError } = await supabaseAdmin
        .from('profiles')
        .update(updateFields)
        .eq('id', newProfile.id)
        .select()
        .single();
      
      if (updateError) {
        console.error(`[${requestId}] ❌ Profile update failed:`, updateError);
        // Don't throw error here - profile exists, just missing some optional fields
      } else {
        newProfile = updatedProfile;
        console.log(`[${requestId}] ✅ Profile updated with additional fields`);
      }
    }

    // Generate confirmation link and send password setup email
    try {
      console.log(`[${requestId}] 📧 Generating confirmation link for password setup...`);
      
      // Generate confirmation link with redirect to /reset-password
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'signup',
        email: userData.email,
        options: {
          redirectTo: `${Deno.env.get('PUBLIC_SITE_URL')}/reset-password`
        }
      });

      if (linkError) {
        console.error(`[${requestId}] ❌ Failed to generate confirmation link:`, linkError);
        throw new Error(`Failed to generate confirmation link: ${linkError.message}`);
      }

      console.log(`[${requestId}] ✅ Confirmation link generated successfully`);

      // Send password setup email using auth_confirmation template
      console.log(`[${requestId}] 📧 Sending password setup email to:`, userData.email);
      const { data: emailResult, error: emailError } = await supabaseAdmin.functions.invoke('send-email', {
        body: {
          template_name: 'auth_confirmation',
          test_mode: false,
          custom_data: {
            user_name: `${userData.first_name} ${userData.last_name}`,
            user_email: userData.email,
            first_name: userData.first_name,
            last_name: userData.last_name,
            email: userData.email,
            organization_role: userData.organization_role,
            confirmation_link: linkData.properties.action_link
          }
        }
      });

      if (emailError) {
        console.error(`[${requestId}] ❌ Password setup email failed:`, emailError);
        // Don't throw error - user creation should succeed even if email fails
      } else {
        console.log(`[${requestId}] ✅ Password setup email sent successfully:`, emailResult);
      }
    } catch (emailErr) {
      console.error(`[${requestId}] ❌ Password setup email error:`, emailErr);
      // Don't throw error - user creation should succeed even if email fails
    }

    // Handle organization assignment - using single org from admin selection
    console.log(`[${requestId}] 🏢 Organization assignment:`, {
      organizationId: userData.organization_id,
      organizationRole: userData.organization_role
    });
    
    // Validate the organization exists and is active
    const { data: organization, error: orgValidationError } = await supabaseAdmin
      .from('organizations')
      .select('id, name, organization_type, is_active')
      .eq('id', userData.organization_id)
      .single();
      
    if (orgValidationError || !organization) {
      console.error(`[${requestId}] ❌ Organization validation failed:`, orgValidationError);
      throw new Error(`Invalid organization: ${orgValidationError?.message || 'Organization not found'}`);
    }
    
    if (!organization.is_active) {
      throw new Error(`Organization '${organization.name}' is not active`);
    }
    
    console.log(`[${requestId}] ✅ Organization validated:`, {
      id: organization.id,
      name: organization.name,
      type: organization.organization_type
    });

    // Create organization membership using admin's selection
    console.log(`[${requestId}] 🏢 Creating organization membership...`);
    
    const membershipData = {
      user_id: newProfile.id,
      organization_id: userData.organization_id,
      role: userData.organization_role  // Use the role selected by admin
    };

    console.log(`[${requestId}] 📝 Inserting organization membership:`, membershipData);

    const { data: insertedMembership, error: membershipError } = await supabaseAdmin
      .from('organization_members')
      .insert(membershipData)
      .select();

    if (membershipError) {
      console.error(`[${requestId}] ❌ Organization membership creation failed:`, {
        error: membershipError,
        message: membershipError.message,
        details: membershipError.details,
        membershipData: membershipData,
        profileId: newProfile.id
      });
      
      // Clean up created user on organization assignment failure
      console.log(`[${requestId}] 🧹 Cleaning up auth user due to membership creation failure...`);
      try {
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
        console.log(`[${requestId}] ✅ Auth user cleanup completed`);
      } catch (cleanupError) {
        console.error(`[${requestId}] ❌ Failed to cleanup auth user:`, cleanupError);
      }
      
      throw new Error(`Failed to create organization membership: ${membershipError.message}`);
    }

    console.log(`[${requestId}] ✅ Organization membership created successfully:`, insertedMembership);
    
    // Sync JWT metadata after successful creation
    try {
      console.log(`[${requestId}] 🔄 Syncing JWT metadata...`);
      const { data: syncResult, error: syncError } = await supabaseAdmin.rpc(
        'trigger_jwt_metadata_sync', 
        { p_user_id: authUser.user.id }
      );
      
      if (syncError) {
        console.warn(`[${requestId}] ⚠️ JWT metadata sync failed (non-critical):`, syncError);
      } else {
        console.log(`[${requestId}] ✅ JWT metadata synced:`, syncResult);
      }
    } catch (syncErr) {
      console.warn(`[${requestId}] ⚠️ JWT metadata sync error (non-critical):`, syncErr);
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
