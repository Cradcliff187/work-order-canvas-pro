
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
      firstName: userData.first_name,
      lastName: userData.last_name,
      phone: userData.phone,
      organizationIds: userData.organization_ids,
      hasOrganizations: !!(userData.organization_ids?.length),
      organizationIdsLength: userData.organization_ids?.length || 0,
      fullUserData: userData
    });

    console.log(`[${requestId}] 🔍 Debug - Raw organization_ids analysis:`, {
      rawOrganizationIds: userData.organization_ids,
      isArray: Array.isArray(userData.organization_ids),
      length: userData.organization_ids?.length,
      firstElement: userData.organization_ids?.[0],
      isEmpty: !userData.organization_ids || userData.organization_ids.length === 0
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

      // Test user_organizations table specifically
      const { data: userOrgTest, error: userOrgError } = await supabaseAdmin
        .from('user_organizations')
        .select('id')
        .limit(1);

      if (userOrgError) {
        console.error(`[${requestId}] ❌ user_organizations table access failed:`, userOrgError);
        return createCorsErrorResponse('Database user_organizations access error: ' + userOrgError.message, 500);
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
          user_type: userData.user_type,
        }
      };

      console.log(`[${requestId}] 👤 DEBUG - Auth user creation payload:`, {
        email: authUserPayload.email,
        hasPassword: !!authUserPayload.password,
        emailConfirm: authUserPayload.email_confirm,
        userMetadata: authUserPayload.user_metadata,
        appMetadata: authUserPayload.app_metadata,
        userTypeInMetadata: authUserPayload.app_metadata.user_type
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
    if (userData.user_type === 'employee') updateFields.is_employee = true;
    updateFields.user_type = userData.user_type;  // Fix the user_type from trigger default
    
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
            user_type: userData.user_type,
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

    // Handle organization relationships with validation and auto-assignment
    let finalOrganizationIds: string[] = [];
    let autoAssignedOrganizations: any[] = [];
    
    console.log(`[${requestId}] 🏢 DEBUG - Organization assignment analysis:`, {
      providedOrganizationIds: userData.organization_ids,
      hasOrganizationIds: !!(userData.organization_ids && userData.organization_ids.length > 0),
      organizationIdsLength: userData.organization_ids?.length || 0,
      userType: userData.user_type,
      needsOrganization: userData.user_type !== 'admin'
    });
    
    if (userData.organization_ids && userData.organization_ids.length > 0) {
      // Validate provided organizations
      console.log(`[${requestId}] 🔍 Validating provided organizations:`, userData.organization_ids);
      const { validOrganizations, errors } = await validateAndProcessOrganizations(
        supabaseAdmin,
        userData.user_type,
        userData.organization_ids
      );

      console.log(`[${requestId}] 📊 Organization validation results:`, {
        validOrganizations: validOrganizations.map(org => ({ id: org.id, name: org.name, type: org.organization_type })),
        validCount: validOrganizations.length,
        errors: errors,
        errorCount: errors.length
      });

      if (errors.length > 0) {
        console.error(`[${requestId}] ❌ Organization validation failed:`, errors);
        throw new Error(`Organization validation failed: ${errors.join(', ')}`);
      }

      finalOrganizationIds = validOrganizations.map(org => org.id);
      console.log(`[${requestId}] ✅ Validated organizations:`, validOrganizations.map(org => org.name));
    } else {
      // Auto-assign organizations for partner, subcontractor, and employee users
      if (userData.user_type !== 'admin') {
        console.log(`[${requestId}] 🔄 Auto-assigning organizations for user type:`, userData.user_type);
        const expectedOrgType = getUserExpectedOrganizationType(userData.user_type);
        console.log(`[${requestId}] 🎯 Expected organization type:`, expectedOrgType);
        
        const availableOrganizations = await getOrganizationsForAutoAssignment(supabaseAdmin, userData.user_type);
        
        console.log(`[${requestId}] 📋 Available organizations for auto-assignment:`, {
          organizationCount: availableOrganizations.length,
          organizations: availableOrganizations.map(org => ({ 
            id: org.id, 
            name: org.name, 
            type: org.organization_type,
            isActive: org.is_active 
          })),
          expectedType: expectedOrgType
        });
        
        if (availableOrganizations.length === 0) {
          const expectedType = getUserExpectedOrganizationType(userData.user_type);
          console.error(`[${requestId}] ❌ No organizations available for auto-assignment`, {
            userType: userData.user_type,
            expectedType: expectedType
          });
          throw new Error(`No ${expectedType} organizations available for auto-assignment. Please create a ${expectedType} organization first.`);
        }
        
        // Auto-assign to the first available organization
        const selectedOrg = availableOrganizations[0];
        finalOrganizationIds = [selectedOrg.id];
        autoAssignedOrganizations = [selectedOrg];
        console.log(`[${requestId}] ✅ Auto-assigned to organization:`, {
          id: selectedOrg.id,
          name: selectedOrg.name,
          type: selectedOrg.organization_type
        });
      } else {
        console.log(`[${requestId}] ℹ️ Admin user - no organization assignment needed`);
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

      console.log(`[${requestId}] 📝 About to insert organization relationships:`, orgRelationships);

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
          sqlState: orgError.code,
          orgRelationships: orgRelationships,
          profileId: newProfile.id,
          orgIds: finalOrganizationIds
        });
        
        // Clean up created user on organization assignment failure
        console.log(`[${requestId}] 🧹 Cleaning up auth user due to organization assignment failure...`);
        try {
          await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
          console.log(`[${requestId}] ✅ Auth user cleanup completed`);
        } catch (cleanupError) {
          console.error(`[${requestId}] ❌ Failed to cleanup auth user:`, cleanupError);
        }
        
        throw new Error(`Failed to assign user to organization: ${orgError.message}. Please check if the user_organizations table exists and has proper permissions.`);
      }

      console.log(`[${requestId}] ✅ Organization relationships created successfully:`, insertedRelationships);
      
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
