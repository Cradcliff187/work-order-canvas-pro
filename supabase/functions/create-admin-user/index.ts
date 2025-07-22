
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

    // Get request body
    const { userData, send_welcome_email = false } = await req.json();

    console.log('Creating user:', { 
      email: userData.email, 
      userType: userData.user_type, 
      sendWelcomeEmail: send_welcome_email 
    });

    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Generate a secure temporary password for initial creation
    const temporaryPassword = crypto.randomUUID() + crypto.randomUUID();

    console.log('✅ Creating auth user with app_metadata user_type:', userData.user_type);

    // Create auth user with email confirmation disabled (we'll handle manually)
    const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email,
      password: temporaryPassword,
      email_confirm: false, // We'll handle email confirmation manually
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

    console.log('✅ Auth user created:', authUser.user.id);
    
    // CRITICAL FIX: Create profile directly instead of waiting for trigger
    console.log('🔧 Creating profile directly with user_type:', userData.user_type);
    
    const { data: newProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        user_id: authUser.user.id,
        email: userData.email,
        first_name: userData.first_name,
        last_name: userData.last_name,
        user_type: userData.user_type, // Use the correct user_type from input
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

    console.log('✅ Profile created directly:', { 
      profileId: newProfile.id, 
      userType: newProfile.user_type,
      email: newProfile.email 
    });

    // Handle organization relationships
    let finalOrganizationIds: string[] = [];
    
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
      console.log('✅ Validated organizations:', validOrganizations.map(org => org.name));
    } else {
      // Partners and Subcontractors MUST have organization
      if (userData.user_type === 'partner' || userData.user_type === 'subcontractor') {
        throw new Error(
          `${userData.user_type.charAt(0).toUpperCase() + userData.user_type.slice(1)} users MUST be assigned to an organization. Please select one.`
        );
      }
    }

    // Create organization relationships
    if (finalOrganizationIds.length > 0) {
      const orgRelationships = finalOrganizationIds.map((orgId: string) => ({
        user_id: newProfile.id,
        organization_id: orgId,
      }));

      const { error: orgError } = await supabaseAdmin
        .from('user_organizations')
        .insert(orgRelationships);

      if (orgError) {
        console.error('Organization relationship creation failed:', orgError);
        throw new Error(`Failed to assign user to organization: ${orgError.message}`);
      } else {
        console.log('✅ Organization relationships created successfully');
      }
    }

    // Handle welcome email if requested
    if (send_welcome_email) {
      try {
        console.log('🔗 Generating magic link for confirmation email...');
        
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: userData.email,
          options: {
            redirectTo: Deno.env.get('PUBLIC_SITE_URL') || 'https://lovable.dev/projects/9dd2f336-2e89-40cc-b621-dbdacc6b4b12'
          }
        });

        if (linkData?.properties?.action_link) {
          console.log('📧 Sending confirmation email with link');
          
          try {
            const { error: emailError } = await supabaseAdmin.functions.invoke('send-email', {
              body: {
                template_name: 'auth_confirmation',
                record_id: authUser.user.id,
                record_type: 'auth_user',
                custom_data: {
                  email: userData.email,
                  first_name: userData.first_name,
                  last_name: userData.last_name,
                  confirmation_link: linkData.properties.action_link
                }
              }
            });
            
            if (emailError) {
              console.error('Email sending failed:', emailError);
            } else {
              console.log('✅ Confirmation email sent successfully');
            }
          } catch (emailSendError) {
            console.error('Email send error:', emailSendError);
            console.log('📧 Email sending failed, but user creation succeeded');
          }
        } else {
          console.error('Magic link generation failed:', linkError);
        }
      } catch (error) {
        console.error('Email process error:', error);
        // Don't fail user creation if email fails
      }
      
      // Log to email_logs table for audit trail
      try {
        await supabaseAdmin
          .from('email_logs')
          .insert({
            recipient_email: userData.email,
            template_used: 'auth_confirmation',
            status: 'sent',
            work_order_id: null
          });
        console.log('✅ Email event logged to database');
      } catch (logError) {
        console.warn('Failed to log email event:', logError);
      }
    }

    // Return success response
    const message = send_welcome_email 
      ? 'User created successfully. They will receive a confirmation email to set up their account.'
      : 'User created successfully without sending welcome email.';

    console.log('✅ User creation process completed:', { 
      userId: newProfile.id, 
      email: userData.email,
      userType: newProfile.user_type,
      emailSent: send_welcome_email 
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
