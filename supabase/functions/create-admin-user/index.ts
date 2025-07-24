
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
  
  try {
    // Create authenticated Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Verify admin user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return createCorsErrorResponse('Unauthorized', 401);
    }

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('user_type')
      .eq('user_id', user.id)
      .single();

    if (profile?.user_type !== 'admin') {
      return createCorsErrorResponse('Only admins can create users', 403);
    }

    // Get request body - database trigger will handle welcome email automatically
    const { userData } = await req.json();

    console.log('Creating user:', { 
      email: userData.email, 
      userType: userData.user_type
    });

    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Generate a secure temporary password for initial creation
    const temporaryPassword = crypto.randomUUID() + crypto.randomUUID();

    // Create auth user
    const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email,
      password: temporaryPassword,
      email_confirm: false, // Don't auto-confirm - we'll send password setup email
      app_metadata: {  // Security data (admin-only)
        user_type: userData.user_type
      },
      user_metadata: {  // Non-security data (user-editable)
        first_name: userData.first_name,
        last_name: userData.last_name
      }
    });

    if (createError) {
      console.error('Auth user creation failed:', createError);
      throw createError;
    }

    console.log('Auth user created:', authUser.user.id);

    // Manually create profile since we can't use triggers on auth.users
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
      console.error('Profile creation failed:', profileError);
      // Clean up auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      throw new Error(`Profile creation failed: ${profileError.message}`);
    }

    console.log('Profile created:', newProfile.id);

    // Welcome email will be sent automatically by database trigger on profile creation

    // Send password setup email so user can actually log in
    try {
      console.log('Sending password setup email...');
      const { data: emailResult, error: emailError } = await supabaseAdmin.functions.invoke('password-reset-email', {
        body: {
          email: userData.email
        }
      });
      
      if (emailError) {
        console.error('Password setup email failed:', emailError);
        // Don't fail user creation if email fails
      } else {
        console.log('Password setup email sent successfully');
      }
    } catch (emailError) {
      console.error('Password setup email error:', emailError);
      // Continue anyway - email failure shouldn't block user creation
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
      console.log('Creating organization relationships for user:', newProfile.id);
      console.log('Organization IDs:', finalOrganizationIds);
      
      const orgRelationships = finalOrganizationIds.map((orgId: string) => ({
        user_id: newProfile.id,
        organization_id: orgId,
      }));

      console.log('Inserting organization relationships:', orgRelationships);

      const { data: insertedRelationships, error: orgError } = await supabaseAdmin
        .from('user_organizations')
        .insert(orgRelationships)
        .select();

      if (orgError) {
        console.error('Organization relationship creation failed:', orgError);
        console.error('Error details:', {
          message: orgError.message,
          details: orgError.details,
          hint: orgError.hint,
          code: orgError.code
        });
        
        // For auto-assignment, this is more critical
        if (autoAssignedOrganizations.length > 0) {
          throw new Error(`Failed to assign user to organization: ${orgError.message}`);
        }
      } else {
        console.log('Organization relationships created successfully:', insertedRelationships);
      }
    }

    // Return success response
    const message = 'User created successfully. They will receive a welcome email with login instructions.';

    console.log('✅ User creation process completed:', { 
      userId: newProfile.id, 
      email: userData.email
    });

    return createCorsResponse({
      success: true,
      user: newProfile,
      message,
    });

  } catch (error) {
    console.error('Create user error:', error);
    return createCorsErrorResponse(error.message || 'Internal error', 400);
  }
});
