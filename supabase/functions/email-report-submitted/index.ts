import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.4"
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
    console.log('Processing report submitted notification for:', work_order_report_id)

    // Fetch report details with work order and related data
    const { data: report, error: reportError } = await supabase
      .from('work_order_reports')
      .select(`
        *,
        work_orders:work_order_id(
          id,
          work_order_number,
          organization_id,
          organizations:organization_id(name, contact_email),
          trades:trade_id(name)
        ),
        subcontractor:subcontractor_user_id(first_name, last_name, email)
      `)
      .eq('id', work_order_report_id)
      .single()

    if (reportError || !report) {
      throw new Error(`Failed to fetch report: ${reportError?.message}`)
    }

    // Get all admin users
    const { data: adminUsers, error: adminError } = await supabase
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('user_type', 'admin')
      .eq('is_active', true)

    if (adminError) {
      throw new Error(`Failed to fetch admin users: ${adminError.message}`)
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
      .eq('user_organizations.organization_id', report.work_orders.organization_id)

    if (partnerError) {
      console.warn('Failed to fetch partner users:', partnerError.message)
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
      workOrderNumber: report.work_orders.work_order_number,
      subcontractorName: `${report.subcontractor.first_name} ${report.subcontractor.last_name}`,
      organizationName: report.work_orders.organizations?.name || 'Unknown Organization',
      invoiceAmount: report.invoice_amount.toFixed(2),
      workPerformed: report.work_performed,
      reviewUrl: `${Deno.env.get('SUPABASE_URL')?.replace('https://', 'https://').replace('.supabase.co', '.lovableproject.com')}/admin/reports/${work_order_report_id}`
    }

    // Combine all recipients (admins + partners)
    const allRecipients = [
      ...(adminUsers || []),
      ...(partnerUsers || [])
    ]

    // Send emails to all recipients
    const emailPromises = allRecipients.map(async (recipient) => {
      try {
        const subject = await interpolateTemplate(template.subject, variables)
        const html = await interpolateTemplate(template.html_content, variables)

        const emailResponse = await resend.emails.send({
          from: 'WorkOrderPro <notifications@workorderpro.com>',
          to: [recipient.email],
          subject,
          html,
        })

        if (emailResponse.error) {
          await logEmail(supabase, {
            work_order_id: report.work_orders.id,
            template_name: 'report_submitted',
            recipient_email: recipient.email,
            status: 'failed',
            error_message: emailResponse.error.message,
          })
          console.error('Failed to send email to recipient:', emailResponse.error)
        } else {
          await logEmail(supabase, {
            work_order_id: report.work_orders.id,
            template_name: 'report_submitted',
            recipient_email: recipient.email,
            resend_message_id: emailResponse.data?.id,
            status: 'sent',
          })
          console.log('Email sent successfully to recipient:', recipient.email)
        }

        return emailResponse
      } catch (error) {
        await logEmail(supabase, {
          work_order_id: report.work_orders.id,
          template_name: 'report_submitted',
          recipient_email: recipient.email,
          status: 'failed',
          error_message: error.message,
        })
        console.error('Error sending email to recipient:', error)
        return { error: error.message }
      }
    })

    const results = await Promise.all(emailPromises)
    const successCount = results.filter(r => !r.error).length
    const failureCount = results.filter(r => r.error).length

    console.log(`Report submission notifications sent: ${successCount} successful, ${failureCount} failed`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount, 
        failed: failureCount,
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