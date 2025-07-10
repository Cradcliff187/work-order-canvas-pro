import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.4"
import { Resend } from "npm:resend@4.6.0"

const resend = new Resend(Deno.env.get("RESEND_API_KEY"))

interface WorkOrderCompletedPayload {
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

    const { work_order_id }: WorkOrderCompletedPayload = await req.json()
    console.log('Processing work order completion notification for:', work_order_id)

    // Fetch work order details with latest report
    const { data: workOrder, error: workOrderError } = await supabase
      .from('work_orders')
      .select(`
        *,
        organizations:organization_id(name, contact_email),
        trades:trade_id(name),
        assigned_profile:assigned_to(first_name, last_name, email),
        work_order_reports(
          invoice_amount,
          work_performed,
          submitted_at
        )
      `)
      .eq('id', work_order_id)
      .single()

    if (workOrderError || !workOrder) {
      throw new Error(`Failed to fetch work order: ${workOrderError?.message}`)
    }

    // Get the latest report for this work order
    const latestReport = workOrder.work_order_reports?.[0]
    if (!latestReport) {
      throw new Error('No report found for completed work order')
    }

    // Get partner users for this organization
    const { data: partnerUsers, error: partnerError } = await supabase
      .from('profiles')
      .select(`
        email, first_name, last_name,
        user_organizations!inner(organization_id)
      `)
      .eq('user_type', 'partner')
      .eq('is_active', true)
      .eq('user_organizations.organization_id', workOrder.organization_id)

    if (partnerError) {
      throw new Error(`Failed to fetch partner users: ${partnerError.message}`)
    }

    // Get email template
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_name', 'work_order_completed')
      .eq('is_active', true)
      .single()

    if (templateError || !template) {
      throw new Error(`Failed to fetch email template: ${templateError?.message}`)
    }

    // Prepare template variables
    const variables = {
      workOrderNumber: workOrder.work_order_number,
      organizationName: workOrder.organizations?.name || 'Unknown Organization',
      storeLocation: workOrder.store_location || '',
      streetAddress: workOrder.street_address || '',
      city: workOrder.city || '',
      state: workOrder.state || '',
      zipCode: workOrder.zip_code || '',
      tradeName: workOrder.trades?.name || 'Unknown Trade',
      subcontractorName: workOrder.assigned_profile ? 
        `${workOrder.assigned_profile.first_name} ${workOrder.assigned_profile.last_name}` : 'Unknown',
      completedDate: workOrder.final_completion_date ? 
        new Date(workOrder.final_completion_date).toLocaleDateString() : 
        new Date().toLocaleDateString(),
      workPerformed: latestReport.work_performed,
      invoiceAmount: latestReport.invoice_amount.toFixed(2),
      workOrderUrl: `${Deno.env.get('SUPABASE_URL')?.replace('https://', 'https://').replace('.supabase.co', '.lovableproject.com')}/partner/work-orders/${work_order_id}`
    }

    // Send emails to all partner users
    const emailPromises = partnerUsers?.map(async (partner) => {
      try {
        const subject = await interpolateTemplate(template.subject, variables)
        const html = await interpolateTemplate(template.html_content, variables)

        const emailResponse = await resend.emails.send({
          from: 'WorkOrderPro <notifications@workorderpro.com>',
          to: [partner.email],
          subject,
          html,
        })

        if (emailResponse.error) {
          await logEmail(supabase, {
            work_order_id,
            template_name: 'work_order_completed',
            recipient_email: partner.email,
            status: 'failed',
            error_message: emailResponse.error.message,
          })
          console.error('Failed to send email to partner:', emailResponse.error)
        } else {
          await logEmail(supabase, {
            work_order_id,
            template_name: 'work_order_completed',
            recipient_email: partner.email,
            resend_message_id: emailResponse.data?.id,
            status: 'sent',
          })
          console.log('Email sent successfully to partner:', partner.email)
        }

        return emailResponse
      } catch (error) {
        await logEmail(supabase, {
          work_order_id,
          template_name: 'work_order_completed',
          recipient_email: partner.email,
          status: 'failed',
          error_message: error.message,
        })
        console.error('Error sending email to partner:', error)
        return { error: error.message }
      }
    }) || []

    const results = await Promise.all(emailPromises)
    const successCount = results.filter(r => !r.error).length
    const failureCount = results.filter(r => r.error).length

    console.log(`Work order completion notifications sent: ${successCount} successful, ${failureCount} failed`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount, 
        failed: failureCount,
        work_order_id 
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    )

  } catch (error) {
    console.error('Error in email-work-order-completed function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    )
  }
})