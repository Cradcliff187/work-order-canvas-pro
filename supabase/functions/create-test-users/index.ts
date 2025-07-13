import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestUser {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  user_type: 'admin' | 'partner' | 'subcontractor' | 'employee';
  organization_name: string;
}

interface CreateUserResult {
  email: string;
  success: boolean;
  error?: string;
  organization?: string;
  user_type?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Supabase URL and service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase configuration');
    }

    // Create admin client
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get the authorization header to verify admin access
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    // Verify admin access using regular client
    const regularClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') || '', {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Set the auth token
    await regularClient.auth.setSession({
      access_token: authHeader.replace('Bearer ', ''),
      refresh_token: ''
    });

    // Check if user is admin
    const { data: profile, error: profileError } = await regularClient
      .from('profiles')
      .select('user_type')
      .single();

    if (profileError || profile?.user_type !== 'admin') {
      throw new Error('Admin access required');
    }

    console.log('✅ Admin verification passed');

    // Query existing organizations to get actual IDs
    const { data: organizations, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, organization_type')
      .in('name', [
        'ABC Property Management',
        'XYZ Commercial Properties', 
        'Pipes & More Plumbing',
        'Sparks Electric',
        'WorkOrderPro Internal'
      ]);

    if (orgError) {
      throw new Error(`Failed to fetch organizations: ${orgError.message}`);
    }

    if (!organizations || organizations.length === 0) {
      throw new Error('No test organizations found. Please seed the database first.');
    }

    console.log(`📋 Found ${organizations.length} organizations:`, organizations.map(o => o.name));

    // Create organization mapping
    const orgMap = new Map(organizations.map(org => [org.name, org]));

    // Define test users to create
    const testUsers: TestUser[] = [
      {
        email: 'partner1@workorderpro.test',
        password: 'Test123!',
        first_name: 'Sarah',
        last_name: 'Johnson',
        user_type: 'partner',
        organization_name: 'ABC Property Management'
      },
      {
        email: 'partner2@workorderpro.test',
        password: 'Test123!',
        first_name: 'Michael',
        last_name: 'Chen',
        user_type: 'partner',
        organization_name: 'XYZ Commercial Properties'
      },
      {
        email: 'sub1@workorderpro.test',
        password: 'Test123!',
        first_name: 'Robert',
        last_name: 'Williams',
        user_type: 'subcontractor',
        organization_name: 'Pipes & More Plumbing'
      },
      {
        email: 'sub2@workorderpro.test',
        password: 'Test123!',
        first_name: 'Jennifer',
        last_name: 'Davis',
        user_type: 'subcontractor',
        organization_name: 'Sparks Electric'
      },
      {
        email: 'employee1@workorderpro.test',
        password: 'Test123!',
        first_name: 'David',
        last_name: 'Martinez',
        user_type: 'employee',
        organization_name: 'WorkOrderPro Internal'
      }
    ];

    const results: CreateUserResult[] = [];

    // Process each test user
    for (const testUser of testUsers) {
      const organization = orgMap.get(testUser.organization_name);
      
      if (!organization) {
        results.push({
          email: testUser.email,
          success: false,
          error: `Organization "${testUser.organization_name}" not found`
        });
        continue;
      }

      try {
        console.log(`👤 Creating user: ${testUser.email}`);

        // Check if user already exists
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const userExists = existingUsers?.users?.some(u => u.email === testUser.email);

        if (userExists) {
          results.push({
            email: testUser.email,
            success: false,
            error: 'User already exists',
            organization: organization.name,
            user_type: testUser.user_type
          });
          continue;
        }

        // Create auth user with email confirmation
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
          email: testUser.email,
          password: testUser.password,
          email_confirm: true,
          user_metadata: {
            first_name: testUser.first_name,
            last_name: testUser.last_name,
            user_type: testUser.user_type
          }
        });

        if (authError || !authUser.user) {
          throw new Error(authError?.message || 'Failed to create auth user');
        }

        console.log(`✅ Auth user created: ${authUser.user.id}`);

        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: authUser.user.id,
            email: testUser.email,
            first_name: testUser.first_name,
            last_name: testUser.last_name,
            user_type: testUser.user_type,
            is_active: true,
            is_employee: testUser.user_type === 'employee'
          });

        if (profileError) {
          throw new Error(`Failed to create profile: ${profileError.message}`);
        }

        console.log(`✅ Profile created for: ${testUser.email}`);

        // Get the profile ID
        const { data: newProfile, error: getProfileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', authUser.user.id)
          .single();

        if (getProfileError || !newProfile) {
          throw new Error('Failed to get profile ID');
        }

        // Link user to organization
        const { error: linkError } = await supabase
          .from('user_organizations')
          .insert({
            user_id: newProfile.id,
            organization_id: organization.id
          });

        if (linkError) {
          throw new Error(`Failed to link to organization: ${linkError.message}`);
        }

        console.log(`✅ User linked to organization: ${organization.name}`);

        results.push({
          email: testUser.email,
          success: true,
          organization: organization.name,
          user_type: testUser.user_type
        });

      } catch (error) {
        console.error(`❌ Failed to create user ${testUser.email}:`, error);
        results.push({
          email: testUser.email,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          organization: organization.name,
          user_type: testUser.user_type
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`🎉 User creation completed: ${successCount} created, ${failureCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `User creation completed: ${successCount} created, ${failureCount} failed`,
        results,
        summary: {
          total: results.length,
          created: successCount,
          failed: failureCount,
          password: 'Test123!'
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Edge function error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});