import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.4"
import { Resend } from "npm:resend@4.6.0"

const resend = new Resend(Deno.env.get("RESEND_API_KEY"))

interface ReportReviewedPayload {
  work_order_report_id: string
  status: 'approved' | 'rejected'
  review_notes?: string
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

    const { work_order_report_id, status, review_notes }: ReportReviewedPayload = await req.json()
    console.log('Processing report review notification for:', work_order_report_id, 'Status:', status)

    // Fetch report details with work order and related data
    const { data: report, error: reportError } = await supabase
      .from('work_order_reports')
      .select(`
        *,
        work_orders:work_order_id(
          id,
          work_order_number,
          store_location,
          organizations:organization_id(name)
        ),
        subcontractor:subcontractor_user_id(first_name, last_name, email)
      `)
      .eq('id', work_order_report_id)
      .single()

    if (reportError || !report) {
      throw new Error(`Failed to fetch report: ${reportError?.message}`)
    }

    // Get email template
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_name', 'report_reviewed')
      .eq('is_active', true)
      .single()

    if (templateError || !template) {
      throw new Error(`Failed to fetch email template: ${templateError?.message}`)
    }

    // Prepare template variables
    const variables = {
      subcontractorName: `${report.subcontractor.first_name} ${report.subcontractor.last_name}`,
      workOrderNumber: report.work_orders.work_order_number,
      organizationName: report.work_orders.organizations?.name || 'Unknown Organization',
      storeLocation: report.work_orders.store_location || '',
      status: status,
      reviewNotes: review_notes || 'No additional notes provided.',
      reviewedDate: new Date().toLocaleDateString(),
      reportUrl: `${Deno.env.get('SUPABASE_URL')?.replace('https://', 'https://').replace('.supabase.co', '.lovableproject.com')}/subcontractor/reports/${work_order_report_id}`
    }

    const subject = await interpolateTemplate(template.subject, variables)
    const html = await interpolateTemplate(template.html_content, variables)

    // Send email to subcontractor
    try {
      const emailResponse = await resend.emails.send({
        from: 'WorkOrderPro <notifications@workorderpro.com>',
        to: [report.subcontractor.email],
        subject,
        html,
      })

      if (emailResponse.error) {
        await logEmail(supabase, {
          work_order_id: report.work_orders.id,
          template_name: 'report_reviewed',
          recipient_email: report.subcontractor.email,
          status: 'failed',
          error_message: emailResponse.error.message,
        })
        throw new Error(emailResponse.error.message)
      }

      await logEmail(supabase, {
        work_order_id: report.work_orders.id,
        template_name: 'report_reviewed',
        recipient_email: report.subcontractor.email,
        resend_message_id: emailResponse.data?.id,
        status: 'sent',
      })

      console.log('Review notification email sent successfully to:', report.subcontractor.email)

      return new Response(
        JSON.stringify({ 
          success: true, 
          message_id: emailResponse.data?.id,
          recipient: report.subcontractor.email,
          work_order_report_id,
          status
        }),
        { 
          status: 200, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      )

    } catch (error) {
      await logEmail(supabase, {
        work_order_id: report.work_orders.id,
        template_name: 'report_reviewed',
        recipient_email: report.subcontractor.email,
        status: 'failed',
        error_message: error.message,
      })
      throw error
    }

  } catch (error) {
    console.error('Error in email-report-reviewed function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    )
  }
})