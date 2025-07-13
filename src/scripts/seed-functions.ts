// Browser-compatible version of seed functions
import { supabase } from '@/integrations/supabase/client';

const organizations = [
  // Internal organization
  {
    name: 'WorkOrderPro Internal',
    contact_email: 'admin@workorderpro.com',
    contact_phone: '(555) 000-0000',
    address: '100 Main Street, Suite 200, Business City, BC 12345',
    organization_type: 'internal' as const,
    initials: 'WOP'
  },
  // Partner organizations
  {
    name: 'ABC Property Management',
    contact_email: 'contact@abc.com',
    contact_phone: '(555) 123-4567',
    address: '123 Business Ave, New York, NY 10001',
    organization_type: 'partner' as const,
    initials: 'ABC'
  },
  {
    name: 'XYZ Commercial Properties',
    contact_email: 'contact@xyz.com',
    contact_phone: '(555) 234-5678',
    address: '456 Corporate Blvd, Los Angeles, CA 90210',
    organization_type: 'partner' as const,
    initials: 'XYZ'
  },
  {
    name: 'Premium Facilities Group',
    contact_email: 'contact@premium.com',
    contact_phone: '(555) 345-6789',
    address: '789 Enterprise Dr, Chicago, IL 60601',
    organization_type: 'partner' as const,
    initials: 'PFG'
  },
  // Subcontractor organizations (exactly 4)
  {
    name: 'Pipes & More Plumbing',
    contact_email: 'contact@pipesmore.com',
    contact_phone: '(555) 987-6543',
    address: '456 Trade Ave, Plumber City, PC 67890',
    organization_type: 'subcontractor' as const,
    initials: 'PMP'
  },
  {
    name: 'Sparks Electric',
    contact_email: 'contact@sparkselectric.com',
    contact_phone: '(555) 876-5432',
    address: '789 Electric Blvd, Sparks Town, ST 54321',
    organization_type: 'subcontractor' as const,
    initials: 'SPE'
  },
  {
    name: 'Cool Air HVAC',
    contact_email: 'contact@coolairhvac.com',
    contact_phone: '(555) 765-4321',
    address: '321 HVAC Street, Cool City, CC 43210',
    organization_type: 'subcontractor' as const,
    initials: 'CAH'
  },
  {
    name: 'Fix-It Maintenance',
    contact_email: 'contact@fixit.com',
    contact_phone: '(555) 432-1098',
    address: '147 Repair Road, Fix City, FC 10987',
    organization_type: 'subcontractor' as const,
    initials: 'FIM'
  }
];

const users = [
  // Admin users (employees) - exactly 2
  { email: 'admin@workorderpro.com', first_name: 'Admin', last_name: 'User', user_type: 'admin' as const, organization_name: 'WorkOrderPro Internal', is_employee: true },
  { email: 'employee@workorderpro.com', first_name: 'Emily', last_name: 'Employee', user_type: 'employee' as const, organization_name: 'WorkOrderPro Internal', is_employee: true },
  // Regular employees - exactly 3
  { email: 'senior@workorderpro.com', first_name: 'David', last_name: 'Senior', user_type: 'employee' as const, organization_name: 'WorkOrderPro Internal', is_employee: true, hourly_cost_rate: 75, hourly_billable_rate: 150 },
  { email: 'midlevel@workorderpro.com', first_name: 'Jennifer', last_name: 'Mid', user_type: 'employee' as const, organization_name: 'WorkOrderPro Internal', is_employee: true, hourly_cost_rate: 50, hourly_billable_rate: 100 },
  { email: 'junior@workorderpro.com', first_name: 'Alex', last_name: 'Junior', user_type: 'employee' as const, organization_name: 'WorkOrderPro Internal', is_employee: true, hourly_cost_rate: 35, hourly_billable_rate: 70 },
  // Partner users - exactly 3 (1 per partner)
  { email: 'partner1@abc.com', first_name: 'John', last_name: 'Smith', user_type: 'partner' as const, company_name: 'ABC Property Management', organization_name: 'ABC Property Management' },
  { email: 'partner2@xyz.com', first_name: 'Sarah', last_name: 'Johnson', user_type: 'partner' as const, company_name: 'XYZ Commercial Properties', organization_name: 'XYZ Commercial Properties' },
  { email: 'partner3@premium.com', first_name: 'Mike', last_name: 'Wilson', user_type: 'partner' as const, company_name: 'Premium Facilities Group', organization_name: 'Premium Facilities Group' },
  // Subcontractor users - exactly 6 (distributed across 4 companies)
  { email: 'plumber1@trade.com', first_name: 'Bob', last_name: 'Pipes', user_type: 'subcontractor' as const, company_name: 'Pipes & More Plumbing', organization_name: 'Pipes & More Plumbing' },
  { email: 'plumber2@trade.com', first_name: 'Joe', last_name: 'Wrench', user_type: 'subcontractor' as const, company_name: 'Pipes & More Plumbing', organization_name: 'Pipes & More Plumbing' },
  { email: 'electrician@trade.com', first_name: 'Tom', last_name: 'Sparks', user_type: 'subcontractor' as const, company_name: 'Sparks Electric', organization_name: 'Sparks Electric' },
  { email: 'hvac1@trade.com', first_name: 'Lisa', last_name: 'Cool', user_type: 'subcontractor' as const, company_name: 'Cool Air HVAC', organization_name: 'Cool Air HVAC' },
  { email: 'hvac2@trade.com', first_name: 'Carl', last_name: 'Freeze', user_type: 'subcontractor' as const, company_name: 'Cool Air HVAC', organization_name: 'Cool Air HVAC' },
  { email: 'maintenance@trade.com', first_name: 'Jim', last_name: 'Fix', user_type: 'subcontractor' as const, company_name: 'Fix-It Maintenance', organization_name: 'Fix-It Maintenance' }
];

