import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recipient_email } = await req.json();
    
    if (!recipient_email) {
      throw new Error('recipient_email is required');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const testEmails = [
      {
        template_name: 'auth_confirmation',
        custom_data: {
          user_name: 'Chris Test User',
          confirmation_link: 'https://workorderportal.test/confirm?token=test123'
        }
      },
      {
        template_name: 'password_reset',
        custom_data: {
          user_name: 'Chris Test User',
          reset_link: 'https://workorderportal.test/reset?token=test456'
        }
      },
      {
        template_name: 'work_order_created',
        custom_data: {
          work_order_number: 'TEST-001-001',
          work_order_title: 'Test Work Order',
          organization_name: 'Test Organization'
        }
      },
      {
        template_name: 'work_order_assigned',
        custom_data: {
          work_order_number: 'TEST-002-001',
          work_order_title: 'Test Assignment',
          assignee_name: 'Chris Test User'
        }
      },
      {
        template_name: 'work_order_completed',
        custom_data: {
          work_order_number: 'TEST-003-001',
          work_order_title: 'Test Completion',
          organization_name: 'Test Organization'
        }
      },
      {
        template_name: 'report_submitted',
        custom_data: {
          work_order_number: 'TEST-004-001',
          subcontractor_name: 'Chris Test User',
          report_summary: 'Test report summary'
        }
      },
      {
        template_name: 'report_reviewed',
        custom_data: {
          work_order_number: 'TEST-005-001',
          report_status: 'approved',
          review_notes: 'Test review notes'
        }
      },
      {
        template_name: 'invoice_submitted',
        custom_data: {
          invoice_number: 'INV-TEST-001',
          invoice_amount: '$500.00',
          work_order_numbers: 'TEST-006-001'
        }
      },
      {
        template_name: 'test_email',
        custom_data: {
          test_message: 'This is a test email',
          user_name: 'Chris Test User'
        }
      }
    ];

    const results = [];

    for (const emailTest of testEmails) {
      console.log(`Sending ${emailTest.template_name} to ${recipient_email}`);
      
      try {
        const { data, error } = await supabase.functions.invoke('send-email', {
          body: {
            template_name: emailTest.template_name,
            test_mode: true,
            test_recipient: recipient_email,
            custom_data: emailTest.custom_data
          }
        });

        results.push({
          template: emailTest.template_name,
          success: !error,
          data: data,
          error: error?.message
        });

        console.log(`${emailTest.template_name}: ${error ? 'FAILED' : 'SUCCESS'}`);
        
        // Small delay between emails to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (err) {
        results.push({
          template: emailTest.template_name,
          success: false,
          error: err.message
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      recipient: recipient_email,
      results: results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in test-all-emails function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});