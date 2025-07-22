
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create Supabase admin client with service role
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface PasswordResetRequest {
  email: string;
}

function handleCors(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  return null;
}

function createCorsResponse(body: any, statusCode: number = 200) {
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function createCorsErrorResponse(message: string, statusCode: number) {
  return createCorsResponse({ success: false, error: message }, statusCode);
}

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      return createCorsErrorResponse('Method not allowed', 405);
    }

    const { email }: PasswordResetRequest = await req.json();

    // Validate required parameters
    if (!email) {
      return createCorsErrorResponse('Email is required', 400);
    }

    console.log('Processing password reset request for:', email);

    let firstName = 'User'; // Default fallback
    let profileId = crypto.randomUUID(); // Generate UUID as fallback

    // Look up user profile by email to get first_name
    // Don't reveal if user exists or not - always return success
    try {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id, first_name')
        .eq('email', email)
        .single();

      if (profile) {
        firstName = profile.first_name || 'User';
        profileId = profile.id;
        console.log('Found user profile for password reset');
      } else {
        console.log('No user profile found, but still proceeding for security');
      }
    } catch (error) {
      console.log('Profile lookup failed, proceeding with defaults for security');
    }

    // Generate password reset link
    try {
      // More robust with fallback
      const redirectUrl = `${Deno.env.get('PUBLIC_SITE_URL') || 'https://workorderportal.com'}/reset-password`;
      console.log('🔗 Using redirect URL:', redirectUrl);

      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: email,
        options: {
          redirectTo: redirectUrl
        }
      });

      if (linkData?.properties?.action_link) {
        console.log('🔗 Password reset link generated successfully');
        
        // Call send-email function with password reset template
        try {
          const { data: emailResult, error: emailError } = await supabaseAdmin.functions.invoke('send-email', {
            body: {
              template_name: 'password_reset',
              record_id: profileId,
              record_type: 'password_reset',
              custom_data: {
                email: email,
                first_name: firstName,
                reset_link: linkData.properties.action_link
              }
            }
          });
          
          if (emailError) {
            console.error('Password reset email sending failed:', emailError);
          } else {
            console.log('✅ Password reset email sent successfully');
          }
        } catch (emailSendError) {
          console.error('Password reset email send error:', emailSendError);
        }
      } else {
        console.error('Password reset link generation failed:', linkError);
      }
    } catch (linkGenerationError) {
      console.error('Password reset link generation error:', linkGenerationError);
    }

    // Always return success for security (never reveal user existence)
    return createCorsResponse({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.'
    });

  } catch (error) {
    console.error('Password reset function error:', error);
    
    // Even on error, return success for security
    return createCorsResponse({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.'
    });
  }
});
