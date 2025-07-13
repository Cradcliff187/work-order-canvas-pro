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

    // Send welcome email if requested
    if (userData.send_welcome_email) {
      console.log('=== WELCOME EMAIL PROCESS STARTED ===');
      console.log('Target email:', userData.email);
      
      try {
        // Validate environment variables
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        
        console.log('Environment check for email:', {
          supabaseUrl: supabaseUrl ? 'CONFIGURED' : 'MISSING',
          serviceRoleKey: serviceRoleKey ? 'CONFIGURED' : 'MISSING'
        });
        
        if (!supabaseUrl || !serviceRoleKey) {
          throw new Error('Missing required environment variables for email service');
        }
        
        const emailUrl = `${supabaseUrl}/functions/v1/email-welcome`;
        console.log('Email function URL:', emailUrl);
        
        const emailPayload = {
          user_id: newProfile.id,
          email: userData.email,
          first_name: userData.first_name,
          last_name: userData.last_name,
          user_type: userData.user_type,
          temporary_password: temporaryPassword,
        };
        
        console.log('Email payload prepared:', {
          ...emailPayload,
          temporary_password: emailPayload.temporary_password ? '***' : 'EMPTY'
        });
        
        console.log('Making request to email-welcome function...');
        const emailResponse = await fetch(emailUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(emailPayload),
        });

        console.log('Email response received:', {
          status: emailResponse.status,
          statusText: emailResponse.statusText,
          ok: emailResponse.ok
        });

        const emailResult = await emailResponse.text();
        console.log('Email response body:', emailResult);
        
        if (emailResponse.ok) {
          console.log('✅ Welcome email sent successfully');
          try {
            const parsedResult = JSON.parse(emailResult);
            console.log('Parsed email result:', parsedResult);
          } catch (parseError) {
            console.log('Could not parse email result as JSON, but request was successful');
          }
        } else {
          console.error('❌ Welcome email failed with status:', emailResponse.status);
          console.error('Error response:', emailResult);
          
          // Log failed email attempt to database
          try {
            const { error: logError } = await supabaseAdmin
              .from('email_logs')
              .insert({
                recipient_email: userData.email,
                template_used: 'welcome_email',
                status: 'failed',
                error_message: `HTTP ${emailResponse.status}: ${emailResult}`,
                work_order_id: null
              });
            
            if (logError) {
              console.error('Failed to log email error to database:', logError);
            } else {
              console.log('Email error logged to database');
            }
          } catch (logError) {
            console.error('Exception while logging email error:', logError);
          }
        }
      } catch (emailError) {
        console.error('❌ Welcome email network/fetch error:', emailError);
        console.error('Error details:', {
          name: emailError.name,
          message: emailError.message,
          stack: emailError.stack
        });
        
        // Log failed email attempt to database
        try {
          const { error: logError } = await supabaseAdmin
            .from('email_logs')
            .insert({
              recipient_email: userData.email,
              template_used: 'welcome_email',
              status: 'failed',
              error_message: `Network error: ${emailError.message}`,
              work_order_id: null
            });
          
          if (logError) {
            console.error('Failed to log email error to database:', logError);
          } else {
            console.log('Email network error logged to database');
          }
        } catch (logError) {
          console.error('Exception while logging email network error:', logError);
        }
        
        // Continue anyway - don't fail user creation due to email issues
      }
      
      console.log('=== WELCOME EMAIL PROCESS COMPLETED ===');
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