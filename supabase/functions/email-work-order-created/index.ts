
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.4';
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailWorkOrderRequest {
  workOrderId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workOrderId }: EmailWorkOrderRequest = await req.json();
    
    console.log('Processing email notification for new work order:', workOrderId);

    // Initialize Supabase client with service role key for admin operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get work order details with organization and trade info
    const { data: workOrderData, error: workOrderError } = await supabase
      .from('work_orders')
      .select(`
        *,
        organizations!organization_id(name, contact_email),
        trades!trade_id(name)
      `)
      .eq('id', workOrderId)
      .single();

    if (workOrderError || !workOrderData) {
      console.error('Failed to fetch work order data:', workOrderError);
      throw new Error('Work order not found');
    }

    // Get admin users to notify
    const { data: adminUsers } = await supabase
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('user_type', 'admin')
      .eq('is_active', true);

    // Get email template for work order created
    const { data: template } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_name', 'work_order_created')
      .eq('is_active', true)
      .single();

    if (!adminUsers || adminUsers.length === 0) {
      console.error('No admin users found to notify');
      throw new Error('No admin users found');
    }

    const subject = template?.subject || `New Work Order Submitted - ${workOrderData.work_order_number}`;
    
    let emailContent = template?.html_content || `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Work Order Submitted</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">New Work Order Submitted</h2>
        <p>A new work order has been submitted and requires assignment.</p>
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Work Order:</strong> {{work_order_number}}</p>
          <p><strong>Organization:</strong> {{organization_name}}</p>
          <p><strong>Location:</strong> {{store_location}}</p>
          <p><strong>Trade:</strong> {{trade_name}}</p>
          <p><strong>Description:</strong> {{description}}</p>
        </div>
        <p>Please log in to assign this work order to the appropriate contractor.</p>
        <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
          This email was sent by WorkOrderPro - Work Order Management System
        </p>
      </body>
      </html>
    `;

    // Replace template variables
    emailContent = emailContent
      .replace(/{{work_order_number}}/g, workOrderData.work_order_number || 'N/A')
      .replace(/{{organization_name}}/g, workOrderData.organizations?.name || 'N/A')
      .replace(/{{store_location}}/g, workOrderData.store_location || 'N/A')
      .replace(/{{trade_name}}/g, workOrderData.trades?.name || 'N/A')
      .replace(/{{description}}/g, workOrderData.description || 'No description provided')
      .replace(/{{title}}/g, workOrderData.title || 'N/A');

    // Create plain text version
    const textContent = emailContent
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    // Send emails individually with proper error handling
    const results = [];
    
    for (const admin of adminUsers) {
      try {
        console.log(`Attempting to send email to ${admin.email}`);
        
        // Create new SMTP client for each email
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

        // Send the email with fixed MIME headers
        await client.send({
          from: "WorkOrderPro <support@workorderportal.com>",
          to: admin.email,
          subject: subject,
          content: textContent,
          html: emailContent,
          headers: {
            "MIME-Version": "1.0",
          },
        });

        // Close the client
        await client.close();

        // Log successful email
        await supabase
          .from('email_logs')
          .insert({
            work_order_id: workOrderId,
            recipient_email: admin.email,
            template_used: 'work_order_created',
            status: 'sent',
            sent_at: new Date().toISOString()
          });

        console.log(`Email sent successfully to ${admin.email}`);
        results.push({ email: admin.email, success: true, error: null });

      } catch (error: any) {
        console.error(`Failed to send email to ${admin.email}:`, error);
        
        // Log failed email
        await supabase
          .from('email_logs')
          .insert({
            work_order_id: workOrderId,
            recipient_email: admin.email,
            template_used: 'work_order_created',
            status: 'failed',
            error_message: error.message || 'Unknown error',
            sent_at: new Date().toISOString()
          });

        results.push({ email: admin.email, success: false, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;

    console.log(`Sent ${successCount}/${results.length} emails successfully`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Email notifications sent to ${successCount} admin users`,
        details: results
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error in email-work-order-created function:', error);
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
