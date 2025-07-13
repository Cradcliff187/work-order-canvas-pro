import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.4'
import { corsHeaders } from '../_shared/cors.ts'

interface TestUser {
  email: string
  password: string
  firstName: string
  lastName: string
  userType: 'admin' | 'partner' | 'subcontractor' | 'employee'
  companyName?: string
}

const testUsers: TestUser[] = [
  {
    email: 'test-admin@workorderpro.test',
    password: 'TestPass123!',
    firstName: 'Test',
    lastName: 'Admin',
    userType: 'admin'
  },
  {
    email: 'test-partner@workorderpro.test', 
    password: 'TestPass123!',
    firstName: 'Test',
    lastName: 'Partner',
    userType: 'partner',
    companyName: 'Test Property Management'
  },
  {
    email: 'test-subcontractor@workorderpro.test',
    password: 'TestPass123!',
    firstName: 'Test', 
    lastName: 'Subcontractor',
    userType: 'subcontractor',
    companyName: 'Test Plumbing Services'
  },
  {
    email: 'test-employee@workorderpro.test',
    password: 'TestPass123!',
    firstName: 'Test',
    lastName: 'Employee', 
    userType: 'employee'
  }
]

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Starting complete test environment setup...')

    // Create service role client for admin operations
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

    // Step 1: Clear existing test data
    console.log('🧹 Clearing existing test data...')
    const { data: clearResult, error: clearError } = await supabaseAdmin.rpc('clear_test_data')
    
    if (clearError) {
      console.error('❌ Failed to clear test data:', clearError)
      throw new Error(`Clear data failed: ${clearError.message}`)
    }
    
    console.log('✅ Test data cleared successfully')

    // Step 2: Create test organizations
    console.log('🏢 Creating test organizations...')
    const organizations = [
      {
        name: 'Test Property Management',
        contact_email: 'contact@testproperty.test',
        contact_phone: '555-0100',
        organization_type: 'partner',
        initials: 'TPM',
        address: '123 Test St, Test City, TX 78701'
      },
      {
        name: 'Test Plumbing Services', 
        contact_email: 'info@testplumbing.test',
        contact_phone: '555-0200',
        organization_type: 'subcontractor',
        initials: 'TPS',
        address: '456 Plumber Ave, Test City, TX 78702'
      },
      {
        name: 'Internal Test Organization',
        contact_email: 'internal@workorderpro.test',
        contact_phone: '555-0300', 
        organization_type: 'internal',
        initials: 'ITO',
        address: '789 Internal Blvd, Test City, TX 78703'
      }
    ]

    const { data: orgsData, error: orgsError } = await supabaseAdmin
      .from('organizations')
      .insert(organizations)
      .select()

    if (orgsError) {
      console.error('❌ Failed to create organizations:', orgsError)
      throw new Error(`Organizations creation failed: ${orgsError.message}`)
    }

    console.log(`✅ Created ${orgsData.length} test organizations`)
    const [partnerOrg, subcontractorOrg, internalOrg] = orgsData

    // Step 3: Create trades if they don't exist
    console.log('🔧 Ensuring trades exist...')
    const trades = [
      { name: 'Plumbing', description: 'Plumbing and pipe work' },
      { name: 'Electrical', description: 'Electrical work and wiring' },
      { name: 'HVAC', description: 'Heating, ventilation, and air conditioning' },
      { name: 'General Maintenance', description: 'General facility maintenance' }
    ]

    const { data: tradesData, error: tradesError } = await supabaseAdmin
      .from('trades')
      .upsert(trades, { onConflict: 'name' })
      .select()

    if (tradesError) {
      console.error('❌ Failed to create trades:', tradesError)
      throw new Error(`Trades creation failed: ${tradesError.message}`)
    }

    console.log(`✅ Ensured ${tradesData.length} trades exist`)

    // Step 4: Create test users with auth accounts (ROCK-SOLID VERSION)
    console.log('👥 Creating test users...')
    const createdProfiles = []
    const userCreationResults = []

    for (let i = 0; i < testUsers.length; i++) {
      const user = testUsers[i]
      console.log(`[${i + 1}/${testUsers.length}] Creating user: ${user.email}`)
      
      try {
        // Check if user already exists first
        const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
        const userExists = existingUser.users.some(u => u.email === user.email)
        
        let authData
        if (userExists) {
          console.log(`⚠️ User ${user.email} already exists, skipping auth creation`)
          authData = { user: existingUser.users.find(u => u.email === user.email) }
        } else {
          // Create auth user
          const authResult = await supabaseAdmin.auth.admin.createUser({
            email: user.email,
            password: user.password,
            email_confirm: true,
            user_metadata: {
              first_name: user.firstName,
              last_name: user.lastName,
              user_type: user.userType,
              company_name: user.companyName
            }
          })

          if (authResult.error) {
            console.error(`❌ Auth creation failed for ${user.email}:`, authResult.error)
            userCreationResults.push({ 
              email: user.email, 
              success: false, 
              step: 'auth', 
              error: authResult.error.message 
            })
            continue
          }
          authData = authResult.data
        }

        if (!authData.user) {
          console.error(`❌ No auth user data for ${user.email}`)
          userCreationResults.push({ 
            email: user.email, 
            success: false, 
            step: 'auth', 
            error: 'No user data returned' 
          })
          continue
        }

        // Check if profile already exists
        const { data: existingProfile } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('user_id', authData.user.id)
          .maybeSingle()

        let profileData
        if (existingProfile) {
          console.log(`⚠️ Profile for ${user.email} already exists, using existing`)
          profileData = existingProfile
        } else {
          // Create profile
          const profileResult = await supabaseAdmin
            .from('profiles')
            .insert({
              user_id: authData.user.id,
              email: user.email,
              first_name: user.firstName,
              last_name: user.lastName,
              user_type: user.userType,
              company_name: user.companyName,
              is_employee: user.userType === 'employee'
            })
            .select()
            .single()

          if (profileResult.error) {
            console.error(`❌ Profile creation failed for ${user.email}:`, profileResult.error)
            userCreationResults.push({ 
              email: user.email, 
              success: false, 
              step: 'profile', 
              error: profileResult.error.message 
            })
            continue
          }
          profileData = profileResult.data
        }

        createdProfiles.push(profileData)
        userCreationResults.push({ 
          email: user.email, 
          success: true, 
          step: 'complete', 
          profile_id: profileData.id 
        })
        console.log(`✅ [${i + 1}/${testUsers.length}] Created user: ${user.email}`)

      } catch (error) {
        console.error(`❌ Unexpected error creating user ${user.email}:`, error)
        userCreationResults.push({ 
          email: user.email, 
          success: false, 
          step: 'unexpected', 
          error: error.message 
        })
      }
    }

    // Report user creation results
    const successfulUsers = userCreationResults.filter(r => r.success).length
    const failedUsers = userCreationResults.filter(r => !r.success)
    
    console.log(`👥 User creation summary: ${successfulUsers}/${testUsers.length} successful`)
    if (failedUsers.length > 0) {
      console.log('❌ Failed user creations:', failedUsers)
    }

    if (createdProfiles.length === 0) {
      throw new Error('No users were created successfully. Cannot continue setup.')
    }

    // Step 5: Create user-organization relationships
    console.log('🔗 Creating user-organization relationships...')
    const userOrgRelationships = []

    // Find users by type
    const adminProfile = createdProfiles.find(p => p.user_type === 'admin')
    const partnerProfile = createdProfiles.find(p => p.user_type === 'partner')  
    const subcontractorProfile = createdProfiles.find(p => p.user_type === 'subcontractor')
    const employeeProfile = createdProfiles.find(p => p.user_type === 'employee')

    // Assign users to organizations
    if (partnerProfile) {
      userOrgRelationships.push({
        user_id: partnerProfile.id,
        organization_id: partnerOrg.id
      })
    }

    if (subcontractorProfile) {
      userOrgRelationships.push({
        user_id: subcontractorProfile.id,
        organization_id: subcontractorOrg.id
      })
    }

    if (employeeProfile) {
      userOrgRelationships.push({
        user_id: employeeProfile.id,
        organization_id: internalOrg.id
      })
    }

    const { error: userOrgError } = await supabaseAdmin
      .from('user_organizations')
      .insert(userOrgRelationships)

    if (userOrgError) {
      console.error('❌ Failed to create user-organization relationships:', userOrgError)
      throw new Error(`User-organization relationships failed: ${userOrgError.message}`)
    }

    console.log(`✅ Created ${userOrgRelationships.length} user-organization relationships`)

    // Step 6: Create partner locations
    console.log('📍 Creating partner locations...')
    const partnerLocations = [
      {
        organization_id: partnerOrg.id,
        location_name: 'Downtown Test Location',
        location_number: '001',
        street_address: '100 Main St',
        city: 'Test City',
        state: 'TX',
        zip_code: '78701',
        contact_name: 'Test Manager',
        contact_email: 'manager@testproperty.test'
      },
      {
        organization_id: partnerOrg.id,
        location_name: 'Uptown Test Location', 
        location_number: '002',
        street_address: '200 Oak Ave',
        city: 'Test City',
        state: 'TX',
        zip_code: '78702',
        contact_name: 'Test Supervisor',
        contact_email: 'supervisor@testproperty.test'
      }
    ]

    const { data: locationsData, error: locationsError } = await supabaseAdmin
      .from('partner_locations')
      .insert(partnerLocations)
      .select()

    if (locationsError) {
      console.error('❌ Failed to create partner locations:', locationsError)
      throw new Error(`Partner locations creation failed: ${locationsError.message}`)
    }

    console.log(`✅ Created ${locationsData.length} partner locations`)

    // Step 7: Create work orders with assignments
    console.log('📋 Creating test work orders...')
    const workOrders = [
      {
        title: 'Emergency: Burst pipe in lobby',
        description: 'Main water line burst causing flooding. Immediate response required.',
        organization_id: partnerOrg.id,
        trade_id: tradesData.find(t => t.name === 'Plumbing')?.id,
        status: 'assigned',
        created_by: adminProfile?.id,
        store_location: 'Downtown Test Location',
        street_address: '100 Main St',
        city: 'Test City',
        state: 'TX',
        zip_code: '78701',
        estimated_hours: 4,
        assigned_to: subcontractorProfile?.id,
        assigned_to_type: 'subcontractor',
        assigned_organization_id: subcontractorOrg.id
      },
      {
        title: 'HVAC System Maintenance',
        description: 'Routine monthly HVAC inspection and filter replacement.',
        organization_id: partnerOrg.id,
        trade_id: tradesData.find(t => t.name === 'HVAC')?.id,
        status: 'in_progress',
        created_by: adminProfile?.id,
        store_location: 'Uptown Test Location',
        street_address: '200 Oak Ave',
        city: 'Test City',
        state: 'TX',
        zip_code: '78702',
        estimated_hours: 3,
        assigned_to: employeeProfile?.id,
        assigned_to_type: 'internal',
        assigned_organization_id: internalOrg.id
      },
      {
        title: 'Electrical Outlet Repair',
        description: 'Multiple outlets not working in conference room.',
        organization_id: partnerOrg.id,
        trade_id: tradesData.find(t => t.name === 'Electrical')?.id,
        status: 'completed',
        created_by: partnerProfile?.id,
        store_location: 'Downtown Test Location',
        street_address: '100 Main St',
        city: 'Test City',
        state: 'TX',
        zip_code: '78701',
        estimated_hours: 2,
        assigned_to: subcontractorProfile?.id,
        assigned_to_type: 'subcontractor',
        assigned_organization_id: subcontractorOrg.id,
        completed_at: new Date(Date.now() - 86400000).toISOString() // 1 day ago
      }
    ]

    const { data: workOrdersData, error: workOrdersError } = await supabaseAdmin
      .from('work_orders')
      .insert(workOrders)
      .select()

    if (workOrdersError) {
      console.error('❌ Failed to create work orders:', workOrdersError)
      throw new Error(`Work orders creation failed: ${workOrdersError.message}`)
    }

    console.log(`✅ Created ${workOrdersData.length} test work orders`)

    // Step 8: Create work order assignments
    console.log('📝 Creating work order assignments...')
    const assignments = workOrdersData
      .filter(wo => wo.assigned_to)
      .map(wo => ({
        work_order_id: wo.id,
        assigned_to: wo.assigned_to,
        assigned_by: adminProfile?.id,
        assigned_organization_id: wo.assigned_organization_id,
        assignment_type: 'lead',
        notes: `Test assignment for ${wo.title}`
      }))

    if (assignments.length > 0) {
      const { error: assignmentsError } = await supabaseAdmin
        .from('work_order_assignments')
        .insert(assignments)

      if (assignmentsError) {
        console.error('❌ Failed to create work order assignments:', assignmentsError)
        throw new Error(`Work order assignments failed: ${assignmentsError.message}`)
      }

      console.log(`✅ Created ${assignments.length} work order assignments`)
    }

    // Step 9: Create sample work order reports
    console.log('📊 Creating sample work order reports...')
    const completedWorkOrder = workOrdersData.find(wo => wo.status === 'completed')
    
    if (completedWorkOrder && subcontractorProfile) {
      const { error: reportError } = await supabaseAdmin
        .from('work_order_reports')
        .insert({
          work_order_id: completedWorkOrder.id,
          subcontractor_user_id: subcontractorProfile.id,
          work_performed: 'Replaced faulty electrical outlets and tested all circuits. All outlets now functioning properly.',
          materials_used: 'GFCI outlets (3), wire nuts, electrical tape',
          hours_worked: 2.5,
          invoice_amount: 385.00,
          status: 'approved',
          reviewed_by_user_id: adminProfile?.id,
          reviewed_at: new Date().toISOString(),
          review_notes: 'Excellent work. Quick resolution of the issue.'
        })

      if (reportError) {
        console.error('❌ Failed to create work order report:', reportError)
        throw new Error(`Work order report creation failed: ${reportError.message}`)
      }

      console.log('✅ Created sample work order report')
    }

    // Final verification and detailed reporting
    console.log('🔍 Verifying test environment...')
    
    const verification = {
      users: createdProfiles.length,
      userCreationResults,
      organizations: orgsData.length,
      workOrders: workOrdersData.length,
      assignments: assignments.length,
      userCredentials: testUsers.map(u => ({
        email: u.email,
        password: u.password,
        type: u.userType
      })),
      testUsersExpected: testUsers.length,
      testUsersCreated: successfulUsers,
      success: successfulUsers === testUsers.length
    }

    const message = successfulUsers === testUsers.length 
      ? '🎉 Complete test environment setup successful - ALL USERS CREATED!'
      : `⚠️ Partial success: ${successfulUsers}/${testUsers.length} users created`

    console.log(message)
    
    return new Response(
      JSON.stringify({
        success: true,
        message,
        data: verification
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('❌ Test environment setup failed:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: 'Complete test environment setup failed. Check function logs for details.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})