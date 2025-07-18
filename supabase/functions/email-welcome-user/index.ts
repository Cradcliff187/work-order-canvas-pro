
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailWelcomeUserRequest {
  userId: string;
  temporaryPassword?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, temporaryPassword }: EmailWelcomeUserRequest = await req.json();
    
    console.log('Processing welcome email for user:', userId);

    // Initialize Supabase client with service role key for admin operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user details
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      console.error('Failed to fetch user data:', userError);
      throw new Error('User not found');
    }

    // Get email template for welcome email
    const { data: template } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_name', 'welcome_email')
      .eq('is_active', true)
      .single();

    const subject = template?.subject || `Welcome to WorkOrderPortal - ${userData.first_name} ${userData.last_name}`;
    
    let emailContent = template?.html_content || `
      <h2>Welcome to WorkOrderPortal!</h2>
      <p>Hello {{first_name}} {{last_name}},</p>
      <p>Your WorkOrderPortal account has been created successfully! You can now access the system.</p>
      <div style="background: #f5f5f5; padding: 15px; margin: 15px 0; border-radius: 5px;">
        <h3>Your Login Credentials:</h3>
        <p><strong>Email:</strong> {{email}}</p>
        {{#if temporary_password}}<p><strong>Temporary Password:</strong> {{temporary_password}}</p>{{/if}}
        <p><strong>Account Type:</strong> {{user_type}}</p>
      </div>
      <p>{{#if temporary_password}}<strong>Important:</strong> Please change your password after your first login for security purposes.{{/if}}</p>
      <p>If you have any questions or need assistance, please contact your administrator.</p>
      <p>Best regards,<br/>The WorkOrderPortal Team</p>
    `;

    // Replace template variables
    emailContent = emailContent
      .replace(/{{first_name}}/g, userData.first_name || 'User')
      .replace(/{{last_name}}/g, userData.last_name || '')
      .replace(/{{email}}/g, userData.email)
      .replace(/{{user_type}}/g, userData.user_type || 'user')
      .replace(/{{site_url}}/g, 'https://workorderportal.com');

    // Handle conditional temporary password
    if (temporaryPassword) {
      emailContent = emailContent.replace(/{{#if temporary_password}}.*?{{\/if}}/gs, (match) => {
        return match
          .replace(/{{#if temporary_password}}/g, '')
          .replace(/{{\/if}}/g, '')
          .replace(/{{temporary_password}}/g, temporaryPassword);
      });
    } else {
      emailContent = emailContent.replace(/{{#if temporary_password}}.*?{{\/if}}/gs, '');
    }

    try {
      // Send welcome email
      const { error: emailError } = await supabase.auth.admin.sendEmail({
        email: userData.email,
        subject: subject,
        html: emailContent,
      });

      // Log email attempt
      await supabase
        .from('email_logs')
        .insert({
          recipient_email: userData.email,
          template_used: 'welcome_email',
          status: emailError ? 'failed' : 'sent',
          error_message: emailError?.message || null,
          sent_at: new Date().toISOString()
        });

      if (emailError) {
        console.error('Failed to send welcome email:', emailError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: emailError.message 
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        );
      }

      console.log('Welcome email sent successfully to:', userData.email);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Welcome email sent successfully',
          recipient: userData.email 
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );

    } catch (emailError: any) {
      console.error('Email sending failed:', emailError);
      
      // Log the failure
      await supabase
        .from('email_logs')
        .insert({
          recipient_email: userData.email,
          template_used: 'welcome_email',
          status: 'failed',
          error_message: emailError.message,
          sent_at: new Date().toISOString()
        });

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Email service unavailable',
          details: emailError.message 
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

  } catch (error: any) {
    console.error('Error in email-welcome-user function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error' 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);
