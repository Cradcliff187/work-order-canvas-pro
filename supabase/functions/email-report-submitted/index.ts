
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { Resend } from "npm:resend@4.6.0"

const resend = new Resend(Deno.env.get("RESEND_API_KEY"))

interface ReportSubmittedPayload {
  work_order_report_id: string
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

    const { work_order_report_id }: ReportSubmittedPayload = await req.json()
    console.log('Processing report submission notification for:', work_order_report_id)

    // Fetch report details with work order and related data
    const { data: report, error: reportError } = await supabase
      .from('work_order_reports')
      .select(`
        *,
        work_orders:work_order_id(
          id,
          work_order_number,
          store_location,
          organization_id,
          organizations:organization_id(name, contact_email)
        ),
        subcontractor:subcontractor_user_id(first_name, last_name)
      `)
      .eq('id', work_order_report_id)
      .single()

    if (reportError || !report) {
      throw new Error(`Failed to fetch report: ${reportError?.message}`)
    }

    // Get admin users and organization contact
    const { data: adminUsers, error: adminError } = await supabase
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('user_type', 'admin')
      .eq('is_active', true)

    if (adminError) {
      console.error('Failed to fetch admin users:', adminError)
    }

    // Get email template
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_name', 'report_submitted')
      .eq('is_active', true)
      .single()

    if (templateError || !template) {
      throw new Error(`Failed to fetch email template: ${templateError?.message}`)
    }

    // Prepare template variables
    const variables = {
      subcontractorName: `${report.subcontractor.first_name} ${report.subcontractor.last_name}`,
      workOrderNumber: report.work_orders.work_order_number || `WO-${report.work_orders.id.slice(0, 8)}`,
      organizationName: report.work_orders.organizations?.name || 'Unknown Organization',
      storeLocation: report.work_orders.store_location || '',
      workPerformed: report.work_performed,
      invoiceAmount: `$${report.invoice_amount.toFixed(2)}`,
      submittedDate: new Date(report.submitted_at).toLocaleDateString(),
      reportUrl: `${Deno.env.get('SUPABASE_URL')?.replace('https://', 'https://').replace('.supabase.co', '.lovableproject.com')}/admin/reports/${work_order_report_id}`
    }

    const subject = await interpolateTemplate(template.subject, variables)
    const html = await interpolateTemplate(template.html_content, variables)

    // Prepare recipients list
    const recipients = []
    
    // Add admin users
    if (adminUsers && adminUsers.length > 0) {
      recipients.push(...adminUsers.map(admin => admin.email))
    }
    
    // Add organization contact email
    if (report.work_orders.organizations?.contact_email) {
      recipients.push(report.work_orders.organizations.contact_email)
    }

    if (recipients.length === 0) {
      console.log('No recipients found for report submission notification')
      return new Response(
        JSON.stringify({ success: true, message: 'No recipients to notify' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // Send emails to all recipients
    const emailPromises = recipients.map(async (email) => {
      try {
        const emailResponse = await resend.emails.send({
          from: 'WorkOrderPro <notifications@workorderpro.com>',
          to: [email],
          subject,
          html,
        })

        if (emailResponse.error) {
          await logEmail(supabase, {
            work_order_id: report.work_orders.id,
            template_name: 'report_submitted',
            recipient_email: email,
            status: 'failed',
            error_message: emailResponse.error.message,
          })
          return { success: false, error: emailResponse.error.message, email }
        }

        await logEmail(supabase, {
          work_order_id: report.work_orders.id,
          template_name: 'report_submitted',
          recipient_email: email,
          resend_message_id: emailResponse.data?.id,
          status: 'sent',
        })

        return { success: true, messageId: emailResponse.data?.id, email }
      } catch (error) {
        await logEmail(supabase, {
          work_order_id: report.work_orders.id,
          template_name: 'report_submitted',
          recipient_email: email,
          status: 'failed',
          error_message: error.message,
        })
        return { success: false, error: error.message, email }
      }
    })

    const results = await Promise.all(emailPromises)
    const successful = results.filter(r => r.success)
    const failed = results.filter(r => !r.success)

    console.log(`Report submission notification emails sent: ${successful.length} successful, ${failed.length} failed`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        results: {
          successful: successful.length,
          failed: failed.length,
          details: results
        },
        work_order_report_id
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    )

  } catch (error) {
    console.error('Error in email-report-submitted function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    )
  }
})
