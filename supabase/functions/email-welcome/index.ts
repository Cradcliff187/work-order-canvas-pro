import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "npm:resend@4.6.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Enhanced logging and validation for RESEND_API_KEY
const resendApiKey = Deno.env.get('RESEND_API_KEY');
console.log('RESEND_API_KEY status:', resendApiKey ? 'CONFIGURED' : 'MISSING');

let resend: Resend | null = null;
if (resendApiKey) {
  try {
    resend = new Resend(resendApiKey);
    console.log('Resend client initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Resend client:', error);
  }
} else {
  console.error('CRITICAL: RESEND_API_KEY is not configured in Supabase secrets');
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('=== EMAIL-WELCOME FUNCTION STARTED ===');
  
  try {
    // Validate required environment variables
    if (!resendApiKey || !resend) {
      console.error('CRITICAL: RESEND_API_KEY is not configured or Resend client failed to initialize');
      throw new Error('RESEND_API_KEY is not configured in Supabase secrets');
    }
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('Environment variables status:', {
      supabaseUrl: supabaseUrl ? 'CONFIGURED' : 'MISSING',
      supabaseServiceKey: supabaseServiceKey ? 'CONFIGURED' : 'MISSING'
    });

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required Supabase environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('Supabase client created successfully');

    const requestBody = await req.json();
    const { user_id, email, first_name, last_name, user_type, temporary_password } = requestBody;

    console.log('Request body received:', { 
      user_id, 
      email: email ? `${email.substring(0, 3)}***` : 'MISSING', 
      first_name, 
      last_name, 
      user_type,
      has_temp_password: !!temporary_password
    });

    // Validate required fields
    if (!email) {
      throw new Error('Email is required');
    }

    // Fetch the welcome email template
    console.log('Fetching welcome email template...');
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_name', 'welcome_email')
      .eq('is_active', true)
      .single();

    if (templateError) {
      console.error('Template fetch error:', templateError);
      throw new Error(`Failed to fetch welcome email template: ${templateError.message}`);
    }

    if (!template) {
      console.error('No welcome email template found');
      throw new Error('Welcome email template not found');
    }

    console.log('Template found:', { 
      template_name: template.template_name,
      subject: template.subject,
      has_html: !!template.html_content,
      has_text: !!template.text_content
    });

    // Prepare template variables
    const variables = {
      first_name: first_name || 'User',
      last_name: last_name || '',
      email: email,
      user_type: user_type || 'user',
      temporary_password: temporary_password || '',
      site_url: supabaseUrl.replace('.supabase.co', '.lovable.app') || 'https://workorderpro.com'
    };

    console.log('Template variables prepared:', {
      ...variables,
      temporary_password: variables.temporary_password ? '***' : 'EMPTY'
    });

    // Interpolate variables in template
    let htmlContent = template.html_content;
    let textContent = template.text_content || '';
    let subject = template.subject;

    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      const regex = new RegExp(placeholder, 'g');
      htmlContent = htmlContent.replace(regex, value);
      textContent = textContent.replace(regex, value);
      subject = subject.replace(regex, value);
    });

    console.log('Template interpolation completed:', {
      final_subject: subject,
      html_length: htmlContent.length,
      text_length: textContent.length
    });

    // Send the email
    console.log('Sending email via Resend...');
    const emailPayload = {
      from: 'WorkOrderPro <notifications@workorderpro.com>',
      to: [email],
      subject: subject,
      html: htmlContent,
      text: textContent,
    };
    
    console.log('Email payload prepared:', {
      from: emailPayload.from,
      to: emailPayload.to,
      subject: emailPayload.subject,
      html_length: emailPayload.html.length,
      text_length: emailPayload.text.length
    });

    const emailResponse = await resend.emails.send(emailPayload);

    console.log('Email sent successfully:', {
      success: !!emailResponse.data,
      message_id: emailResponse.data?.id,
      error: emailResponse.error
    });

    // Log the email in the database
    console.log('Logging email to database...');
    try {
      if (emailResponse.data?.id) {
        const { error: logError } = await supabase
          .from('email_logs')
          .insert({
            recipient_email: email,
            template_used: 'welcome_email',
            resend_message_id: emailResponse.data.id,
            status: 'sent',
            work_order_id: null
          });
        
        if (logError) {
          console.error('Database logging failed:', logError);
        } else {
          console.log('Email logged to database successfully');
        }
      } else {
        console.error('No message ID from Resend, cannot log to database');
      }
    } catch (dbError) {
      console.error('Database logging exception:', dbError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message_id: emailResponse.data?.id,
        recipient: email
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in email-welcome function:', error);
    
    // Log failed email attempt to database
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const requestBody = await req.clone().json().catch(() => ({}));
      const email = requestBody.email || 'unknown';
      
      await supabase
        .from('email_logs')
        .insert({
          recipient_email: email,
          template_used: 'welcome_email',
          status: 'failed',
          error_message: error.message || 'Unknown error in email-welcome function',
          work_order_id: null
        });
    } catch (logError) {
      console.error('Failed to log email error to database:', logError);
    }
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});