const trades = [
  { name: 'Plumbing', description: 'Plumbing repairs and maintenance' },
  { name: 'Electrical', description: 'Electrical work and repairs' },
  { name: 'HVAC', description: 'Heating, ventilation, and air conditioning' },
  { name: 'Carpentry', description: 'Wood work and construction' },
  { name: 'Painting', description: 'Interior and exterior painting' },
  { name: 'General Maintenance', description: 'General repairs and maintenance' },
  { name: 'Landscaping', description: 'Grounds and landscaping work' },
  { name: 'Roofing', description: 'Roof repairs and maintenance' },
  { name: 'Flooring', description: 'Floor installation and repair' },
  { name: 'Appliance Repair', description: 'Kitchen and laundry appliance repairs' }
];

const emailTemplates = [
  {
    template_name: 'work_order_received',
    subject: 'New Work Order Received - {{work_order_number}}',
    html_content: '<h1>Work Order Received</h1><p>A new work order has been submitted: {{work_order_number}}</p>',
    text_content: 'Work Order Received\n\nA new work order has been submitted: {{work_order_number}}'
  },
  {
    template_name: 'work_order_assigned',
    subject: 'Work Order Assigned - {{work_order_number}}',
    html_content: '<h1>Work Order Assigned</h1><p>You have been assigned work order: {{work_order_number}}</p>',
    text_content: 'Work Order Assigned\n\nYou have been assigned work order: {{work_order_number}}'
  },
  {
    template_name: 'report_submitted',
    subject: 'Work Report Submitted - {{work_order_number}}',
    html_content: '<h1>Report Submitted</h1><p>A work report has been submitted for: {{work_order_number}}</p>',
    text_content: 'Report Submitted\n\nA work report has been submitted for: {{work_order_number}}'
  },
  {
    template_name: 'report_approved',
    subject: 'Work Report Approved - {{work_order_number}}',
    html_content: '<h1>Report Approved</h1><p>Your work report has been approved for: {{work_order_number}}</p>',
    text_content: 'Report Approved\n\nYour work report has been approved for: {{work_order_number}}'
  },
  {
    template_name: 'work_order_completed',
    subject: 'Work Order Completed - {{work_order_number}}',
    html_content: '<h1>Work Order Completed</h1><p>Work order has been completed: {{work_order_number}}</p>',
    text_content: 'Work Order Completed\n\nWork order has been completed: {{work_order_number}}'
  }
];

// Helper function to get random date in range
const getRandomDate = (startDays: number, endDays: number): string => {
  const start = new Date();
  start.setDate(start.getDate() - Math.abs(startDays));
  const end = new Date();
  end.setDate(end.getDate() - Math.abs(endDays));
  const randomTime = start.getTime() + Math.random() * (end.getTime() - start.getTime());
  return new Date(randomTime).toISOString();
};

// Helper function to get random element from array
const getRandomElement = <T>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};

