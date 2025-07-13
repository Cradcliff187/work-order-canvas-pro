import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCors, createCorsResponse, createCorsErrorResponse } from "../_shared/cors.ts";

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
    const { userData, temporaryPassword } = await req.json();

    console.log('Creating user:', { email: userData.email, userType: userData.user_type });

    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Create auth user
    const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email,
      password: temporaryPassword,
      email_confirm: !userData.send_welcome_email,
      user_metadata: {
        first_name: userData.first_name,
        last_name: userData.last_name,
        user_type: userData.user_type,
      }
    });

    if (createError) {
      console.error('Auth user creation failed:', createError);
      throw createError;
    }

    console.log('Auth user created:', authUser.user.id);

    // Wait for profile creation and verify
    await new Promise(resolve => setTimeout(resolve, 500));

    const { data: newProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('user_id', authUser.user.id)
      .single();

    if (profileError || !newProfile) {
      console.error('Profile creation failed:', profileError);
      // Rollback: delete the auth user
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      throw new Error('Profile creation failed');
    }

    console.log('Profile created:', newProfile.id);

    // Update profile with additional data
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        phone: userData.phone,
        is_employee: userData.user_type === 'employee',
      })
      .eq('id', newProfile.id);

    if (updateError) {
      console.error('Profile update failed:', updateError);
      // Continue anyway, this is not critical
    }

    // Handle organization relationships
    if (userData.organization_ids && userData.organization_ids.length > 0) {
      const orgRelationships = userData.organization_ids.map((orgId: string) => ({
        user_id: newProfile.id,
        organization_id: orgId,
      }));

      const { error: orgError } = await supabaseAdmin
        .from('user_organizations')
        .insert(orgRelationships);

      if (orgError) {
        console.error('Organization relationship creation failed:', orgError);
        // Continue anyway, admin can fix this later
      } else {
        console.log('Organization relationships created');
      }
    }

    // Send welcome email if requested
    if (userData.send_welcome_email) {
      try {
        const { error: emailError } = await supabaseAdmin.functions.invoke('email-welcome', {
          body: {
            user: {
              email: userData.email,
              first_name: userData.first_name,
              last_name: userData.last_name,
            },
            temporary_password: temporaryPassword,
          }
        });

        if (emailError) {
          console.error('Welcome email failed:', emailError);
          // Continue anyway, user creation succeeded
        } else {
          console.log('Welcome email sent');
        }
      } catch (emailError) {
        console.error('Welcome email error:', emailError);
        // Continue anyway
      }
    }

    // Return success response
    return createCorsResponse({
      success: true,
      user: newProfile,
      credentials: userData.send_welcome_email ? null : {
        email: userData.email,
        password: temporaryPassword,
      },
    });

  } catch (error) {
    console.error('Create user error:', error);
    return createCorsErrorResponse(error.message || 'Internal error', 400);
  }
});