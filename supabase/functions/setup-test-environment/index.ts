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

    // Step 2: Create essential email templates
    console.log('📧 Creating essential email templates...')
    const emailTemplates = [
      {
        template_name: 'work_order_created',
        subject: 'New Work Order Created: {{work_order_number}}',
        html_content: '<h1>Work Order Created</h1><p>A new work order has been created: {{work_order_title}}</p>',
        text_content: 'Work Order Created\n\nA new work order has been created: {{work_order_title}}',
        is_active: true
      },
      {
        template_name: 'work_order_assigned',
        subject: 'Work Order Assigned: {{work_order_number}}',
        html_content: '<h1>Work Order Assigned</h1><p>Hello {{first_name}}, you have been assigned to work order: {{work_order_title}}</p>',
        text_content: 'Work Order Assigned\n\nHello {{first_name}}, you have been assigned to work order: {{work_order_title}}',
        is_active: true
      },
      {
        template_name: 'work_order_completed',
        subject: 'Work Order Completed: {{work_order_number}}',
        html_content: '<h1>Work Order Completed</h1><p>Work order {{work_order_title}} has been completed.</p>',
        text_content: 'Work Order Completed\n\nWork order {{work_order_title}} has been completed.',
        is_active: true
      },
      {
        template_name: 'report_submitted',
        subject: 'Report Submitted for Work Order: {{work_order_number}}',
        html_content: '<h1>Report Submitted</h1><p>{{subcontractor_name}} has submitted a report for work order: {{work_order_title}}</p>',
        text_content: 'Report Submitted\n\n{{subcontractor_name}} has submitted a report for work order: {{work_order_title}}',
        is_active: true
      },
      {
        template_name: 'report_reviewed',
        subject: 'Report {{status}} for Work Order: {{work_order_number}}',
        html_content: '<h1>Report {{status}}</h1><p>Hello {{first_name}}, your report for work order {{work_order_title}} has been {{status}}.</p>',
        text_content: 'Report {{status}}\n\nHello {{first_name}}, your report for work order {{work_order_title}} has been {{status}}.',
        is_active: true
      }
    ];

    for (const template of emailTemplates) {
      const { error: templateError } = await supabaseAdmin
        .from('email_templates')
        .upsert(template, { onConflict: 'template_name' });
      
      if (templateError) {
        console.error(`❌ Failed to create template ${template.template_name}:`, templateError);
      } else {
        console.log(`✅ Created/updated template: ${template.template_name}`);
      }
    }

    // Step 3: Create test organizations with better conflict handling
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
      .upsert(organizations, { onConflict: 'name' })
      .select()

    if (orgsError) {
      console.error('❌ Failed to create organizations:', orgsError)
      throw new Error(`Organizations creation failed: ${orgsError.message}`)
    }

    console.log(`✅ Created/updated ${orgsData.length} test organizations`)
    const [partnerOrg, subcontractorOrg, internalOrg] = orgsData

    // Step 4: Create trades if they don't exist
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

    // Step 5: Create test users with enhanced error handling
    console.log('👥 Creating test users with enhanced error handling...')
    const createdProfiles = []
    const userCreationResults = []
    const MAX_RETRIES = 3

    // Check existing users efficiently
    const { data: allExistingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUserEmails = new Set(allExistingUsers.users.map(u => u.email))
    
    const { data: allExistingProfiles } = await supabaseAdmin
      .from('profiles')
      .select('user_id, email, id, user_type, first_name, last_name')
    const existingProfilesByEmail = new Map(allExistingProfiles?.map(p => [p.email, p]) || [])

    for (let i = 0; i < testUsers.length; i++) {
      const user = testUsers[i]
      console.log(`[${i + 1}/${testUsers.length}] 🔄 Processing user: ${user.email}`)
      
      let retryCount = 0
      let success = false
      
      while (retryCount < MAX_RETRIES && !success) {
        try {
          let authUser = null
          let profileData = null
          
          // Check if auth user exists
          if (existingUserEmails.has(user.email)) {
            console.log(`📋 Auth user ${user.email} already exists`)
            authUser = allExistingUsers.users.find(u => u.email === user.email)
          } else {
            console.log(`🆕 Creating new auth user: ${user.email}`)
            
            const authResult = await supabaseAdmin.auth.admin.createUser({
              email: user.email,
              password: user.password,
              email_confirm: true,
              user_metadata: {
                first_name: user.firstName,
                last_name: user.lastName,
                user_type: user.userType,
                company_name: user.companyName || null
              }
            })

            if (authResult.error) {
              throw new Error(`Auth creation failed: ${authResult.error.message}`)
            }
            
            authUser = authResult.data?.user
            console.log(`✅ Auth user created: ${user.email}`)
          }

          // Check if profile exists
          const existingProfile = existingProfilesByEmail.get(user.email)
          if (existingProfile) {
            console.log(`📋 Profile for ${user.email} already exists`)
            profileData = existingProfile
          } else {
            console.log(`🆕 Creating new profile: ${user.email}`)
            
            const profileResult = await supabaseAdmin
              .from('profiles')
              .upsert({
                user_id: authUser!.id,
                email: user.email,
                first_name: user.firstName,
                last_name: user.lastName,
                user_type: user.userType,
                company_name: user.companyName || null,
                is_employee: user.userType === 'employee',
                is_active: true
              }, { onConflict: 'email' })
              .select('*')
              .single()

            if (profileResult.error) {
              throw new Error(`Profile creation failed: ${profileResult.error.message}`)
            }
            
            profileData = profileResult.data
            console.log(`✅ Profile created: ${user.email}`)
          }

          createdProfiles.push(profileData)
          userCreationResults.push({ 
            email: user.email, 
            success: true, 
            profile_id: profileData.id,
            auth_user_id: authUser!.id,
            retry_count: retryCount
          })
          
          console.log(`✅ [${i + 1}/${testUsers.length}] Successfully processed user: ${user.email}`)
          success = true

        } catch (error) {
          retryCount++
          const isLastAttempt = retryCount >= MAX_RETRIES
          
          console.error(`❌ Attempt ${retryCount}/${MAX_RETRIES} failed for ${user.email}:`, error.message)
          
          if (isLastAttempt) {
            userCreationResults.push({ 
              email: user.email, 
              success: false, 
              error: error.message,
              retry_count: retryCount
            })
          } else {
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        }
      }
    }

    // Step 6: Create user-organization relationships
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

    // Step 7: Create partner locations
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

    // Step 8: Create work orders with assignments
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

    // Step 9: Create work order assignments
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

    // Step 10: Create sample work order reports
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

    const successfulUsers = userCreationResults.filter(r => r.success).length
    console.log(`👥 User creation summary: ${successfulUsers}/${testUsers.length} successful`)

    return new Response(
      JSON.stringify({
        success: true,
        message: '🎉 Enhanced test environment setup completed successfully!',
        data: {
          users_processed: successfulUsers,
          organizations_created: orgsData.length,
          trades_created: tradesData.length,
          templates_created: emailTemplates.length,
          user_results: userCreationResults
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('❌ Enhanced test environment setup failed:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: 'Enhanced test environment setup failed. Check function logs for details.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
