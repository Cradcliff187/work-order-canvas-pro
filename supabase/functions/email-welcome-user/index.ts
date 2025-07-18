
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.4';
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

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
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to WorkOrderPortal</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Welcome to WorkOrderPortal!</h2>
        <p>Hello {{first_name}} {{last_name}},</p>
        <p>Your WorkOrderPortal account has been created successfully! You can now access the system.</p>
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Your Login Credentials:</h3>
          <p><strong>Email:</strong> {{email}}</p>
          ${temporaryPassword ? `<p><strong>Temporary Password:</strong> ${temporaryPassword}</p>` : ''}
          <p><strong>Account Type:</strong> {{user_type}}</p>
        </div>
        ${temporaryPassword ? '<p style="color: #dc2626;"><strong>Important:</strong> Please change your password after your first login for security purposes.</p>' : ''}
        <p>If you have any questions or need assistance, please contact your administrator.</p>
        <p>Best regards,<br/>The WorkOrderPortal Team</p>
        <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
          This email was sent by WorkOrderPro - Work Order Management System
        </p>
      </body>
      </html>
    `;

    // Replace template variables
    emailContent = emailContent
      .replace(/{{first_name}}/g, userData.first_name || 'User')
      .replace(/{{last_name}}/g, userData.last_name || '')
      .replace(/{{email}}/g, userData.email)
      .replace(/{{user_type}}/g, userData.user_type || 'user')
      .replace(/{{site_url}}/g, 'https://workorderportal.com');

    // Create plain text version
    const textContent = emailContent
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    try {
      console.log(`Attempting to send welcome email to ${userData.email}`);
      
      // Create SMTP client for email
      const client = new SMTPClient({
        connection: {
          hostname: "smtp.ionos.com",
          port: 587,
          tls: true,
          auth: {
            username: Deno.env.get('IONOS_SMTP_USER') || '',
            password: Deno.env.get('IONOS_SMTP_PASS') || '',
          },
        },
      });

      // Send welcome email with proper MIME headers
      await client.send({
        from: "WorkOrderPro <support@workorderportal.com>",
        to: userData.email,
        subject: subject,
        content: textContent,
        html: emailContent,
        headers: {
          "MIME-Version": "1.0",
          "Content-Type": "text/html; charset=utf-8",
        },
      });

      // Close the client
      await client.close();

      // Log email attempt
      await supabase
        .from('email_logs')
        .insert({
          recipient_email: userData.email,
          template_used: 'welcome_email',
          status: 'sent',
          sent_at: new Date().toISOString()
        });

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
