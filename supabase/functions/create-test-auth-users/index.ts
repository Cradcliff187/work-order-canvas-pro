import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.4";

interface TestUser {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  organization_name: string;
  role: 'admin' | 'manager' | 'employee' | 'member';
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Test users with organization assignments
const TEST_USERS: TestUser[] = [
  {
    email: 'partner1@abc.com',
    password: 'TestPass123!',
    first_name: 'Sarah',
    last_name: 'Johnson',
    organization_name: 'ABC Property Management',
    role: 'member'
  },
  {
    email: 'partner2@xyz.com', 
    password: 'TestPass123!',
    first_name: 'Mike',
    last_name: 'Chen',
    organization_name: 'XYZ Commercial Properties',
    role: 'member'
  },
  {
    email: 'partner3@premium.com',
    password: 'TestPass123!',
    first_name: 'Emily', 
    last_name: 'Rodriguez',
    organization_name: 'Premium Facilities Group',
    role: 'member'
  },
  {
    email: 'plumber@pipesmore.com',
    password: 'TestPass123!',
    first_name: 'Tom',
    last_name: 'Wilson', 
    organization_name: 'Pipes & More Plumbing',
    role: 'member'
  },
  {
    email: 'electrician@sparks.com',
    password: 'TestPass123!',
    first_name: 'Lisa',
    last_name: 'Anderson',
    organization_name: 'Sparks Electric',
    role: 'member'
  },
  {
    email: 'hvac@coolair.com',
    password: 'TestPass123!',
    first_name: 'David',
    last_name: 'Martinez',
    organization_name: 'Cool Air HVAC',
    role: 'member'
  },
  {
    email: 'carpenter@woodworks.com',
    password: 'TestPass123!',
    first_name: 'Jessica',
    last_name: 'Taylor',
    organization_name: 'Wood Works Carpentry',
    role: 'member'
  },
  {
    email: 'maintenance@workorderpro.com',
    password: 'TestPass123!',
    first_name: 'Alex',
    last_name: 'Thompson',
    organization_name: 'WorkOrderPro Internal',
    role: 'employee'
  },
  {
    email: 'supervisor@workorderpro.com',
    password: 'TestPass123!',
    first_name: 'Jordan',
    last_name: 'Lee',
    organization_name: 'WorkOrderPro Internal',
    role: 'admin'
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
        user_metadata: {  // Non-security data (user-editable)
          first_name: testUser.first_name,
          last_name: testUser.last_name,
          organization_name: testUser.organization_name
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
                  company_name: testUser.organization_name,
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
                  organization_name: testUser.organization_name
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
              company_name: testUser.organization_name,
              is_active: true,
              is_employee: testUser.role === 'employee'
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
              organization_name: testUser.organization_name
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
            // Find matching test user to get organization name
            const testUser = TEST_USERS.find(tu => tu.email === user.email);
            if (testUser?.organization_name) {
              // Find organization by name
              const { data: org } = await supabaseClient
                .from('organizations')
                .select('id, organization_type')
                .eq('name', testUser.organization_name)
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
                      role: testUser.role
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
                    console.log(`Created membership for ${user.email} in ${testUser.organization_name}`);
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
          organization_name: u.organization_name,
          role: u.role
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