import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔍 Testing database connectivity and permissions...');

    // Test 1: Basic connection
    const { data: testConnection, error: connectionError } = await supabaseAdmin
      .from('profiles')
      .select('count')
      .limit(1);
    
    console.log('✅ Database connection test:', { success: !connectionError, error: connectionError?.message });

    // Test 2: Check if user_organizations table exists and is accessible
    const { data: userOrgsTest, error: userOrgsError } = await supabaseAdmin
      .from('user_organizations')
      .select('*')
      .limit(1);
    
    console.log('✅ user_organizations table test:', { 
      success: !userOrgsError, 
      error: userOrgsError?.message,
      dataReceived: !!userOrgsTest 
    });

    // Test 3: Check RLS policies
    const { data: rlsTest, error: rlsError } = await supabaseAdmin
      .rpc('jwt_is_admin');
    
    console.log('✅ RLS function test:', { success: !rlsError, error: rlsError?.message });

    // Test 4: Profile creation simulation
    const testUserId = 'test-user-' + crypto.randomUUID();
    const { data: profileTest, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        user_id: testUserId,
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        user_type: 'subcontractor'
      })
      .select()
      .single();
    
    if (profileTest) {
      console.log('✅ Profile creation test: SUCCESS');
      
      // Test 5: User organization relationship
      const { error: userOrgInsertError } = await supabaseAdmin
        .from('user_organizations')
        .insert({
          user_id: profileTest.id,
          organization_id: '8fa4b3eb-16a4-4824-b8a8-bcaa48813b94' // Use a real org ID from your DB
        });
      
      console.log('✅ User organization relationship test:', { 
        success: !userOrgInsertError, 
        error: userOrgInsertError?.message 
      });

      // Cleanup
      await supabaseAdmin.from('user_organizations').delete().eq('user_id', profileTest.id);
      await supabaseAdmin.from('profiles').delete().eq('id', profileTest.id);
    } else {
      console.log('❌ Profile creation test: FAILED', profileError?.message);
    }

    // Test 6: Send email function test
    try {
      const { data: emailTest, error: emailError } = await supabaseAdmin.functions.invoke('send-email', {
        body: {
          template_name: 'auth_confirmation',
          record_id: testUserId,
          record_type: 'auth_user',
          test_mode: true,
          test_recipient: 'test@example.com',
          custom_data: {
            email: 'test@example.com',
            first_name: 'Test',
            confirmation_link: 'https://example.com/confirm'
          }
        }
      });
      
      console.log('✅ Send email function test:', { 
        success: !emailError, 
        error: emailError?.message,
        response: emailTest
      });
    } catch (emailTestError) {
      console.log('❌ Send email function test: ERROR', emailTestError);
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Debug tests completed - check console logs',
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Debug test failed:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});