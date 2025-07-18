
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Testing SMTP connection with IONOS...');
    
    // Test SMTP connection
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

    const testEmail = {
      from: "support@workorderportal.com",
      to: "cradcliff@austinkunzconstruction.com",
      subject: "SMTP Test - WorkOrderPortal",
      content: "This is a test email to verify SMTP configuration.",
      html: "<p>This is a test email to verify SMTP configuration.</p>",
    };

    console.log('Sending test email...');
    await client.send(testEmail);
    await client.close();
    console.log('Test email sent successfully');

    return new Response(
      JSON.stringify({ success: true, message: "Test email sent successfully" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('SMTP test failed:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
