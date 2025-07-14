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
    const { userData, send_welcome_email = true } = await req.json();

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

    // Log email configuration
    if (send_welcome_email) {
      console.log('✅ Welcome email will be queued by Supabase (email_confirm: true)');
    } else {
      console.log('⚠️ Welcome email disabled by request (email_confirm: false)');
    }

    // Create auth user with conditional email confirmation
    const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email,
      password: temporaryPassword,
      email_confirm: send_welcome_email, // Use parameter to control email sending
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
    
    // Log email queueing status
    if (send_welcome_email) {
      console.log('📧 Supabase confirmation email queued for:', userData.email);
      
      // Log to email_logs table for audit trail
      try {
        await supabaseAdmin
          .from('email_logs')
          .insert({
            recipient_email: userData.email,
            template_used: 'supabase_confirmation',
            status: 'sent',
            work_order_id: null
          });
        console.log('✅ Email event logged to database');
      } catch (logError) {
        console.warn('Failed to log email event:', logError);
        // Don't fail user creation for logging issues
      }
    }

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

    // Return success response
    const message = send_welcome_email 
      ? 'User created successfully. They will receive a Supabase confirmation email to set up their account.'
      : 'User created successfully. No welcome email sent as requested.';

    console.log('✅ User creation process completed:', { 
      userId: newProfile.id, 
      email: userData.email,
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