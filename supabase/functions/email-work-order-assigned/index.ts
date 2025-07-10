
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { Resend } from "npm:resend@4.6.0"

const resend = new Resend(Deno.env.get("RESEND_API_KEY"))

interface WorkOrderAssignedPayload {
  work_order_id: string
  assigned_to_user_id: string
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

    const { work_order_id, assigned_to_user_id }: WorkOrderAssignedPayload = await req.json()
    console.log('Processing work order assignment notification for:', work_order_id, 'assigned to:', assigned_to_user_id)

    // Fetch work order details with related data
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

    // Fetch assigned user details
    const { data: assignedUser, error: userError } = await supabase
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('id', assigned_to_user_id)
      .single()

    if (userError || !assignedUser) {
      throw new Error(`Failed to fetch assigned user: ${userError?.message}`)
    }

    // Get email template
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_name', 'work_order_assigned')
      .eq('is_active', true)
      .single()

    if (templateError || !template) {
      throw new Error(`Failed to fetch email template: ${templateError?.message}`)
    }

    // Prepare template variables
    const variables = {
      subcontractorName: `${assignedUser.first_name} ${assignedUser.last_name}`,
      workOrderNumber: workOrder.work_order_number || `WO-${workOrder.id.slice(0, 8)}`,
      organizationName: workOrder.organizations?.name || 'Unknown Organization',
      storeLocation: workOrder.store_location || '',
      streetAddress: workOrder.street_address || '',
      city: workOrder.city || '',
      state: workOrder.state || '',
      zipCode: workOrder.zip_code || '',
      tradeName: workOrder.trades?.name || 'General',
      description: workOrder.description || 'No description provided',
      estimatedCompletionDate: workOrder.estimated_completion_date ? new Date(workOrder.estimated_completion_date).toLocaleDateString() : null,
      workOrderUrl: `${Deno.env.get('SUPABASE_URL')?.replace('https://', 'https://').replace('.supabase.co', '.lovableproject.com')}/subcontractor/work-orders/${work_order_id}`
    }

    const subject = await interpolateTemplate(template.subject, variables)
    const html = await interpolateTemplate(template.html_content, variables)

    // Send email to assigned user
    try {
      const emailResponse = await resend.emails.send({
        from: 'WorkOrderPro <notifications@workorderpro.com>',
        to: [assignedUser.email],
        subject,
        html,
      })

      if (emailResponse.error) {
        await logEmail(supabase, {
          work_order_id,
          template_name: 'work_order_assigned',
          recipient_email: assignedUser.email,
          status: 'failed',
          error_message: emailResponse.error.message,
        })
        throw new Error(emailResponse.error.message)
      }

      await logEmail(supabase, {
        work_order_id,
        template_name: 'work_order_assigned',
        recipient_email: assignedUser.email,
        resend_message_id: emailResponse.data?.id,
        status: 'sent',
      })

      console.log('Assignment notification email sent successfully to:', assignedUser.email)

      return new Response(
        JSON.stringify({ 
          success: true, 
          message_id: emailResponse.data?.id,
          recipient: assignedUser.email,
          work_order_id,
          assigned_to_user_id
        }),
        { 
          status: 200, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      )

    } catch (error) {
      await logEmail(supabase, {
        work_order_id,
        template_name: 'work_order_assigned',
        recipient_email: assignedUser.email,
        status: 'failed',
        error_message: error.message,
      })
      throw error
    }

  } catch (error) {
    console.error('Error in email-work-order-assigned function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    )
  }
})
