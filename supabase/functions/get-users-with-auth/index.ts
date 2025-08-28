import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log('get-users-with-auth function starting')

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Processing get-users-with-auth request')

    // Create supabase client with service role key for admin access
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log('Fetching profiles data')
    
    // Fetch profiles with organization members
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select(`
        *,
        organization_members(
          id,
          role,
          organization_id,
          organization:organizations(
            id,
            name,
            organization_type,
            initials,
            contact_email,
            contact_phone,
            address,
            uses_partner_location_numbers,
            is_active
          )
        )
      `)
      .order('created_at', { ascending: false })

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      throw profilesError
    }

    console.log(`Fetched ${profiles?.length || 0} profiles`)

    // Fetch auth users to get last_sign_in_at
    console.log('Fetching auth users data')
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers()

    if (authError) {
      console.error('Error fetching auth users:', authError)
      throw authError
    }

    console.log(`Fetched ${authData.users?.length || 0} auth users`)

    // Combine profiles with auth data
    const usersWithAuth = profiles?.map(profile => {
      const authUser = authData.users?.find(u => u.id === profile.user_id)
      return {
        ...profile,
        last_sign_in_at: authUser?.last_sign_in_at || null
      }
    }) || []

    console.log(`Successfully combined data for ${usersWithAuth.length} users`)

    return new Response(
      JSON.stringify({ users: usersWithAuth }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in get-users-with-auth function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})