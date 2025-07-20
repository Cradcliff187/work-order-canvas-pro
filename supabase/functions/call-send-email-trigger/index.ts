
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TriggerRequest {
  template_name: string;
  record_id: string;
  record_type: string;
}

const serve_handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { template_name, record_id, record_type }: TriggerRequest = await req.json();
    
    console.log(`Trigger called: ${template_name} for ${record_type} ${record_id}`);

    // Validate inputs
    if (!template_name || !record_id || !record_type) {
      throw new Error('Missing required parameters: template_name, record_id, record_type');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Call the main send-email function
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        template_name,
        record_id,
        record_type,
        test_mode: false
      }
    });

    if (error) {
      console.error('Send email error:', error);
      throw error;
    }

    console.log('Email trigger successful:', data);

    return new Response(JSON.stringify({
      success: true,
      message: 'Email trigger executed successfully',
      data
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Email trigger error:', error);
    return new Response(JSON.stringify({
      error: error.message,
      success: false,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
};

serve(serve_handler);
