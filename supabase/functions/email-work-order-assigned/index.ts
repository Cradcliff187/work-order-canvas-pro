
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.4';
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailWorkOrderAssignedRequest {
  workOrderId: string;
  assignedUserId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workOrderId, assignedUserId }: EmailWorkOrderAssignedRequest = await req.json();
    
    console.log('Processing assignment email notification:', { workOrderId, assignedUserId });

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
        organizations!organization_id(name),
        trades!trade_id(name)
      `)
      .eq('id', workOrderId)
      .single();

    if (workOrderError || !workOrderData) {
      console.error('Failed to fetch work order data:', workOrderError);
      throw new Error('Work order not found');
    }

    // Get assigned user details
    const { data: assignedUser, error: userError } = await supabase
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('id', assignedUserId)
      .single();

    if (userError || !assignedUser) {
      console.error('Failed to fetch assigned user data:', userError);
      throw new Error('Assigned user not found');
    }

    // Get email template for work order assigned
    const { data: template } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_name', 'work_order_assigned')
      .eq('is_active', true)
      .single();

    const subject = template?.subject || `Work Order Assignment - ${workOrderData.work_order_number}`;
    
    let emailContent = template?.html_content || `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Work Order Assignment</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Work Order Assignment</h2>
        <p>Hello {{first_name}},</p>
        <p>You have been assigned a new work order. Please review the details below:</p>
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Work Order:</strong> {{work_order_number}}</p>
          <p><strong>Title:</strong> {{title}}</p>
          <p><strong>Organization:</strong> {{organization_name}}</p>
          <p><strong>Location:</strong> {{store_location}}</p>
          <p><strong>Address:</strong> {{street_address}}, {{city}}, {{state}} {{zip_code}}</p>
          <p><strong>Trade:</strong> {{trade_name}}</p>
          <p><strong>Description:</strong> {{description}}</p>
        </div>
        <p>Please log in to view full details and begin work.</p>
        <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
          This email was sent by WorkOrderPro - Work Order Management System
        </p>
      </body>
      </html>
    `;

    // Replace template variables
    emailContent = emailContent
      .replace(/{{first_name}}/g, assignedUser.first_name || 'Contractor')
      .replace(/{{work_order_number}}/g, workOrderData.work_order_number || 'N/A')
      .replace(/{{title}}/g, workOrderData.title || 'N/A')
      .replace(/{{organization_name}}/g, workOrderData.organizations?.name || 'N/A')
      .replace(/{{store_location}}/g, workOrderData.store_location || 'N/A')
      .replace(/{{street_address}}/g, workOrderData.street_address || 'N/A')
      .replace(/{{city}}/g, workOrderData.city || 'N/A')
      .replace(/{{state}}/g, workOrderData.state || 'N/A')
      .replace(/{{zip_code}}/g, workOrderData.zip_code || 'N/A')
      .replace(/{{trade_name}}/g, workOrderData.trades?.name || 'N/A')
      .replace(/{{description}}/g, workOrderData.description || 'No description provided');

    // Create plain text version
    const textContent = emailContent
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    try {
      console.log(`Attempting to send email to ${assignedUser.email}`);
      
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

      // Send email to assigned user with fixed MIME headers
      await client.send({
        from: "WorkOrderPro <support@workorderportal.com>",
        to: assignedUser.email,
        subject: subject,
        content: textContent,
        html: emailContent,
        headers: {
          "MIME-Version": "1.0",
        },
      });

      // Close the client
      await client.close();

      // Log email attempt
      await supabase
        .from('email_logs')
        .insert({
          work_order_id: workOrderId,
          recipient_email: assignedUser.email,
          template_used: 'work_order_assigned',
          status: 'sent',
          sent_at: new Date().toISOString()
        });

      console.log('Assignment email sent successfully to:', assignedUser.email);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Assignment email sent successfully',
          recipient: assignedUser.email 
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
          work_order_id: workOrderId,
          recipient_email: assignedUser.email,
          template_used: 'work_order_assigned',
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
    console.error('Error in email-work-order-assigned function:', error);
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
