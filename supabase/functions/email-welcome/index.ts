import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.4";
import { Resend } from "npm:resend@4.6.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string);

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, email, first_name, last_name, user_type } = await req.json();

    console.log('Processing welcome email for user:', { user_id, email, first_name, last_name, user_type });

    // Fetch the welcome email template
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_name', 'welcome_email')
      .eq('is_active', true)
      .single();

    if (templateError || !template) {
      console.error('Welcome email template not found:', templateError);
      throw new Error('Welcome email template not found');
    }

    // Prepare template variables
    const variables = {
      first_name: first_name || 'User',
      last_name: last_name || '',
      email: email,
      user_type: user_type || 'user',
      site_url: supabaseUrl.replace('.supabase.co', '.lovable.app') || 'https://workorderpro.com'
    };

    // Interpolate variables in template
    let htmlContent = template.html_content;
    let textContent = template.text_content || '';
    let subject = template.subject;

    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      htmlContent = htmlContent.replace(new RegExp(placeholder, 'g'), value);
      textContent = textContent.replace(new RegExp(placeholder, 'g'), value);
      subject = subject.replace(new RegExp(placeholder, 'g'), value);
    });

    // Send the email
    const emailResponse = await resend.emails.send({
      from: 'WorkOrderPro <notifications@workorderpro.com>',
      to: [email],
      subject: subject,
      html: htmlContent,
      text: textContent,
    });

    console.log('Welcome email sent successfully:', emailResponse);

    // Log the email in the database
    if (emailResponse.data?.id) {
      await supabase
        .from('email_logs')
        .insert({
          recipient_email: email,
          template_used: 'welcome_email',
          resend_message_id: emailResponse.data.id,
          status: 'sent',
          work_order_id: null
        });
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