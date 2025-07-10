
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { Resend } from "npm:resend@4.6.0"

const resend = new Resend(Deno.env.get("RESEND_API_KEY"))

interface WorkOrderCreatedPayload {
  work_order_id: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function interpolateTemplate(template: string, variables: Record<string, any>): Promise<string> {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] || match
  })
}

async function logEmail(supabase: any, options: {
  work_order_id?: string
  template_name: string
  recipient_email: string
  resend_message_id?: string
  status: 'sent' | 'failed'
  error_message?: string
}) {
  try {
    await supabase.from('email_logs').insert({
      work_order_id: options.work_order_id,
      template_used: options.template_name,
      recipient_email: options.recipient_email,
      resend_message_id: options.resend_message_id,
      status: options.status,
      error_message: options.error_message,
    })
  } catch (error) {
    console.error('Failed to log email:', error)
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { work_order_id }: WorkOrderCreatedPayload = await req.json()
    console.log('Processing work order created notification for:', work_order_id)

    // Fetch work order details
    const { data: workOrder, error: workOrderError } = await supabase
      .from('work_orders')
      .select(`
        *,
        organizations:organization_id(name),
        trades:trade_id(name)
      `)
      .eq('id', work_order_id)
      .single()

    if (workOrderError || !workOrder) {
      throw new Error(`Failed to fetch work order: ${workOrderError?.message}`)
    }

    // Get all admin users
    const { data: adminUsers, error: adminError } = await supabase
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('user_type', 'admin')
      .eq('is_active', true)

    if (adminError || !adminUsers || adminUsers.length === 0) {
      console.log('No admin users found to notify')
      return new Response(
        JSON.stringify({ success: true, message: 'No admin users to notify' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // Get email template
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_name', 'work_order_received')
      .eq('is_active', true)
      .single()

    if (templateError || !template) {
      throw new Error(`Failed to fetch email template: ${templateError?.message}`)
    }

    // Prepare template variables
    const variables = {
      workOrderNumber: workOrder.work_order_number || `WO-${workOrder.id.slice(0, 8)}`,
      organizationName: workOrder.organizations?.name || 'Unknown Organization',
      storeLocation: workOrder.store_location || '',
      tradeName: workOrder.trades?.name || 'General',
      description: workOrder.description || 'No description provided',
      submittedDate: new Date(workOrder.date_submitted).toLocaleDateString(),
      adminDashboardUrl: `${Deno.env.get('SUPABASE_URL')?.replace('https://', 'https://').replace('.supabase.co', '.lovableproject.com')}/admin/work-orders`
    }

    const subject = await interpolateTemplate(template.subject, variables)
    const html = await interpolateTemplate(template.html_content, variables)

    // Send emails to all admin users
    const emailPromises = adminUsers.map(async (admin) => {
      try {
        const emailResponse = await resend.emails.send({
          from: 'WorkOrderPro <notifications@workorderpro.com>',
          to: [admin.email],
          subject,
          html,
        })

        if (emailResponse.error) {
          await logEmail(supabase, {
            work_order_id,
            template_name: 'work_order_received',
            recipient_email: admin.email,
            status: 'failed',
            error_message: emailResponse.error.message,
          })
          return { success: false, error: emailResponse.error.message, email: admin.email }
        }

        await logEmail(supabase, {
          work_order_id,
          template_name: 'work_order_received',
          recipient_email: admin.email,
          resend_message_id: emailResponse.data?.id,
          status: 'sent',
        })

        return { success: true, messageId: emailResponse.data?.id, email: admin.email }
      } catch (error) {
        await logEmail(supabase, {
          work_order_id,
          template_name: 'work_order_received',
          recipient_email: admin.email,
          status: 'failed',
          error_message: error.message,
        })
        return { success: false, error: error.message, email: admin.email }
      }
    })

    const results = await Promise.all(emailPromises)
    const successful = results.filter(r => r.success)
    const failed = results.filter(r => !r.success)

    console.log(`Work order notification emails sent: ${successful.length} successful, ${failed.length} failed`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        results: {
          successful: successful.length,
          failed: failed.length,
          details: results
        },
        work_order_id
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    )

  } catch (error) {
    console.error('Error in email-work-order-created function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    )
  }
})
