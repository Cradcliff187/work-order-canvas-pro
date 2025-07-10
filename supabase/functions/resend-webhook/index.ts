
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { createHmac } from "https://deno.land/std@0.190.0/crypto/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature',
}

interface ResendWebhookEvent {
  type: string
  created_at: string
  data: {
    id: string
    email: string
    created_at: string
    from: string
    to: string[]
    subject: string
    html?: string
    text?: string
    tags?: string[]
    click?: {
      link: string
      timestamp: string
    }
    bounce?: {
      type: string
    }
    complaint?: {
      type: string
    }
  }
}

// Verify webhook signature from Resend
async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    
    const expectedSignature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
    const expectedSignatureHex = Array.from(new Uint8Array(expectedSignature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    
    return signature === expectedSignatureHex
  } catch (error) {
    console.error('Error verifying webhook signature:', error)
    return false
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

    // Get webhook signature headers
    const signature = req.headers.get('svix-signature')
    const timestamp = req.headers.get('svix-timestamp')
    const webhookId = req.headers.get('svix-id')

    const payload = await req.text()
    
    // Verify webhook signature (optional but recommended)
    const webhookSecret = Deno.env.get('RESEND_WEBHOOK_SECRET')
    if (webhookSecret && signature) {
      const isValid = await verifyWebhookSignature(payload, signature, webhookSecret)
      if (!isValid) {
        console.error('Invalid webhook signature')
        return new Response('Invalid signature', { status: 401 })
      }
    }

    const event: ResendWebhookEvent = JSON.parse(payload)
    console.log('Received Resend webhook event:', event.type, 'for email:', event.data.id)

    // Update email logs based on event type
    let status: 'delivered' | 'failed' | 'bounced' | null = null
    let errorMessage: string | null = null

    switch (event.type) {
      case 'email.sent':
        // Email was successfully sent to Resend
        console.log('Email sent successfully:', event.data.id)
        return new Response('OK', { status: 200, headers: corsHeaders })

      case 'email.delivered':
        status = 'delivered'
        break

      case 'email.delivery_delayed':
        // Email delivery was delayed, but not failed yet
        console.log('Email delivery delayed:', event.data.id)
        return new Response('OK', { status: 200, headers: corsHeaders })

      case 'email.bounced':
        status = 'bounced'
        errorMessage = `Bounce: ${event.data.bounce?.type || 'unknown'}`
        break

      case 'email.complained':
        status = 'failed'
        errorMessage = `Complaint: ${event.data.complaint?.type || 'spam'}`
        break

      case 'email.clicked':
        // Track email clicks (optional)
        console.log('Email clicked:', event.data.id, 'Link:', event.data.click?.link)
        return new Response('OK', { status: 200, headers: corsHeaders })

      case 'email.opened':
        // Track email opens (optional)
        console.log('Email opened:', event.data.id)
        return new Response('OK', { status: 200, headers: corsHeaders })

      default:
        console.log('Unhandled webhook event type:', event.type)
        return new Response('OK', { status: 200, headers: corsHeaders })
    }

    if (status) {
      // Update the email log with the new status
      const updateData: any = {
        status: status,
        error_message: errorMessage,
      }

      if (status === 'delivered') {
        updateData.delivered_at = new Date().toISOString()
      }

      const { error: updateError } = await supabase
        .from('email_logs')
        .update(updateData)
        .eq('resend_message_id', event.data.id)

      if (updateError) {
        console.error('Failed to update email log:', updateError)
        return new Response(
          JSON.stringify({ error: 'Failed to update email log' }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        )
      }

      console.log(`Updated email log for ${event.data.id} with status: ${status}`)
    }

    return new Response('OK', { 
      status: 200, 
      headers: corsHeaders 
    })

  } catch (error) {
    console.error('Error processing Resend webhook:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    )
  }
})
