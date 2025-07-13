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
    email: 'test-admin@workorderpro.dev',
    password: 'TestPass123!',
    firstName: 'Test',
    lastName: 'Admin',
    userType: 'admin'
  },
  {
    email: 'test-partner@workorderpro.dev', 
    password: 'TestPass123!',
    firstName: 'Test',
    lastName: 'Partner',
    userType: 'partner',
    companyName: 'Test Property Management'
  },
  {
    email: 'test-subcontractor@workorderpro.dev',
    password: 'TestPass123!',
    firstName: 'Test', 
    lastName: 'Subcontractor',
    userType: 'subcontractor',
    companyName: 'Test Plumbing Services'
  },
  {
    email: 'test-employee@workorderpro.dev',
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
        contact_email: 'contact@testproperty.dev',
        contact_phone: '555-0100',
        organization_type: 'partner',
        initials: 'TPM',
        address: '123 Test St, Test City, TX 78701'
      },
      {
        name: 'Test Plumbing Services', 
        contact_email: 'info@testplumbing.dev',
        contact_phone: '555-0200',
        organization_type: 'subcontractor',
        initials: 'TPS',
        address: '456 Plumber Ave, Test City, TX 78702'
      },
      {
        name: 'Internal Test Organization',
        contact_email: 'internal@workorderpro.dev',
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

    // Step 4: Create test users with auth accounts
    console.log('👥 Creating test users...')
    const createdProfiles = []

    for (const user of testUsers) {
      console.log(`Creating user: ${user.email}`)
      
      // Create auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
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

      if (authError) {
        console.error(`❌ Failed to create auth user ${user.email}:`, authError)
        throw new Error(`Auth user creation failed for ${user.email}: ${authError.message}`)
      }

      // Create profile
      const { data: profileData, error: profileError } = await supabaseAdmin
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

      if (profileError) {
        console.error(`❌ Failed to create profile for ${user.email}:`, profileError)
        throw new Error(`Profile creation failed for ${user.email}: ${profileError.message}`)
      }

      createdProfiles.push(profileData)
      console.log(`✅ Created user: ${user.email}`)
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
        contact_email: 'manager@testproperty.dev'
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
        contact_email: 'supervisor@testproperty.dev'
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

    // Final verification
    console.log('🔍 Verifying test environment...')
    const verification = {
      users: createdProfiles.length,
      organizations: orgsData.length,
      workOrders: workOrdersData.length,
      assignments: assignments.length,
      userCredentials: testUsers.map(u => ({
        email: u.email,
        password: u.password,
        type: u.userType
      }))
    }

    console.log('🎉 Test environment setup completed successfully!')
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Complete test environment setup successful',
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