import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.4";

interface TestUser {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  user_type: 'admin' | 'partner' | 'subcontractor' | 'employee';
  company_name?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Test users with single organization assignments
const TEST_USERS: TestUser[] = [
  {
    email: 'partner1@abc.com',
    password: 'TestPass123!',
    first_name: 'Sarah',
    last_name: 'Johnson',
    user_type: 'partner',
    company_name: 'ABC Property Management'
  },
  {
    email: 'partner2@xyz.com', 
    password: 'TestPass123!',
    first_name: 'Mike',
    last_name: 'Chen',
    user_type: 'partner',
    company_name: 'XYZ Commercial Properties'
  },
  {
    email: 'partner3@premium.com',
    password: 'TestPass123!',
    first_name: 'Emily', 
    last_name: 'Rodriguez',
    user_type: 'partner',
    company_name: 'Premium Facilities Group'
  },
  {
    email: 'plumber@pipesmore.com',
    password: 'TestPass123!',
    first_name: 'Tom',
    last_name: 'Wilson', 
    user_type: 'subcontractor',
    company_name: 'Pipes & More Plumbing'
  },
  {
    email: 'electrician@sparks.com',
    password: 'TestPass123!',
    first_name: 'Lisa',
    last_name: 'Anderson',
    user_type: 'subcontractor', 
    company_name: 'Sparks Electric'
  },
  {
    email: 'hvac@coolair.com',
    password: 'TestPass123!',
    first_name: 'David',
    last_name: 'Martinez',
    user_type: 'subcontractor',
    company_name: 'Cool Air HVAC'
  },
  {
    email: 'carpenter@woodworks.com',
    password: 'TestPass123!',
    first_name: 'Jessica',
    last_name: 'Taylor',
    user_type: 'subcontractor',
    company_name: 'Wood Works Carpentry'
  },
  {
    email: 'maintenance@workorderpro.com',
    password: 'TestPass123!',
    first_name: 'Alex',
    last_name: 'Thompson',
    user_type: 'employee',
    company_name: 'WorkOrderPortal'
  },
  {
    email: 'supervisor@workorderpro.com',
    password: 'TestPass123!',
    first_name: 'Jordan',
    last_name: 'Lee',
    user_type: 'employee',
    company_name: 'WorkOrderPortal'
  }
];

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const created_users = [];
    const errors = [];

    console.log(`Starting creation of ${TEST_USERS.length} test users`);

    for (const testUser of TEST_USERS) {
      try {
        console.log(`Creating user: ${testUser.email}`);

        // Create auth user with metadata
      const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
        email: testUser.email,
        password: testUser.password,
        email_confirm: true,
        app_metadata: {  // Security data (admin-only)
          user_type: testUser.user_type
        },
        user_metadata: {  // Non-security data (user-editable)
          first_name: testUser.first_name,
          last_name: testUser.last_name,
          company_name: testUser.company_name
        }
      });

        if (authError) {
          if (authError.message.includes('already registered')) {
            console.log(`User ${testUser.email} already exists, updating profile...`);
            
            // Try to find existing user and update profile
            const { data: existingUsers } = await supabaseClient.auth.admin.listUsers();
            const existingUser = existingUsers.users.find(u => u.email === testUser.email);
            
            if (existingUser) {
              // Update existing profile
              const { error: updateError } = await supabaseClient
                .from('profiles')
                .update({
                  first_name: testUser.first_name,
                  last_name: testUser.last_name,
                  user_type: testUser.user_type,
                  company_name: testUser.company_name,
                  is_active: true,
                  updated_at: new Date().toISOString()
                })
                .eq('user_id', existingUser.id);

              if (updateError) {
                console.error(`Error updating profile for ${testUser.email}:`, updateError);
                errors.push({
                  email: testUser.email,
                  error: updateError.message,
                  action: 'update_profile'
                });
              } else {
                created_users.push({
                  email: testUser.email,
                  action: 'updated_existing',
                  user_type: testUser.user_type
                });
              }
            }
          } else {
            console.error(`Error creating user ${testUser.email}:`, authError);
            errors.push({
              email: testUser.email,
              error: authError.message,
              action: 'create_auth_user'
            });
          }
          continue;
        }

        if (authData.user) {
          console.log(`Successfully created auth user: ${testUser.email}`);
          
          // Create or update profile
          const { error: profileError } = await supabaseClient
            .from('profiles')
            .upsert({
              user_id: authData.user.id,
              email: testUser.email,
              first_name: testUser.first_name,
              last_name: testUser.last_name,
              user_type: testUser.user_type,
              company_name: testUser.company_name,
              is_active: true,
              is_employee: testUser.user_type === 'employee'
            });

          if (profileError) {
            console.error(`Error creating profile for ${testUser.email}:`, profileError);
            errors.push({
              email: testUser.email,
              error: profileError.message,
              action: 'create_profile'
            });
          } else {
            created_users.push({
              email: testUser.email,
              user_id: authData.user.id,
              action: 'created_new',
              user_type: testUser.user_type
            });
          }
        }

      } catch (userError) {
        console.error(`Unexpected error for user ${testUser.email}:`, userError);
        errors.push({
          email: testUser.email,
          error: userError.message,
          action: 'unexpected_error'
        });
      }
    }

    // Now fix user-organization relationships
    console.log('Fixing user-organization relationships...');
    
    const { data: fixResult, error: fixError } = await supabaseClient
      .rpc('fix_existing_test_user_organizations');

    if (fixError) {
      console.error('Error fixing user organizations:', fixError);
      errors.push({
        action: 'fix_user_organizations',
        error: fixError.message
      });
    }

    // Run cleanup to ensure single organization assignments
    console.log('Ensuring single organization assignments...');
    
    const { data: cleanupResult, error: cleanupError } = await supabaseClient
      .rpc('ensure_single_organization_assignment');

    if (cleanupError) {
      console.error('Error in cleanup:', cleanupError);
      errors.push({
        action: 'cleanup_organizations',
        error: cleanupError.message
      });
    }

    const response = {
      success: true,
      message: `Test user creation completed. Created/updated ${created_users.length} users.`,
      created_users,
      errors,
      fix_organizations_result: fixResult,
      cleanup_result: cleanupResult,
      test_credentials: {
        note: 'All test users use password: TestPass123!',
        users: TEST_USERS.map(u => ({
          email: u.email,
          user_type: u.user_type,
          company: u.company_name
        }))
      }
    };

    console.log('Test user creation completed:', response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        message: 'Failed to create test users'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});