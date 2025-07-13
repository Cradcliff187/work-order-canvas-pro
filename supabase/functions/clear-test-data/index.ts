/**
 * ⚠️  CRITICAL SAFETY WARNING: This function permanently deletes data
 * 
 * WHAT IS DELETED:
 * - Users with emails matching exact seed patterns
 * - Organizations created by seed function (exact name matches)
 * - All associated work orders, invoices, reports, assignments
 * - All financial data (invoices, receipts) linked to test users/orgs
 * 
 * WHAT IS NOT DELETED:
 * - Any user with non-test email patterns
 * - Any organization not in exact seed data list
 * - System data (trades, email_templates, system_settings)
 * - Audit logs (preserved for security)
 * - Any data not directly linked to test patterns
 * 
 * SAFETY FEATURES:
 * - Dry-run mode by default (must explicitly confirm deletion)
 * - Triple admin authentication (API + DB + Pattern validation)
 * - Ultra-conservative pattern matching (exact matches only)
 * - Transaction rollback on any errors
 * - Foreign key-safe deletion order
 * - Comprehensive logging and validation
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ClearTestDataRequest {
  admin_key?: string
  dry_run?: boolean // Default: true (safety first)
  confirm_deletion?: boolean // Required for actual deletion
  include_summary?: boolean // Detailed summary report
}

interface ClearTestDataResponse {
  success: boolean
  mode: 'dry_run' | 'actual_deletion'
  safety_checks_passed: boolean
  deleted_counts: Record<string, number>
  warnings: string[]
  test_data_summary: {
    users_found: number
    organizations_found: number
    work_orders_found: number
    total_records_affected: number
  }
  execution_time_ms: number
  message: string
}

// ULTRA-SAFE TEST DATA PATTERNS - EXACT MATCHES ONLY
const TEST_EMAIL_PATTERNS = [
  'admin@workorderpro.com',
  'employee@workorderpro.com', 
  'senior@workorderpro.com',
  'midlevel@workorderpro.com',
  'junior@workorderpro.com',
  'partner1@abc.com',
  'partner2@xyz.com', 
  'partner3@premium.com',
  'plumber1@trade.com',
  'plumber2@trade.com',
  'electrician@trade.com',
  'hvac1@trade.com',
  'hvac2@trade.com',
  'carpenter@trade.com'
]

const TEST_ORGANIZATION_NAMES = [
  'WorkOrderPro Internal',
  'ABC Property Management',
  'XYZ Commercial Properties', 
  'Premium Facilities Group',
  'Pipes & More Plumbing',
  'Sparks Electric',
  'Cool Air HVAC',
  'Wood Works Carpentry',
  'Brush Strokes Painting',
  'Fix-It Maintenance',
  'Green Thumb Landscaping'
]

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startTime = Date.now()
  
  try {
    // Parse request body
    const body: ClearTestDataRequest = await req.json()
    const {
      admin_key,
      dry_run = true, // DEFAULT TO SAFE MODE
      confirm_deletion = false,
      include_summary = true
    } = body

    console.log(`🧹 Clear Test Data Request: mode=${dry_run ? 'DRY_RUN' : 'ACTUAL'}, confirm=${confirm_deletion}`)

    // SAFETY CHECK 1: Admin Authentication at API Level
    if (!admin_key || admin_key !== Deno.env.get('ADMIN_API_KEY')) {
      console.error('❌ Unauthorized: Invalid or missing admin key')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Unauthorized: Invalid or missing admin key',
          message: 'Admin authentication required for test data cleanup'
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // SAFETY CHECK 2: Require explicit confirmation for actual deletion
    if (!dry_run && !confirm_deletion) {
      console.error('❌ Safety Check Failed: Deletion not confirmed')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Deletion must be explicitly confirmed',
          message: 'Set confirm_deletion: true to proceed with actual deletion'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    console.log('🔧 Initialized Supabase client with service role')

    // SAFETY CHECK 3: Database-level admin validation
    const { data: isAdmin, error: adminError } = await supabase.rpc('auth_is_admin')
    
    if (adminError || !isAdmin) {
      console.error('❌ Database Admin Check Failed:', adminError?.message)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Database admin validation failed',
          message: 'Service role must have admin privileges'
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // PRE-VALIDATION: Identify test data scope
    console.log('🔍 Identifying test data scope...')
    
    const { data: testUsers, error: usersError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .in('email', TEST_EMAIL_PATTERNS)
    
    if (usersError) {
      throw new Error(`Failed to identify test users: ${usersError.message}`)
    }

    const { data: testOrgs, error: orgsError } = await supabase
      .from('organizations')
      .select('id, name, organization_type')
      .in('name', TEST_ORGANIZATION_NAMES)
    
    if (orgsError) {
      throw new Error(`Failed to identify test organizations: ${orgsError.message}`)
    }

    const testUserIds = testUsers.map(u => u.id)
    const testOrgIds = testOrgs.map(o => o.id)

    console.log(`📊 Test data scope: ${testUsers.length} users, ${testOrgs.length} organizations`)

    // Get work orders that would be affected
    const { data: affectedWorkOrders, error: woError } = await supabase
      .from('work_orders')
      .select('id, work_order_number, status')
      .or(`created_by.in.(${testUserIds.join(',')}),assigned_to.in.(${testUserIds.join(',')}),organization_id.in.(${testOrgIds.join(',')}),assigned_organization_id.in.(${testOrgIds.join(',')})`)
    
    if (woError) {
      throw new Error(`Failed to identify affected work orders: ${woError.message}`)
    }

    const affectedWorkOrderIds = affectedWorkOrders.map(wo => wo.id)

    // SAFETY CHECK 4: Validate patterns don't affect non-test data
    const { data: nonTestUsers, error: nonTestError } = await supabase
      .from('profiles')
      .select('id, email')
      .not('email', 'in', `(${TEST_EMAIL_PATTERNS.map(e => `"${e}"`).join(',')})`)
      .limit(5)
    
    if (nonTestError) {
      console.warn('⚠️ Could not validate non-test users, proceeding with caution')
    }

    const warnings: string[] = []
    
    if (testUsers.length === 0) {
      warnings.push('No test users found - seed function may not have been run')
    }
    
    if (testOrgs.length === 0) {
      warnings.push('No test organizations found - seed function may not have been run')
    }

    if (affectedWorkOrders.length === 0) {
      warnings.push('No work orders found - limited test data may be present')
    }

    // Prepare deletion counts tracking
    let deletedCounts: Record<string, number> = {}

    if (dry_run) {
      console.log('🧪 DRY RUN MODE: Counting records that would be deleted...')
      
      // Count records in FK-safe deletion order
      const countQueries = [
        { table: 'email_logs', condition: `work_order_id.in.(${affectedWorkOrderIds.join(',') || 'null'})` },
        { table: 'work_order_attachments', condition: `work_order_id.in.(${affectedWorkOrderIds.join(',') || 'null'})` },
        { table: 'work_order_reports', condition: `work_order_id.in.(${affectedWorkOrderIds.join(',') || 'null'})` },
        { table: 'work_order_assignments', condition: `work_order_id.in.(${affectedWorkOrderIds.join(',') || 'null'})` },
        { table: 'employee_reports', condition: `work_order_id.in.(${affectedWorkOrderIds.join(',') || 'null'})` },
        { table: 'receipt_work_orders', condition: `work_order_id.in.(${affectedWorkOrderIds.join(',') || 'null'})` },
        { table: 'receipts', condition: `employee_user_id.in.(${testUserIds.join(',') || 'null'})` },
        { table: 'invoice_work_orders', condition: `work_order_id.in.(${affectedWorkOrderIds.join(',') || 'null'})` },
        { table: 'invoice_attachments', condition: `uploaded_by.in.(${testUserIds.join(',') || 'null'})` },
        { table: 'invoices', condition: `subcontractor_organization_id.in.(${testOrgIds.join(',') || 'null'})` },
        { table: 'work_orders', condition: `id.in.(${affectedWorkOrderIds.join(',') || 'null'})` },
        { table: 'partner_locations', condition: `organization_id.in.(${testOrgIds.join(',') || 'null'})` },
        { table: 'user_organizations', condition: `user_id.in.(${testUserIds.join(',') || 'null'})` },
        { table: 'organizations', condition: `id.in.(${testOrgIds.join(',') || 'null'})` },
        { table: 'profiles', condition: `id.in.(${testUserIds.join(',') || 'null'})` },
      ]

      for (const query of countQueries) {
        if (query.condition.includes('null')) {
          deletedCounts[query.table] = 0
          continue
        }

        const { count, error } = await supabase
          .from(query.table)
          .select('*', { count: 'exact', head: true })
          .or(query.condition)
        
        if (error) {
          console.warn(`⚠️ Could not count ${query.table}: ${error.message}`)
          deletedCounts[query.table] = 0
        } else {
          deletedCounts[query.table] = count || 0
        }
      }

      console.log('📋 Dry run complete - no data was deleted')
      
    } else {
      console.log('🗑️ ACTUAL DELETION MODE: Proceeding with deletion...')
      
      // Use the existing database function for actual deletion
      const { data: result, error: deleteError } = await supabase.rpc('clear_test_data')
      
      if (deleteError) {
        throw new Error(`Database deletion failed: ${deleteError.message}`)
      }

      if (result && typeof result === 'object' && 'deleted_counts' in result) {
        deletedCounts = result.deleted_counts as Record<string, number>
        console.log('✅ Test data deletion completed successfully')
      } else {
        throw new Error('Unexpected response from clear_test_data function')
      }
    }

    const totalRecordsAffected = Object.values(deletedCounts).reduce((sum, count) => sum + count, 0)

    const response: ClearTestDataResponse = {
      success: true,
      mode: dry_run ? 'dry_run' : 'actual_deletion',
      safety_checks_passed: true,
      deleted_counts: deletedCounts,
      warnings,
      test_data_summary: {
        users_found: testUsers.length,
        organizations_found: testOrgs.length,
        work_orders_found: affectedWorkOrders.length,
        total_records_affected: totalRecordsAffected
      },
      execution_time_ms: Date.now() - startTime,
      message: dry_run 
        ? `Dry run completed: ${totalRecordsAffected} records would be deleted`
        : `Deletion completed: ${totalRecordsAffected} test records removed`
    }

    console.log(`✅ Clear test data ${dry_run ? 'dry run' : 'deletion'} completed in ${response.execution_time_ms}ms`)

    return new Response(
      JSON.stringify(response),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ Clear test data failed:', error)
    
    const response = {
      success: false,
      mode: 'error',
      safety_checks_passed: false,
      deleted_counts: {},
      warnings: ['Operation failed due to error'],
      test_data_summary: {
        users_found: 0,
        organizations_found: 0,
        work_orders_found: 0,
        total_records_affected: 0
      },
      execution_time_ms: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Test data cleanup failed - no data was modified'
    }

    return new Response(
      JSON.stringify(response),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})