export const seedDatabase = async () => {
  console.log('🌱 Starting comprehensive database seeding...');

  try {
    // First, clean up existing test data to ensure fresh start
    console.log('🧹 Cleaning up existing test data...');
    
    const testEmails = [
      'admin@workorderpro.com', 'employee@workorderpro.com',
      'senior@workorderpro.com', 'midlevel@workorderpro.com', 'junior@workorderpro.com',
      'partner1@abc.com', 'partner2@xyz.com', 'partner3@premium.com',
      'plumber1@trade.com', 'plumber2@trade.com', 'electrician@trade.com',
      'hvac1@trade.com', 'hvac2@trade.com', 'maintenance@trade.com'
    ];

    // Clean up in correct order to respect foreign key constraints
    await supabase.from('receipt_work_orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('employee_reports').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('receipts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('invoice_work_orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('invoices').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('work_order_reports').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('work_order_assignments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('work_order_attachments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('work_orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('partner_locations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('user_organizations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    // Delete profiles for test users
    await supabase.from('profiles').delete().in('email', testEmails);
    
    // Delete organizations (except potentially existing non-test ones)
    const testOrgNames = organizations.map(org => org.name);
    await supabase.from('organizations').delete().in('name', testOrgNames);

    console.log('✅ Cleanup completed');

    // 1. Create organizations
    console.log('📁 Creating organizations...');
    const { data: createdOrgs, error: orgError } = await supabase
      .from('organizations')
      .upsert(organizations, { 
        onConflict: 'name',
        ignoreDuplicates: false 
      })
      .select();

    if (orgError) {
      console.error('Organization creation error:', orgError);
      throw new Error(`Failed to create organizations: ${orgError.message}`);
    }
    console.log(`✅ Created/updated ${createdOrgs?.length} organizations`);

    // Store organization mappings for later use
    const orgMap = new Map<string, string>();
    createdOrgs?.forEach(org => orgMap.set(org.name, org.id));

    // 2. Create email templates
    console.log('📧 Creating email templates...');
    const { error: templateError } = await supabase
      .from('email_templates')
      .upsert(emailTemplates, { 
        onConflict: 'template_name',
        ignoreDuplicates: false 
      });

    if (templateError) {
      console.error('Email template creation error:', templateError);
      throw new Error(`Failed to create email templates: ${templateError.message}`);
    }
    console.log(`✅ Created/updated ${emailTemplates.length} email templates`);

    // 3. Create trades
    console.log('🔧 Creating trades...');
    const { data: createdTrades, error: tradesError } = await supabase
      .from('trades')
      .upsert(trades, { 
        onConflict: 'name',
        ignoreDuplicates: false 
      })
      .select();

    if (tradesError) {
      console.error('Trades creation error:', tradesError);
      throw new Error(`Failed to create trades: ${tradesError.message}`);
    }
    console.log(`✅ Created/updated ${trades.length} trades`);

    // Store trade mappings
    const tradeMap = new Map<string, string>();
    createdTrades?.forEach(trade => tradeMap.set(trade.name, trade.id));

    // 4. Create users and profiles
    console.log('👥 Creating users and profiles...');
    let createdUserCount = 0;
    let updatedUserCount = 0;
    const userProfiles = new Map<string, { id: string, user_id: string }>();

    for (const user of users) {
      try {
        console.log(`Processing user: ${user.email}`);
        
        // Check if profile already exists (indicates auth user exists)
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id, user_id, user_type, is_employee')
          .eq('email', user.email)
          .single();
        
        let authUserId: string;
        let profileId: string;

        if (existingProfile) {
          // User exists, get their auth user ID
          authUserId = existingProfile.user_id;
          profileId = existingProfile.id;
          // Update profile if needed
          const isEmployee = user.user_type === 'admin' || user.user_type === 'employee';
          if (existingProfile.user_type !== user.user_type || 
              existingProfile.is_employee !== isEmployee) {
            await supabase
              .from('profiles')
              .update({
                user_type: user.user_type,
                is_employee: isEmployee,
                company_name: user.company_name,
                hourly_billable_rate: isEmployee ? (user.hourly_billable_rate || (user.user_type === 'admin' ? 75 : 55)) : null,
                hourly_cost_rate: isEmployee ? (user.hourly_cost_rate || (user.user_type === 'admin' ? 50 : 35)) : null
              })
              .eq('id', profileId);
            console.log(`  ↻ Updated profile for ${user.email}`);
          }
          updatedUserCount++;
        } else {
          // Create new auth user using signUp (browser compatible)
          const { data: authUser, error: authError } = await supabase.auth.signUp({
            email: user.email,
            password: 'Test123!',
            options: {
              data: {
                first_name: user.first_name,
                last_name: user.last_name,
                user_type: user.user_type
              }
            }
          });

          if (authError) {
            console.warn(`  ⚠️ Failed to create auth user ${user.email}:`, authError.message);
            continue;
          }

          if (!authUser.user) {
            console.warn(`  ⚠️ No user returned for ${user.email}`);
            continue;
          }

          authUserId = authUser.user.id;

          // Create profile (will be handled by trigger, but let's ensure it exists)
          const isEmployee = user.user_type === 'admin' || user.user_type === 'employee';
          const { data: newProfile, error: profileError } = await supabase
            .from('profiles')
            .upsert({
              user_id: authUserId,
              email: user.email,
              first_name: user.first_name,
              last_name: user.last_name,
              user_type: user.user_type,
              company_name: user.company_name,
              is_employee: isEmployee,
              hourly_billable_rate: isEmployee ? (user.hourly_billable_rate || (user.user_type === 'admin' ? 75 : 55)) : null,
              hourly_cost_rate: isEmployee ? (user.hourly_cost_rate || (user.user_type === 'admin' ? 50 : 35)) : null
            }, {
              onConflict: 'user_id'
            })
            .select('id')
            .single();

          if (profileError) {
            console.warn(`  ⚠️ Failed to create profile for ${user.email}:`, profileError.message);
            continue;
          }
          profileId = newProfile.id;
          createdUserCount++;
          console.log(`  ✓ Created user and profile for ${user.email}`);
        }

        // Store user profile mapping
        userProfiles.set(user.email, { id: profileId, user_id: authUserId });

        // Handle user-organization relationship
        if (user.organization_name && profileId) {
          const orgId = orgMap.get(user.organization_name);
          if (orgId) {
            // Check if relationship already exists
            const { data: existingRelation } = await supabase
              .from('user_organizations')
              .select('id')
              .eq('user_id', profileId)
              .eq('organization_id', orgId)
              .maybeSingle();

            if (!existingRelation) {
              const { error: relationError } = await supabase
                .from('user_organizations')
                .insert({
                  user_id: profileId,
                  organization_id: orgId
                });

              if (relationError) {
                console.warn(`  ⚠️ Failed to create organization relationship for ${user.email}:`, relationError.message);
              } else {
                console.log(`  ✓ Linked ${user.email} to ${user.organization_name}`);
              }
            }
          } else {
            console.warn(`  ⚠️ Organization not found: ${user.organization_name}`);
          }
        }

      } catch (error) {
        console.warn(`❌ Error processing user ${user.email}:`, error);
      }
    }

    console.log(`✅ Created ${createdUserCount} new users, updated ${updatedUserCount} existing users`);

    // 5. Create partner locations
    console.log('🏢 Creating partner locations...');
    const partnerLocations = [
      {
        organization_id: orgMap.get('ABC Property Management'),
        location_number: '001',
        location_name: 'ABC Downtown Mall',
        street_address: '100 Mall Drive',
        city: 'New York',
        state: 'NY',
        zip_code: '10001',
        contact_name: 'Mall Manager',
        contact_email: 'downtown@abc.com',
        contact_phone: '(555) 111-0001'
      },
      {
        organization_id: orgMap.get('ABC Property Management'),
        location_number: '002',
        location_name: 'ABC Office Plaza',
        street_address: '200 Business Center',
        city: 'New York',
        state: 'NY',
        zip_code: '10002',
        contact_name: 'Plaza Manager',
        contact_email: 'plaza@abc.com',
        contact_phone: '(555) 111-0002'
      },
      {
        organization_id: orgMap.get('XYZ Commercial Properties'),
        location_number: '101',
        location_name: 'XYZ Tech Center',
        street_address: '500 Innovation Blvd',
        city: 'Los Angeles',
        state: 'CA',
        zip_code: '90210',
        contact_name: 'Tech Manager',
        contact_email: 'tech@xyz.com',
        contact_phone: '(555) 222-0101'
      },
      {
        organization_id: orgMap.get('Premium Facilities Group'),
        location_number: 'PFG-001',
        location_name: 'Premium Corporate Tower',
        street_address: '1000 Corporate Way',
        city: 'Chicago',
        state: 'IL',
        zip_code: '60601',
        contact_name: 'Tower Manager',
        contact_email: 'corporate@premium.com',
        contact_phone: '(555) 333-0001'
      }
    ];

    const { error: locationsError } = await supabase
      .from('partner_locations')
      .upsert(partnerLocations, { 
        onConflict: 'organization_id,location_number',
        ignoreDuplicates: false 
      });

    if (locationsError) {
      console.warn('Partner locations creation error:', locationsError);
    } else {
      console.log(`✅ Created/updated ${partnerLocations.length} partner locations`);
    }

    // 6. Create work orders with various statuses
    console.log('📋 Creating work orders...');
    const workOrders = [
      {
        title: 'Plumbing Leak Repair',
        description: 'Main lobby restroom has a persistent leak behind the toilet',
        organization_id: orgMap.get('ABC Property Management'),
        trade_id: tradeMap.get('Plumbing'),
        status: 'completed' as const,
        location_name: 'ABC Downtown Mall',
        location_street_address: '100 Mall Drive',
        location_city: 'New York',
        location_state: 'NY',
        location_zip_code: '10001',
        partner_po_number: 'ABC-2024-001',
        partner_location_number: '001',
        created_by: userProfiles.get('partner1@abc.com')?.id,
        date_submitted: getRandomDate(30, 25),
        date_assigned: getRandomDate(24, 20),
        completed_at: getRandomDate(19, 15),
        estimated_hours: 4,
        actual_hours: 3.5,
        estimated_completion_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      },
      {
        title: 'HVAC Filter Replacement',
        description: 'Quarterly HVAC filter replacement for all units on floors 5-8',
        organization_id: orgMap.get('XYZ Commercial Properties'),
        trade_id: tradeMap.get('HVAC'),
        status: 'in_progress' as const,
        location_name: 'XYZ Tech Center',
        location_street_address: '500 Innovation Blvd',
        location_city: 'Los Angeles',
        location_state: 'CA',
        location_zip_code: '90210',
        partner_po_number: 'XYZ-MAINT-2024-005',
        partner_location_number: '101',
        created_by: userProfiles.get('partner2@xyz.com')?.id || userProfiles.get('partner1@abc.com')?.id,
        date_submitted: getRandomDate(15, 12),
        date_assigned: getRandomDate(11, 8),
        estimated_hours: 8,
        estimated_completion_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      },
      {
        title: 'Electrical Outlet Installation',
        description: 'Install 6 new electrical outlets in conference room A',
        organization_id: orgMap.get('Premium Facilities Group'),
        trade_id: tradeMap.get('Electrical'),
        status: 'assigned' as const,
        location_name: 'Premium Corporate Tower',
        location_street_address: '1000 Corporate Way',
        location_city: 'Chicago',
        location_state: 'IL',
        location_zip_code: '60601',
        partner_po_number: 'PFG-ELEC-001',
        partner_location_number: 'PFG-001',
        created_by: userProfiles.get('partner3@premium.com')?.id,
        date_submitted: getRandomDate(8, 6),
        date_assigned: getRandomDate(5, 3),
        estimated_hours: 6,
        estimated_completion_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      },
      {
        title: 'General Maintenance - Door Repair',
        description: 'Main entrance door handle is loose and needs repair',
        organization_id: orgMap.get('ABC Property Management'),
        trade_id: tradeMap.get('General Maintenance'),
        status: 'received' as const,
        location_name: 'ABC Office Plaza',
        location_street_address: '200 Business Center',
        location_city: 'New York',
        location_state: 'NY',
        location_zip_code: '10002',
        partner_po_number: 'ABC-2024-002',
        partner_location_number: '002',
        created_by: userProfiles.get('partner1@abc.com')?.id,
        date_submitted: getRandomDate(3, 1),
        estimated_hours: 2
      },
      {
        title: 'Emergency Plumbing - Burst Pipe',
        description: 'Emergency repair needed for burst pipe in basement',
        organization_id: orgMap.get('XYZ Commercial Properties'),
        trade_id: tradeMap.get('Plumbing'),
        status: 'cancelled' as const,
        location_name: 'XYZ Tech Center',
        location_street_address: '500 Innovation Blvd',
        location_city: 'Los Angeles',
        location_state: 'CA',
        location_zip_code: '90210',
        partner_po_number: 'XYZ-EMRG-2024-001',
        partner_location_number: '101',
        created_by: userProfiles.get('partner2@xyz.com')?.id || userProfiles.get('partner1@abc.com')?.id,
        date_submitted: getRandomDate(7, 5),
        estimated_hours: 3
      }
    ];

    const { data: createdWorkOrders, error: workOrdersError } = await supabase
      .from('work_orders')
      .insert(workOrders)
      .select();

    if (workOrdersError) {
      console.warn('Work orders creation error:', workOrdersError);
    } else {
      console.log(`✅ Created ${createdWorkOrders?.length || 0} work orders`);
    }

    // 7. Create work order assignments
    if (createdWorkOrders && createdWorkOrders.length > 0) {
      console.log('👥 Creating work order assignments...');
      
      // Validate that we have all required user profiles
      const requiredUsers = ['plumber1@trade.com', 'hvac1@trade.com', 'hvac2@trade.com', 'electrician@trade.com', 'admin@workorderpro.com'];
      const missingUsers = requiredUsers.filter(email => !userProfiles.get(email)?.id);
      
      if (missingUsers.length > 0) {
        console.warn(`⚠️ Missing user profiles for assignments: ${missingUsers.join(', ')}`);
      }
      
      const assignments = [
        {
          work_order_id: createdWorkOrders[0].id, // Plumbing repair
          assigned_to: userProfiles.get('plumber1@trade.com')?.id,
          assigned_by: userProfiles.get('admin@workorderpro.com')?.id,
          assignment_type: 'lead',
          assigned_organization_id: orgMap.get('Pipes & More Plumbing'),
          notes: 'Lead plumber for main repair'
        },
        {
          work_order_id: createdWorkOrders[1].id, // HVAC filters
          assigned_to: userProfiles.get('hvac1@trade.com')?.id,
          assigned_by: userProfiles.get('admin@workorderpro.com')?.id,
          assignment_type: 'lead',
          assigned_organization_id: orgMap.get('Cool Air HVAC'),
          notes: 'Primary HVAC technician'
        },
        {
          work_order_id: createdWorkOrders[1].id, // HVAC filters - multiple assignees
          assigned_to: userProfiles.get('hvac2@trade.com')?.id,
          assigned_by: userProfiles.get('admin@workorderpro.com')?.id,
          assignment_type: 'support',
          assigned_organization_id: orgMap.get('Cool Air HVAC'),
          notes: 'Support technician for large job'
        },
        {
          work_order_id: createdWorkOrders[2].id, // Electrical outlets
          assigned_to: userProfiles.get('electrician@trade.com')?.id,
          assigned_by: userProfiles.get('admin@workorderpro.com')?.id,
          assignment_type: 'lead',
          assigned_organization_id: orgMap.get('Sparks Electric')
        }
      ].filter(assignment => 
        assignment.assigned_to && 
        assignment.assigned_by && 
        assignment.work_order_id && 
        assignment.assigned_organization_id
      );

      const { error: assignmentsError } = await supabase
        .from('work_order_assignments')
        .insert(assignments);

      if (assignmentsError) {
        console.warn('Work order assignments creation error:', assignmentsError);
      } else {
        console.log(`✅ Created ${assignments.length} work order assignments`);
      }
    }

    // 8. Create work order reports
    if (createdWorkOrders && createdWorkOrders.length > 0) {
      console.log('📝 Creating work order reports...');
      const reports = [
        {
          work_order_id: createdWorkOrders[0].id, // Completed plumbing job
          subcontractor_user_id: userProfiles.get('plumber1@trade.com')?.id,
          work_performed: 'Replaced wax ring and toilet bolts. Fixed leak behind toilet in main lobby restroom.',
          materials_used: 'Wax ring, toilet bolts, plumber\'s putty',
          hours_worked: 3.5,
          invoice_amount: 275.00,
          invoice_number: 'PMP-2024-001',
          status: 'approved' as const,
          submitted_at: getRandomDate(16, 14),
          reviewed_at: getRandomDate(13, 12),
          reviewed_by_user_id: userProfiles.get('admin@workorderpro.com')?.id,
          review_notes: 'Work completed satisfactorily. Customer confirmed leak is fixed.'
        },
        {
          work_order_id: createdWorkOrders[1].id, // In-progress HVAC job
          subcontractor_user_id: userProfiles.get('hvac1@trade.com')?.id,
          work_performed: 'Replaced filters on floors 5-6. Still working on floors 7-8.',
          materials_used: 'HVAC filters (various sizes)',
          hours_worked: 4.0,
          invoice_amount: 180.00,
          status: 'submitted' as const,
          submitted_at: getRandomDate(2, 1),
          notes: 'Partial completion report. Will submit final report when job is complete.'
        }
      ];

      const { error: reportsError } = await supabase
        .from('work_order_reports')
        .insert(reports);

      if (reportsError) {
        console.warn('Work order reports creation error:', reportsError);
      } else {
        console.log(`✅ Created ${reports.length} work order reports`);
      }
    }

    // 9. Create sample invoices
    console.log('🧾 Creating sample invoices...');
    
    // Create invoices as submitted with proper ownership
    const invoiceDrafts = [
      {
        status: 'submitted',
        subcontractor_organization_id: orgMap.get('Pipes & More Plumbing'),
        total_amount: 850.00,
        external_invoice_number: 'PMP-INV-2024-003',
        internal_invoice_number: '', // Will be auto-generated by trigger
        submitted_by: userProfiles.get('plumber1@trade.com')?.id,
        submitted_at: new Date().toISOString()
      },
      {
        status: 'submitted',
        subcontractor_organization_id: orgMap.get('Cool Air HVAC'),
        total_amount: 1200.00,
        external_invoice_number: 'CAH-2024-007',
        internal_invoice_number: '', // Will be auto-generated by trigger
        submitted_by: userProfiles.get('hvac1@trade.com')?.id,
        submitted_at: new Date().toISOString()
      },
      {
        status: 'submitted',
        subcontractor_organization_id: orgMap.get('Sparks Electric'),
        total_amount: 750.00,
        external_invoice_number: 'SPE-INV-001',
        internal_invoice_number: '', // Will be auto-generated by trigger
        submitted_by: userProfiles.get('electrician@trade.com')?.id,
        submitted_at: new Date().toISOString()
      }
    ];

    const { data: createdInvoices, error: invoicesError } = await supabase
      .from('invoices')
      .insert(invoiceDrafts)
      .select();

    if (invoicesError) {
      console.warn('Invoices creation error:', invoicesError);
    } else {
      console.log(`✅ Created ${createdInvoices?.length || 0} invoices`);

      // Create invoice work orders (linking invoices to work orders)
      if (createdInvoices && createdWorkOrders && createdInvoices.length > 0) {
        console.log('🔗 Creating invoice work order relationships...');
        const invoiceWorkOrders = [
          {
            invoice_id: createdInvoices[0].id,
            work_order_id: createdWorkOrders[0].id,
            amount: 275.00,
            description: 'Toilet leak repair'
          },
          {
            invoice_id: createdInvoices[0].id,
            work_order_id: createdWorkOrders[4].id, // Cancelled job - partial work done
            amount: 575.00,
            description: 'Partial work before cancellation'
          },
          {
            invoice_id: createdInvoices[1].id,
            work_order_id: createdWorkOrders[1].id,
            amount: 1200.00,
            description: 'HVAC filter replacement floors 5-8'
          }
        ];

        const { error: invoiceWOError } = await supabase
          .from('invoice_work_orders')
          .insert(invoiceWorkOrders);

        if (invoiceWOError) {
          console.warn('Invoice work orders creation error:', invoiceWOError);
        } else {
          console.log(`✅ Created ${invoiceWorkOrders.length} invoice work order relationships`);
        }
      }
    }

    // 10. Create employee receipts
    console.log('🧾 Creating employee receipts...');
    const receipts = [
      {
        employee_user_id: userProfiles.get('admin@workorderpro.com')?.id,
        vendor_name: 'Home Depot',
        amount: 45.67,
        receipt_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        description: 'Emergency plumbing supplies',
        notes: 'For urgent repair at ABC Downtown Mall'
      },
      {
        employee_user_id: userProfiles.get('employee@workorderpro.com')?.id,
        vendor_name: 'Office Depot',
        amount: 23.99,
        receipt_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        description: 'Office supplies for field work',
        notes: 'Work order documentation supplies'
      },
      {
        employee_user_id: userProfiles.get('admin@workorderpro.com')?.id,
        vendor_name: 'Gas Station',
        amount: 35.00,
        receipt_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        description: 'Fuel for site visit',
        notes: 'Travel to Premium Corporate Tower'
      }
    ];

    const { data: createdReceipts, error: receiptsError } = await supabase
      .from('receipts')
      .insert(receipts)
      .select();

    if (receiptsError) {
      console.warn('Receipts creation error:', receiptsError);
    } else {
      console.log(`✅ Created ${createdReceipts?.length || 0} employee receipts`);

      // Create receipt work order allocations
      if (createdReceipts && createdWorkOrders && createdReceipts.length > 0) {
        const receiptAllocations = [
          {
            receipt_id: createdReceipts[0].id,
            work_order_id: createdWorkOrders[0].id,
            allocated_amount: 45.67,
            allocation_notes: 'Full amount allocated to plumbing repair'
          },
          {
            receipt_id: createdReceipts[2].id,
            work_order_id: createdWorkOrders[2].id,
            allocated_amount: 35.00,
            allocation_notes: 'Travel expenses for electrical work'
          }
        ];

        const { error: allocationsError } = await supabase
          .from('receipt_work_orders')
          .insert(receiptAllocations);

        if (allocationsError) {
          console.warn('Receipt allocations creation error:', allocationsError);
        } else {
          console.log(`✅ Created ${receiptAllocations.length} receipt work order allocations`);
        }
      }
    }

    // 11. Create employee reports
    console.log('📊 Creating employee reports...');
    const employeeReports = [
      {
        employee_user_id: userProfiles.get('admin@workorderpro.com')?.id,
        work_order_id: createdWorkOrders?.[0]?.id,
        report_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        hours_worked: 2.0,
        hourly_rate_snapshot: 75.00,
        
        work_performed: 'Supervised plumbing repair and quality inspection',
        notes: 'Ensured work met quality standards and customer satisfaction'
      },
      {
        employee_user_id: userProfiles.get('employee@workorderpro.com')?.id,
        work_order_id: createdWorkOrders?.[1]?.id,
        report_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        hours_worked: 3.5,
        hourly_rate_snapshot: 55.00,
        
        work_performed: 'Coordinated HVAC filter replacement project',
        notes: 'Managed multiple technicians and ensured safety protocols'
      }
    ];

    if (createdWorkOrders && createdWorkOrders.length > 0) {
      const { error: empReportsError } = await supabase
        .from('employee_reports')
        .insert(employeeReports);

      if (empReportsError) {
        console.warn('Employee reports creation error:', empReportsError);
      } else {
        console.log(`✅ Created ${employeeReports.length} employee reports`);
      }
    }

    // Final validation and console output
    const { data: finalProfiles } = await supabase
      .from('profiles')
      .select('email, user_type, is_employee, first_name, last_name')
      .in('email', users.map(u => u.email))
      .order('user_type, email');

    const { data: finalInvoices } = await supabase
      .from('invoices')
      .select('internal_invoice_number, external_invoice_number, status, total_amount, payment_reference')
      .order('created_at');

    const { data: finalWorkOrders } = await supabase
      .from('work_orders')
      .select('work_order_number, title, status')
      .order('created_at');

    // Enhanced console output
    console.log('\n' + '='.repeat(80));
    console.log('🎉 COMPREHENSIVE DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(80));

    console.log('\n📋 DATABASE SUMMARY:');
    console.log(`• Organizations: ${createdOrgs?.length || 0} (1 internal, 3 partners, 4 subcontractors)`);
    console.log(`• Users: ${finalProfiles?.length || 0} total`);
    console.log(`• Work Orders: ${finalWorkOrders?.length || 0} with various statuses`);
    console.log(`• Invoices: ${finalInvoices?.length || 0} with mixed payment statuses`);
    console.log(`• Reports & Receipts: Created with realistic test data`);

    console.log('\n🔑 TEST CREDENTIALS (Password: Test123!):');
    console.log('─'.repeat(50));
    
    const usersByType = finalProfiles?.reduce((acc, profile) => {
      if (!acc[profile.user_type]) acc[profile.user_type] = [];
      acc[profile.user_type].push(profile);
      return acc;
    }, {} as Record<string, any[]>) || {};

    Object.entries(usersByType).forEach(([type, profiles]) => {
      console.log(`\n${type.toUpperCase()} USERS:`);
      profiles.forEach(profile => {
        const role = profile.is_employee ? '(Employee)' : '';
        const rateInfo = profile.is_employee && type === 'employee' ? 
          ` - Cost: $${profile.hourly_cost_rate || 'N/A'}/hr, Billable: $${profile.hourly_billable_rate || 'N/A'}/hr` : '';
        console.log(`  • ${profile.email} - ${profile.first_name} ${profile.last_name} ${role}${rateInfo}`);
      });
    });

    console.log('\n💰 SAMPLE INVOICE DATA:');
    console.log('─'.repeat(50));
    finalInvoices?.forEach(invoice => {
      const paymentInfo = invoice.payment_reference ? ` | Payment: ${invoice.payment_reference}` : '';
      const externalNum = invoice.external_invoice_number ? ` | External: ${invoice.external_invoice_number}` : '';
      console.log(`  • ${invoice.internal_invoice_number} | Status: ${invoice.status} | $${invoice.total_amount}${externalNum}${paymentInfo}`);
    });

    console.log('\n📋 SAMPLE WORK ORDER DATA:');
    console.log('─'.repeat(50));
    finalWorkOrders?.forEach(wo => {
      console.log(`  • ${wo.work_order_number} | ${wo.title} | Status: ${wo.status}`);
    });

    console.log('\n🏢 ORGANIZATION MAPPING:');
    console.log('─'.repeat(50));
    organizations.forEach(org => {
      console.log(`  • ${org.name} (${org.initials}) - Type: ${org.organization_type}`);
    });

    console.log('\n✨ Ready for testing! All major workflows have sample data.');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Comprehensive seeding failed:', error);
    throw error;
  }
};