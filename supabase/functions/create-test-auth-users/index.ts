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

    // Set up organization memberships using organization_members table
    console.log('Setting up organization memberships...');
    
    let membershipsCreated = 0;
    
    for (const user of created_users) {
      if (user.action === 'created_new' && user.user_id) {
        try {
          // Get profile ID for the user
          const { data: profile } = await supabaseClient
            .from('profiles')
            .select('id')
            .eq('user_id', user.user_id)
            .single();
            
          if (profile) {
            // Find matching test user to get company name
            const testUser = TEST_USERS.find(tu => tu.email === user.email);
            if (testUser?.company_name) {
              // Find organization by name
              const { data: org } = await supabaseClient
                .from('organizations')
                .select('id, organization_type')
                .eq('name', testUser.company_name)
                .single();
                
              if (org) {
                // Check if membership already exists
                const { data: existing } = await supabaseClient
                  .from('organization_members')
                  .select('id')
                  .eq('user_id', profile.id)
                  .eq('organization_id', org.id)
                  .single();
                  
                if (!existing) {
                  // Create organization membership
                  const { error: memberError } = await supabaseClient
                    .from('organization_members')
                    .insert({
                      user_id: profile.id,
                      organization_id: org.id,
                      role: org.organization_type === 'internal' ? 'admin' : 'member'
                    });
                    
                  if (memberError) {
                    console.error(`Error creating membership for ${user.email}:`, memberError);
                    errors.push({
                      email: user.email,
                      error: memberError.message,
                      action: 'create_membership'
                    });
                  } else {
                    membershipsCreated++;
                    console.log(`Created membership for ${user.email} in ${testUser.company_name}`);
                  }
                }
              }
            }
          }
        } catch (membershipError) {
          console.error(`Error setting up membership for ${user.email}:`, membershipError);
          errors.push({
            email: user.email,
            error: membershipError.message,
            action: 'setup_membership'
          });
        }
      }
    }

    const response = {
      success: true,
      message: `Test user creation completed. Created/updated ${created_users.length} users, ${membershipsCreated} memberships.`,
      created_users,
      errors,
      memberships_created: membershipsCreated,
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