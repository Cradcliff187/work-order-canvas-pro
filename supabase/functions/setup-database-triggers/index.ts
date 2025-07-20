
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const serve_handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Create the call_send_email_trigger function
    const { error: functionError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION public.call_send_email_trigger(
          template_name text,
          record_id uuid,
          record_type text
        )
        RETURNS void
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        DECLARE
          result jsonb;
        BEGIN
          -- Validate inputs
          IF template_name IS NULL OR record_id IS NULL OR record_type IS NULL THEN
            RAISE WARNING 'call_send_email_trigger: Missing required parameters - template: %, record_id: %, record_type: %', 
              template_name, record_id, record_type;
            RETURN;
          END IF;
          
          -- Log the trigger call
          RAISE LOG 'Calling email trigger: % for % record %', template_name, record_type, record_id;
          
          -- Make HTTP request to the edge function
          SELECT content::jsonb INTO result
          FROM http((
            'POST',
            current_setting('app.supabase_url') || '/functions/v1/call-send-email-trigger',
            ARRAY[
              http_header('Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')),
              http_header('Content-Type', 'application/json')
            ],
            'application/json',
            json_build_object(
              'template_name', template_name,
              'record_id', record_id,
              'record_type', record_type
            )::text
          ));
          
          -- Log success
          RAISE LOG 'Email trigger completed successfully for %', template_name;
          
        EXCEPTION WHEN OTHERS THEN
          -- Log error but don't fail the main transaction
          RAISE WARNING 'Email trigger failed for %: %', template_name, SQLERRM;
        END;
        $$;
      `
    });

    if (functionError) {
      console.error('Function creation error:', functionError);
      throw functionError;
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Database triggers setup successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Setup error:', error);
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
