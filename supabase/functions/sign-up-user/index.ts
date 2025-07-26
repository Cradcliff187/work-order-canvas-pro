import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

interface SignUpRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  user_type?: 'admin' | 'partner' | 'subcontractor' | 'employee';
  phone?: string;
  company_name?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: SignUpRequest = await req.json();
    
    console.log('Processing sign-up request for:', requestData.email);

    // Validate required fields
    if (!requestData.email || !requestData.password || !requestData.first_name || !requestData.last_name) {
      console.error('Missing required fields');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: email, password, first_name, last_name' 
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Default user_type to subcontractor if not specified
    const user_type = requestData.user_type || 'subcontractor';

    // Check if user already exists
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (!listError) {
      const existingUser = existingUsers.users?.find(u => u.email === requestData.email);
      if (existingUser) {
        console.error('User already exists with email:', requestData.email);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'User with this email already exists' 
          }),
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        );
      }
    }

    // Create auth user with email_confirm: false
    const { data: authUserResult, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: requestData.email,
      password: requestData.password,
      email_confirm: false, // User must confirm via our custom email
      user_metadata: {
        first_name: requestData.first_name,
        last_name: requestData.last_name,
      },
      app_metadata: {
        user_type: user_type,
      }
    });

    if (authError || !authUserResult.user) {
      console.error('Auth user creation failed:', authError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: authError?.message || 'Failed to create authentication user' 
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    console.log('Auth user created:', authUserResult.user.id);

    // Wait for profile to be created by trigger
    let profile;
    let retryCount = 0;
    const maxRetries = 10;
    
    while (retryCount < maxRetries) {
      const { data: profileData, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('user_id', authUserResult.user.id)
        .single();
      
      if (profileData) {
        profile = profileData;
        break;
      }
      
      console.log(`Profile not found yet, retry ${retryCount + 1}/${maxRetries}`);
      await new Promise(resolve => setTimeout(resolve, 500));
      retryCount++;
    }

    if (!profile) {
      console.error('Profile was not created by trigger');
      // Clean up auth user
      await supabaseAdmin.auth.admin.deleteUser(authUserResult.user.id);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Profile creation failed' 
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    console.log('Profile created by trigger:', profile.id);

    // Update profile with additional fields if provided
    const updateFields: any = {};
    if (requestData.phone) updateFields.phone = requestData.phone;
    if (requestData.company_name) updateFields.company_name = requestData.company_name;
    if (user_type === 'employee') updateFields.is_employee = true;

    if (Object.keys(updateFields).length > 0) {
      const { data: updatedProfile, error: updateError } = await supabaseAdmin
        .from('profiles')
        .update(updateFields)
        .eq('id', profile.id)
        .select()
        .single();
      
      if (!updateError && updatedProfile) {
        profile = updatedProfile;
        console.log('Profile updated with additional fields');
      }
    }

    // Generate magic link for signup confirmation
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email: requestData.email,
      options: {
        redirectTo: `${Deno.env.get('PUBLIC_SITE_URL') || 'https://workorderportal.com'}/`
      }
    });

    if (linkError || !linkData) {
      console.error('Magic link generation failed:', linkError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to generate confirmation link' 
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    console.log('Magic link generated for:', requestData.email);

    // Send confirmation email via send-email function
    const { data: emailResult, error: emailError } = await supabaseAdmin.functions.invoke('send-email', {
      body: {
        template_name: 'auth_confirmation',
        record_type: 'auth_user',
        record_id: profile.id,
        custom_data: {
          confirmation_link: linkData.properties.action_link,
          first_name: requestData.first_name,
          email: requestData.email
        }
      }
    });

    if (emailError) {
      console.error('Confirmation email failed:', emailError);
      // Don't fail the entire process if email fails
    } else {
      console.log('Confirmation email sent successfully');
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: authUserResult.user.id,
          email: authUserResult.user.email,
          profile: profile
        },
        message: 'User created successfully. Please check your email to confirm your account.'
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error('Error in sign-up-user function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'An unexpected error occurred' 
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json', 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);