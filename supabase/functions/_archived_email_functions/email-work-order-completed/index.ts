
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailWorkOrderCompletedRequest {
  workOrderId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workOrderId }: EmailWorkOrderCompletedRequest = await req.json();
    
    console.log('Processing completion email notification for work order:', workOrderId);

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

    // Get partner users from the organization to notify
    const { data: partnerUsers } = await supabase
      .from('profiles')
      .select(`
        email, 
        first_name, 
        last_name,
        user_organizations!inner(organization_id)
      `)
      .eq('user_type', 'partner')
      .eq('is_active', true)
      .eq('user_organizations.organization_id', workOrderData.organization_id);

    if (!partnerUsers || partnerUsers.length === 0) {
      console.log('No partner users found for organization, notifying admins instead');
      
      // Fall back to notifying admin users
      const { data: adminUsers } = await supabase
        .from('profiles')
        .select('email, first_name, last_name')
        .eq('user_type', 'admin')
        .eq('is_active', true);

      if (!adminUsers || adminUsers.length === 0) {
        throw new Error('No users found to notify');
      }
    }

    const recipientUsers = partnerUsers && partnerUsers.length > 0 ? partnerUsers : 
      await supabase.from('profiles').select('email, first_name, last_name').eq('user_type', 'admin').eq('is_active', true).then(r => r.data || []);

    // Get email template for work order completed
    const { data: template } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_name', 'work_order_completed')
      .eq('is_active', true)
      .single();

    const subject = template?.subject || `Work Order Completed - ${workOrderData.work_order_number}`;
    
    let emailContent = template?.html_content || `
      <h2>Work Order Completed</h2>
      <p>Great news! Work order {{work_order_number}} has been completed successfully.</p>
      <p><strong>Work Order:</strong> {{work_order_number}}</p>
      <p><strong>Title:</strong> {{title}}</p>
      <p><strong>Organization:</strong> {{organization_name}}</p>
      <p><strong>Location:</strong> {{store_location}}</p>
      <p><strong>Address:</strong> {{street_address}}, {{city}}, {{state}} {{zip_code}}</p>
      <p><strong>Trade:</strong> {{trade_name}}</p>
      <p><strong>Completion Date:</strong> {{completion_date}}</p>
      <p>All work has been completed and approved. Thank you for your business!</p>
    `;

    // Replace template variables
    emailContent = emailContent
      .replace(/{{work_order_number}}/g, workOrderData.work_order_number || 'N/A')
      .replace(/{{title}}/g, workOrderData.title || 'N/A')
      .replace(/{{organization_name}}/g, workOrderData.organizations?.name || 'N/A')
      .replace(/{{store_location}}/g, workOrderData.store_location || 'N/A')
      .replace(/{{street_address}}/g, workOrderData.street_address || 'N/A')
      .replace(/{{city}}/g, workOrderData.city || 'N/A')
      .replace(/{{state}}/g, workOrderData.state || 'N/A')
      .replace(/{{zip_code}}/g, workOrderData.zip_code || 'N/A')
      .replace(/{{trade_name}}/g, workOrderData.trades?.name || 'N/A')
      .replace(/{{completion_date}}/g, workOrderData.completed_at ? new Date(workOrderData.completed_at).toLocaleDateString() : 'Today');

    // Send emails to all recipient users
    const emailPromises = recipientUsers.map(async (user) => {
      try {
        const { error: emailError } = await supabase.auth.admin.sendEmail({
          email: user.email,
          subject: subject,
          html: emailContent,
        });

        // Log email attempt
        await supabase
          .from('email_logs')
          .insert({
            work_order_id: workOrderId,
            recipient_email: user.email,
            template_used: 'work_order_completed',
            status: emailError ? 'failed' : 'sent',
            error_message: emailError?.message || null,
            sent_at: new Date().toISOString()
          });

        return { email: user.email, success: !emailError, error: emailError };
      } catch (error: any) {
        console.error(`Failed to send email to ${user.email}:`, error);
        return { email: user.email, success: false, error: error.message };
      }
    });

    const emailResults = await Promise.all(emailPromises);
    const successCount = emailResults.filter(r => r.success).length;

    console.log(`Sent ${successCount}/${emailResults.length} completion emails successfully`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Work order completion notifications sent to ${successCount} users`,
        details: emailResults
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error in email-work-order-completed function:', error);
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
