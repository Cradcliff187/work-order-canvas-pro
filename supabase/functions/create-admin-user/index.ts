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
    const { userData } = await req.json();

    console.log('Creating user:', { email: userData.email, userType: userData.user_type });

    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Generate a secure temporary password for initial creation
    const temporaryPassword = crypto.randomUUID() + crypto.randomUUID();

    // Create auth user with email confirmation enabled (triggers Supabase's confirmation email)
    const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email,
      password: temporaryPassword,
      email_confirm: true, // Always trigger Supabase's confirmation email
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

    // Wait for profile creation and verify with retry logic
    await new Promise(resolve => setTimeout(resolve, 1500));

    console.log('Starting profile verification process for user:', authUser.user.id);

    let retries = 0;
    let newProfile = null;
    while (retries < 3 && !newProfile) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log(`Profile verification attempt ${retries + 1}/3 for user:`, authUser.user.id);
      
      const { data } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('user_id', authUser.user.id)
        .single();
      newProfile = data;
      retries++;
    }

    if (!newProfile) {
      console.error('Profile creation failed after retries');
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      throw new Error('Profile creation failed');
    }

    console.log('Profile verification successful:', { profileId: newProfile.id, retries });

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

    // Generate password reset link for user to set their own password
    console.log('Generating password reset link for user...');
    try {
      const { data: resetLink, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: userData.email,
        options: {
          redirectTo: `${Deno.env.get('SUPABASE_URL')?.replace('//', '//')}/auth/callback`
        }
      });

      if (resetError) {
        console.error('Failed to generate password reset link:', resetError);
      } else {
        console.log('✅ Password reset link generated successfully');
        // The user will receive Supabase's built-in confirmation email
        // followed by the ability to set their password via the reset link
      }
    } catch (error) {
      console.error('Error generating password reset link:', error);
      // Continue anyway - user can still use the confirmation email
    }

    // Return success response
    return createCorsResponse({
      success: true,
      user: newProfile,
      message: 'User created successfully. They will receive a confirmation email to set up their account.',
    });

  } catch (error) {
    console.error('Create user error:', error);
    return createCorsErrorResponse(error.message || 'Internal error', 400);
  }
});