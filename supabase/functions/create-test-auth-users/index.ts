import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TestUser {
  email: string
  password: string
  first_name: string
  last_name: string
  user_type: 'admin' | 'partner' | 'subcontractor' | 'employee'
  company_name?: string
}

const TEST_USERS: TestUser[] = [
  {
    email: 'partner1@workorderpro.test',
    password: 'TestPass123!',
    first_name: 'John',
    last_name: 'Partner',
    user_type: 'partner'
  },
  {
    email: 'sub1@workorderpro.test', 
    password: 'TestPass123!',
    first_name: 'Mike',
    last_name: 'Contractor',
    user_type: 'subcontractor',
    company_name: 'Pipes & More Plumbing'
  },
  {
    email: 'employee1@workorderpro.test',
    password: 'TestPass123!', 
    first_name: 'Sarah',
    last_name: 'Employee',
    user_type: 'employee'
  }
]

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create admin client using service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🔐 Starting auth user creation process...')

    const results = []
    let successCount = 0
    let errorCount = 0

    // Create each test user
    for (const testUser of TEST_USERS) {
      try {
        console.log(`👤 Creating auth user: ${testUser.email}`)

        // Create auth user
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: testUser.email,
          password: testUser.password,
          email_confirm: true,
          user_metadata: {
            first_name: testUser.first_name,
            last_name: testUser.last_name,
            user_type: testUser.user_type,
            company_name: testUser.company_name
          }
        })

        if (authError) {
          console.error(`❌ Auth user creation failed for ${testUser.email}:`, authError)
          
          // If user already exists, try to update their profile
          if (authError.message.includes('already been registered')) {
            console.log(`📝 User ${testUser.email} already exists, updating profile...`)
            
            // Get existing user
            const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
            const existingUser = existingUsers.users?.find(u => u.email === testUser.email)
            
            if (existingUser) {
              // Update profile if it exists
              const { error: updateError } = await supabaseAdmin
                .from('profiles')
                .upsert({
                  user_id: existingUser.id,
                  email: testUser.email,
                  first_name: testUser.first_name,
                  last_name: testUser.last_name,
                  user_type: testUser.user_type,
                  company_name: testUser.company_name,
                  is_active: true
                })

              if (updateError) {
                console.error(`❌ Profile update failed for ${testUser.email}:`, updateError)
                results.push({
                  email: testUser.email,
                  success: false,
                  error: `Profile update failed: ${updateError.message}`
                })
                errorCount++
              } else {
                console.log(`✅ Profile updated for ${testUser.email}`)
                results.push({
                  email: testUser.email,
                  success: true,
                  action: 'updated'
                })
                successCount++
              }
            } else {
              results.push({
                email: testUser.email,
                success: false,
                error: 'User exists but could not be found'
              })
              errorCount++
            }
          } else {
            results.push({
              email: testUser.email,
              success: false,
              error: authError.message
            })
            errorCount++
          }
          continue
        }

        if (!authData?.user) {
          throw new Error('No user data returned from auth creation')
        }

        console.log(`✅ Auth user created successfully: ${testUser.email}`)
        results.push({
          email: testUser.email,
          success: true,
          action: 'created',
          user_id: authData.user.id
        })
        successCount++

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500))

      } catch (error: any) {
        console.error(`❌ Unexpected error creating ${testUser.email}:`, error)
        results.push({
          email: testUser.email,
          success: false,
          error: error.message
        })
        errorCount++
      }
    }

    // After creating auth users, immediately fix user-organization relationships
    console.log('🔧 Fixing user-organization relationships...')
    
    try {
      const { data: fixResult, error: fixError } = await supabaseAdmin.rpc('fix_existing_test_user_organizations')
      
      if (fixError) {
        console.error('❌ Error fixing user organizations:', fixError)
      } else {
        console.log('✅ User-organization relationships fixed:', fixResult)
      }
    } catch (fixErr) {
      console.error('❌ Failed to fix user organizations:', fixErr)
    }

    console.log(`📊 Auth user creation completed: ${successCount} success, ${errorCount} errors`)

    const response = {
      success: errorCount === 0,
      message: `Auth user creation completed: ${successCount} success, ${errorCount} errors`,
      data: {
        total_users: TEST_USERS.length,
        success_count: successCount,
        error_count: errorCount,
        results: results,
        credentials: TEST_USERS.map(u => ({
          email: u.email,
          password: u.password,
          type: u.user_type
        }))
      }
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error('💥 Fatal error in auth user creation:', error)
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      message: 'Fatal error during auth user creation process'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})