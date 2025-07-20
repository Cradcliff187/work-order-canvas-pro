
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
    const { to, subject, message } = await req.json();

    console.log('Simple email function called:', { to, subject, message });

    // Simple SMTP client
    const client = new SMTPClient({
      connection: {
        hostname: "smtp.ionos.com",
        port: 587,  // Port 587 uses STARTTLS
        tls: false,  // Port 587 uses STARTTLS
        auth: {
          username: Deno.env.get('IONOS_SMTP_USER') || '',
          password: Deno.env.get('IONOS_SMTP_PASS') || '',
        },
      },
    });

    console.log('Attempting to send simple email...');

    // Send simple email
    await client.send({
      from: "WorkOrderPro <support@workorderportal.com>",
      to: to || "cradcliff@austinkunzconstruction.com",
      subject: subject || "Test Email",
      content: message || "This is a test email",
      html: `<p>${message || "This is a test email"}</p>`,
    });

    await client.close();

    console.log('Simple email sent successfully!');

    return new Response(
      JSON.stringify({ success: true, message: "Email sent!" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Simple email error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
