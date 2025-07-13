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
      // ABC Property Management - 4 locations
      {
        organization_id: orgMap.get('ABC Property Management'),
        location_number: '504',
        location_name: 'Downtown Office',
        street_address: '504 Main Street',
        city: 'New York',
        state: 'NY',
        zip_code: '10001',
        contact_name: 'Office Manager',
        contact_email: 'downtown@abc.com',
        contact_phone: '(555) 111-0504'
      },
      {
        organization_id: orgMap.get('ABC Property Management'),
        location_number: '605',
        location_name: 'Warehouse',
        street_address: '605 Industrial Way',
        city: 'Brooklyn',
        state: 'NY',
        zip_code: '11201',
        contact_name: 'Warehouse Supervisor',
        contact_email: 'warehouse@abc.com',
        contact_phone: '(555) 111-0605'
      },
      {
        organization_id: orgMap.get('ABC Property Management'),
        location_number: '708',
        location_name: 'Retail Center',
        street_address: '708 Shopping Blvd',
        city: 'Queens',
        state: 'NY',
        zip_code: '11355',
        contact_name: 'Retail Manager',
        contact_email: 'retail@abc.com',
        contact_phone: '(555) 111-0708',
        is_active: false // Inactive for testing
      },
      {
        organization_id: orgMap.get('ABC Property Management'),
        location_number: '912',
        location_name: 'Distribution Hub',
        street_address: '912 Logistics Drive',
        city: 'Staten Island',
        state: 'NY',
        zip_code: '10314',
        contact_name: 'Distribution Manager',
        contact_email: 'distribution@abc.com',
        contact_phone: '(555) 111-0912'
      },
      // XYZ Commercial Properties - 3 locations
      {
        organization_id: orgMap.get('XYZ Commercial Properties'),
        location_number: '101',
        location_name: 'Tech Center',
        street_address: '500 Innovation Blvd',
        city: 'Los Angeles',
        state: 'CA',
        zip_code: '90210',
        contact_name: 'Tech Manager',
        contact_email: 'tech@xyz.com',
        contact_phone: '(555) 222-0101'
      },
      {
        organization_id: orgMap.get('XYZ Commercial Properties'),
        location_number: '201',
        location_name: 'Business Park',
        street_address: '201 Commerce Ave',
        city: 'San Diego',
        state: 'CA',
        zip_code: '92101',
        contact_name: 'Park Manager',
        contact_email: 'business@xyz.com',
        contact_phone: '(555) 222-0201'
      },
      {
        organization_id: orgMap.get('XYZ Commercial Properties'),
        location_number: '301',
        location_name: 'Medical Complex',
        street_address: '301 Health Plaza',
        city: 'San Francisco',
        state: 'CA',
        zip_code: '94102',
        contact_name: 'Medical Admin',
        contact_email: 'medical@xyz.com',
        contact_phone: '(555) 222-0301',
        is_active: false // Inactive for testing
      },
      // Premium Facilities Group - 3 locations
      {
        organization_id: orgMap.get('Premium Facilities Group'),
        location_number: 'PFG-001',
        location_name: 'Corporate Tower',
        street_address: '1000 Corporate Way',
        city: 'Chicago',
        state: 'IL',
        zip_code: '60601',
        contact_name: 'Tower Manager',
        contact_email: 'corporate@premium.com',
        contact_phone: '(555) 333-0001'
      },
      {
        organization_id: orgMap.get('Premium Facilities Group'),
        location_number: 'PFG-002',
        location_name: 'Manufacturing Plant',
        street_address: '2000 Industry Road',
        city: 'Detroit',
        state: 'MI',
        zip_code: '48201',
        contact_name: 'Plant Manager',
        contact_email: 'plant@premium.com',
        contact_phone: '(555) 333-0002'
      },
      {
        organization_id: orgMap.get('Premium Facilities Group'),
        location_number: 'PFG-003',
        location_name: 'Research Facility',
        street_address: '3000 Science Parkway',
        city: 'Boston',
        state: 'MA',
        zip_code: '02101',
        contact_name: 'Research Director',
        contact_email: 'research@premium.com',
        contact_phone: '(555) 333-0003',
        is_active: false // Inactive for testing
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
      // Count locations by organization
      const locationsByOrg = partnerLocations.reduce((acc, loc) => {
        const orgName = Object.entries(orgMap).find(([_, id]) => id === loc.organization_id)?.[0] || 'Unknown';
        if (!acc[orgName]) acc[orgName] = { total: 0, active: 0, inactive: 0 };
        acc[orgName].total++;
        if (loc.is_active === false) {
          acc[orgName].inactive++;
        } else {
          acc[orgName].active++;
        }
        return acc;
      }, {} as Record<string, { total: number, active: number, inactive: number }>);

      console.log(`✅ Created/updated ${partnerLocations.length} partner locations:`);
      Object.entries(locationsByOrg).forEach(([orgName, counts]) => {
        console.log(`  • ${orgName}: ${counts.total} locations (${counts.active} active, ${counts.inactive} inactive)`);
      });
    }

    // 6. Create diverse work orders with various statuses and assignment patterns
    console.log('📋 Creating work orders...');
    const workOrders = [
      // Single Subcontractor Assignments (5)
      {
        title: 'Plumbing Leak Repair - Downtown Office',
        description: 'Main lobby restroom has a persistent leak behind the toilet',
        organization_id: orgMap.get('ABC Property Management'),
        trade_id: tradeMap.get('Plumbing'),
        status: 'completed' as const,
        location_name: 'ABC Downtown Office',
        location_street_address: '504 Business Plaza',
        location_city: 'New York',
        location_state: 'NY',
        location_zip_code: '10001',
        partner_po_number: 'ABC-2024-001',
        partner_location_number: '504',
        created_by: userProfiles.get('partner1@abc.com')?.id,
        date_submitted: getRandomDate(30, 25),
        date_assigned: getRandomDate(24, 20),
        completed_at: getRandomDate(19, 15),
        estimated_hours: 4,
        actual_hours: 3.5,
        estimated_completion_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      },
      {
        title: 'Electrical Panel Upgrade',
        description: 'Replace outdated electrical panel in server room',
        organization_id: orgMap.get('XYZ Commercial Properties'),
        trade_id: tradeMap.get('Electrical'),
        status: 'in_progress' as const,
        location_name: 'XYZ Tech Center',
        location_street_address: '500 Innovation Blvd',
        location_city: 'Los Angeles',
        location_state: 'CA',
        location_zip_code: '90210',
        partner_po_number: 'XYZ-ELEC-2024-001',
        partner_location_number: '101',
        created_by: userProfiles.get('partner2@xyz.com')?.id || userProfiles.get('partner1@abc.com')?.id,
        date_submitted: getRandomDate(20, 18),
        date_assigned: getRandomDate(17, 15),
        estimated_hours: 8,
        estimated_completion_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      },
      {
        title: 'HVAC System Maintenance',
        description: 'Quarterly HVAC maintenance and filter replacement',
        organization_id: orgMap.get('Premium Facilities Group'),
        trade_id: tradeMap.get('HVAC'),
        status: 'assigned' as const,
        location_name: 'Premium Corporate Tower',
        location_street_address: '1000 Corporate Way',
        location_city: 'Chicago',
        location_state: 'IL',
        location_zip_code: '60601',
        partner_po_number: 'PFG-HVAC-001',
        partner_location_number: 'PFG-001',
        created_by: userProfiles.get('partner3@premium.com')?.id,
        date_submitted: getRandomDate(12, 10),
        date_assigned: getRandomDate(9, 7),
        estimated_hours: 6,
        estimated_completion_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      },
      {
        title: 'General Maintenance - Warehouse Doors',
        description: 'Repair and lubricate all warehouse loading dock doors',
        organization_id: orgMap.get('ABC Property Management'),
        trade_id: tradeMap.get('General Maintenance'),
        status: 'received' as const,
        location_name: 'ABC Warehouse',
        location_street_address: '605 Storage Drive',
        location_city: 'New York',
        location_state: 'NY',
        location_zip_code: '10002',
        partner_po_number: 'ABC-2024-003',
        partner_location_number: '605',
        created_by: userProfiles.get('partner1@abc.com')?.id,
        date_submitted: getRandomDate(8, 6),
        estimated_hours: 4
      },
      {
        title: 'Plumbing Installation - Retail Center',
        description: 'Install new restroom facilities in retail center expansion',
        organization_id: orgMap.get('ABC Property Management'),
        trade_id: tradeMap.get('Plumbing'),
        status: 'assigned' as const,
        location_name: 'ABC Retail Center',
        location_street_address: '708 Shopping Boulevard',
        location_city: 'New York',
        location_state: 'NY',
        location_zip_code: '10003',
        partner_po_number: 'ABC-2024-004',
        partner_location_number: '708',
        created_by: userProfiles.get('partner1@abc.com')?.id,
        date_submitted: getRandomDate(5, 3),
        date_assigned: getRandomDate(2, 1),
        estimated_hours: 12
      },
      
      // Employee Assignments (3)
      {
        title: 'Internal Maintenance - Distribution Hub',
        description: 'Routine maintenance and inspection of distribution hub facilities',
        organization_id: orgMap.get('ABC Property Management'),
        trade_id: tradeMap.get('General Maintenance'),
        status: 'in_progress' as const,
        location_name: 'ABC Distribution Hub',
        location_street_address: '912 Logistics Way',
        location_city: 'New York',
        location_state: 'NY',
        location_zip_code: '10004',
        partner_po_number: 'ABC-2024-005',
        partner_location_number: '912',
        created_by: userProfiles.get('partner1@abc.com')?.id,
        date_submitted: getRandomDate(14, 12),
        date_assigned: getRandomDate(11, 9),
        estimated_hours: 6
      },
      {
        title: 'Facility Safety Inspection',
        description: 'Comprehensive safety inspection of building systems',
        organization_id: orgMap.get('XYZ Commercial Properties'),
        trade_id: tradeMap.get('General Maintenance'),
        status: 'assigned' as const,
        location_name: 'XYZ Innovation Center',
        location_street_address: '200 Future Drive',
        location_city: 'Los Angeles',
        location_state: 'CA',
        location_zip_code: '90211',
        partner_po_number: 'XYZ-SAFE-2024-001',
        partner_location_number: '201',
        created_by: userProfiles.get('partner2@xyz.com')?.id || userProfiles.get('partner1@abc.com')?.id,
        date_submitted: getRandomDate(6, 4),
        date_assigned: getRandomDate(3, 2),
        estimated_hours: 8
      },
      {
        title: 'Emergency Response System Check',
        description: 'Test and verify all emergency response systems',
        organization_id: orgMap.get('Premium Facilities Group'),
        trade_id: tradeMap.get('Electrical'),
        status: 'received' as const,
        location_name: 'Premium Executive Center',
        location_street_address: '300 Business Park',
        location_city: 'Chicago',
        location_state: 'IL',
        location_zip_code: '60602',
        partner_po_number: 'PFG-EMRG-001',
        partner_location_number: 'PFG-002',
        created_by: userProfiles.get('partner3@premium.com')?.id,
        date_submitted: getRandomDate(4, 2),
        estimated_hours: 4
      },

      // Mixed Employee + Subcontractor (3)
      {
        title: 'Complex HVAC Project - Multi-Floor',
        description: 'Major HVAC system upgrade across multiple floors requiring coordination',
        organization_id: orgMap.get('XYZ Commercial Properties'),
        trade_id: tradeMap.get('HVAC'),
        status: 'in_progress' as const,
        location_name: 'XYZ Tech Center',
        location_street_address: '500 Innovation Blvd',
        location_city: 'Los Angeles',
        location_state: 'CA',
        location_zip_code: '90210',
        partner_po_number: 'XYZ-HVAC-2024-002',
        partner_location_number: '101',
        created_by: userProfiles.get('partner2@xyz.com')?.id || userProfiles.get('partner1@abc.com')?.id,
        date_submitted: getRandomDate(18, 16),
        date_assigned: getRandomDate(15, 13),
        estimated_hours: 24
      },
      {
        title: 'Electrical Infrastructure Upgrade',
        description: 'Complete electrical system modernization with backup power',
        organization_id: orgMap.get('Premium Facilities Group'),
        trade_id: tradeMap.get('Electrical'),
        status: 'assigned' as const,
        location_name: 'Premium Corporate Tower',
        location_street_address: '1000 Corporate Way',
        location_city: 'Chicago',
        location_state: 'IL',
        location_zip_code: '60601',
        partner_po_number: 'PFG-ELEC-002',
        partner_location_number: 'PFG-001',
        created_by: userProfiles.get('partner3@premium.com')?.id,
        date_submitted: getRandomDate(10, 8),
        date_assigned: getRandomDate(7, 5),
        estimated_hours: 32
      },
      {
        title: 'Major Plumbing Overhaul',
        description: 'Complete plumbing system replacement in older building section',
        organization_id: orgMap.get('ABC Property Management'),
        trade_id: tradeMap.get('Plumbing'),
        status: 'in_progress' as const,
        location_name: 'ABC Downtown Office',
        location_street_address: '504 Business Plaza',
        location_city: 'New York',
        location_state: 'NY',
        location_zip_code: '10001',
        partner_po_number: 'ABC-2024-006',
        partner_location_number: '504',
        created_by: userProfiles.get('partner1@abc.com')?.id,
        date_submitted: getRandomDate(22, 20),
        date_assigned: getRandomDate(19, 17),
        estimated_hours: 40
      },

      // Estimate Needed Status (2)
      {
        title: 'Roofing Assessment - Downtown Office',
        description: 'Comprehensive roofing inspection and repair estimate needed',
        organization_id: orgMap.get('ABC Property Management'),
        trade_id: tradeMap.get('General Maintenance'),
        status: 'estimate_needed' as const,
        location_name: 'ABC Downtown Office',
        location_street_address: '504 Business Plaza',
        location_city: 'New York',
        location_state: 'NY',
        location_zip_code: '10001',
        partner_po_number: 'ABC-2024-007',
        partner_location_number: '504',
        created_by: userProfiles.get('partner1@abc.com')?.id,
        date_submitted: getRandomDate(7, 5),
        estimated_hours: 16
      },
      {
        title: 'Flooring Replacement Project',
        description: 'Complete flooring assessment and replacement estimate for office areas',
        organization_id: orgMap.get('Premium Facilities Group'),
        trade_id: tradeMap.get('General Maintenance'),
        status: 'estimate_needed' as const,
        location_name: 'Premium Innovation Hub',
        location_street_address: '400 Technology Drive',
        location_city: 'Chicago',
        location_state: 'IL',
        location_zip_code: '60603',
        partner_po_number: 'PFG-FLOOR-001',
        partner_location_number: 'PFG-003',
        created_by: userProfiles.get('partner3@premium.com')?.id,
        date_submitted: getRandomDate(9, 7),
        estimated_hours: 20
      },

      // Completed with Reports (2) - Additional completed work orders
      {
        title: 'Electrical Repair - Completed',
        description: 'Repair of faulty electrical circuits in office building',
        organization_id: orgMap.get('XYZ Commercial Properties'),
        trade_id: tradeMap.get('Electrical'),
        status: 'completed' as const,
        location_name: 'XYZ Tech Center',
        location_street_address: '500 Innovation Blvd',
        location_city: 'Los Angeles',
        location_state: 'CA',
        location_zip_code: '90210',
        partner_po_number: 'XYZ-ELEC-2024-003',
        partner_location_number: '101',
        created_by: userProfiles.get('partner2@xyz.com')?.id || userProfiles.get('partner1@abc.com')?.id,
        date_submitted: getRandomDate(25, 23),
        date_assigned: getRandomDate(22, 20),
        completed_at: getRandomDate(19, 17),
        estimated_hours: 6,
        actual_hours: 5.5,
        estimated_completion_date: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }
    ];

    const { data: createdWorkOrders, error: workOrdersError } = await supabase
      .from('work_orders')
      .insert(workOrders)
      .select();

    if (workOrdersError) {
      console.warn('Work orders creation error:', workOrdersError);
    } else {
      // Enhanced console logging with breakdown
      const statusCounts = createdWorkOrders?.reduce((acc, wo) => {
        acc[wo.status] = (acc[wo.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const orgCounts = createdWorkOrders?.reduce((acc, wo) => {
        const orgName = Object.keys(orgMap).find(name => orgMap.get(name) === wo.organization_id) || 'Unknown';
        acc[orgName] = (acc[orgName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const abcLocationCounts = createdWorkOrders?.filter(wo => 
        Object.keys(orgMap).find(name => orgMap.get(name) === wo.organization_id) === 'ABC Property Management'
      ).reduce((acc, wo) => {
        acc[wo.partner_location_number || 'No Location'] = (acc[wo.partner_location_number || 'No Location'] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      console.log(`✅ Created ${createdWorkOrders?.length || 0} work orders:`);
      console.log('  📊 By Status:', statusCounts);
      console.log('  🏢 By Organization:', orgCounts);
      console.log('  📍 ABC Location Usage:', abcLocationCounts);
    }

    // 7. Create work order assignments
    if (createdWorkOrders && createdWorkOrders.length > 0) {
      console.log('👥 Creating work order assignments...');
      
      // Validate that we have all required user profiles
      const requiredUsers = [
        'plumber1@trade.com', 'plumber2@trade.com', 'hvac1@trade.com', 'hvac2@trade.com', 
        'electrician@trade.com', 'maintenance@trade.com', 'admin@workorderpro.com',
        'senior@workorderpro.com', 'midlevel@workorderpro.com', 'junior@workorderpro.com', 'employee@workorderpro.com'
      ];
      const missingUsers = requiredUsers.filter(email => !userProfiles.get(email)?.id);
      
      if (missingUsers.length > 0) {
        console.warn(`⚠️ Missing user profiles for assignments: ${missingUsers.join(', ')}`);
      }
      
      const assignments = [
        // Single Subcontractor Assignments (5)
        {
          work_order_id: createdWorkOrders[0].id, // Plumbing repair - completed
          assigned_to: userProfiles.get('plumber1@trade.com')?.id,
          assigned_by: userProfiles.get('admin@workorderpro.com')?.id,
          assignment_type: 'lead',
          assigned_organization_id: orgMap.get('Pipes & More Plumbing'),
          notes: 'Lead plumber for downtown office repair'
        },
        {
          work_order_id: createdWorkOrders[1].id, // Electrical panel upgrade
          assigned_to: userProfiles.get('electrician@trade.com')?.id,
          assigned_by: userProfiles.get('admin@workorderpro.com')?.id,
          assignment_type: 'lead',
          assigned_organization_id: orgMap.get('Sparks Electric'),
          notes: 'Lead electrician for panel upgrade'
        },
        {
          work_order_id: createdWorkOrders[2].id, // HVAC maintenance
          assigned_to: userProfiles.get('hvac1@trade.com')?.id,
          assigned_by: userProfiles.get('admin@workorderpro.com')?.id,
          assignment_type: 'lead',
          assigned_organization_id: orgMap.get('Cool Air HVAC'),
          notes: 'Primary HVAC technician'
        },
        {
          work_order_id: createdWorkOrders[3].id, // General maintenance - warehouse
          assigned_to: userProfiles.get('maintenance@trade.com')?.id,
          assigned_by: userProfiles.get('admin@workorderpro.com')?.id,
          assignment_type: 'lead',
          assigned_organization_id: orgMap.get('Fix-It Maintenance'),
          notes: 'Warehouse door specialist'
        },
        {
          work_order_id: createdWorkOrders[4].id, // Plumbing installation
          assigned_to: userProfiles.get('plumber2@trade.com')?.id,
          assigned_by: userProfiles.get('admin@workorderpro.com')?.id,
          assignment_type: 'lead',
          assigned_organization_id: orgMap.get('Pipes & More Plumbing'),
          notes: 'Installation specialist'
        },

        // Employee Assignments (3)
        {
          work_order_id: createdWorkOrders[5].id, // Internal maintenance - distribution hub
          assigned_to: userProfiles.get('senior@workorderpro.com')?.id,
          assigned_by: userProfiles.get('admin@workorderpro.com')?.id,
          assignment_type: 'lead',
          assigned_organization_id: null, // Internal assignment
          notes: 'Senior employee for internal maintenance'
        },
        {
          work_order_id: createdWorkOrders[6].id, // Facility safety inspection
          assigned_to: userProfiles.get('midlevel@workorderpro.com')?.id,
          assigned_by: userProfiles.get('admin@workorderpro.com')?.id,
          assignment_type: 'lead',
          assigned_organization_id: null, // Internal assignment
          notes: 'Safety inspection specialist'
        },
        {
          work_order_id: createdWorkOrders[7].id, // Emergency response system check
          assigned_to: userProfiles.get('junior@workorderpro.com')?.id,
          assigned_by: userProfiles.get('admin@workorderpro.com')?.id,
          assignment_type: 'lead',
          assigned_organization_id: null, // Internal assignment
          notes: 'Emergency systems technician'
        },

        // Mixed Employee + Subcontractor Assignments (3)
        {
          work_order_id: createdWorkOrders[8].id, // Complex HVAC project - subcontractor lead
          assigned_to: userProfiles.get('hvac2@trade.com')?.id,
          assigned_by: userProfiles.get('admin@workorderpro.com')?.id,
          assignment_type: 'lead',
          assigned_organization_id: orgMap.get('Cool Air HVAC'),
          notes: 'Lead HVAC contractor for complex project'
        },
        {
          work_order_id: createdWorkOrders[8].id, // Complex HVAC project - employee support
          assigned_to: userProfiles.get('employee@workorderpro.com')?.id,
          assigned_by: userProfiles.get('admin@workorderpro.com')?.id,
          assignment_type: 'support',
          assigned_organization_id: null,
          notes: 'Internal coordination and support'
        },
        {
          work_order_id: createdWorkOrders[9].id, // Electrical infrastructure - subcontractor lead
          assigned_to: userProfiles.get('electrician@trade.com')?.id,
          assigned_by: userProfiles.get('admin@workorderpro.com')?.id,
          assignment_type: 'lead',
          assigned_organization_id: orgMap.get('Sparks Electric'),
          notes: 'Lead electrician for infrastructure upgrade'
        },
        {
          work_order_id: createdWorkOrders[9].id, // Electrical infrastructure - employee support
          assigned_to: userProfiles.get('senior@workorderpro.com')?.id,
          assigned_by: userProfiles.get('admin@workorderpro.com')?.id,
          assignment_type: 'support',
          assigned_organization_id: null,
          notes: 'Senior oversight and coordination'
        },
        {
          work_order_id: createdWorkOrders[10].id, // Major plumbing overhaul - subcontractor lead
          assigned_to: userProfiles.get('plumber1@trade.com')?.id,
          assigned_by: userProfiles.get('admin@workorderpro.com')?.id,
          assignment_type: 'lead',
          assigned_organization_id: orgMap.get('Pipes & More Plumbing'),
          notes: 'Lead plumber for major overhaul'
        },
        {
          work_order_id: createdWorkOrders[10].id, // Major plumbing overhaul - employee support
          assigned_to: userProfiles.get('midlevel@workorderpro.com')?.id,
          assigned_by: userProfiles.get('admin@workorderpro.com')?.id,
          assignment_type: 'support',
          assigned_organization_id: null,
          notes: 'Project coordination and quality control'
        }
      ].filter(assignment => 
        assignment.assigned_to && 
        assignment.assigned_by && 
        assignment.work_order_id
      );

      const { error: assignmentsError } = await supabase
        .from('work_order_assignments')
        .insert(assignments);

      if (assignmentsError) {
        console.warn('Work order assignments creation error:', assignmentsError);
      } else {
        // Count assignment patterns
        const singleAssignments = createdWorkOrders?.filter(wo => 
          assignments.filter(a => a.work_order_id === wo.id).length === 1
        ).length || 0;
        
        const multiAssignments = createdWorkOrders?.filter(wo => 
          assignments.filter(a => a.work_order_id === wo.id).length > 1
        ).length || 0;

        const employeeAssignments = assignments.filter(a => a.assigned_organization_id === null).length;
        const subcontractorAssignments = assignments.filter(a => a.assigned_organization_id !== null).length;

        console.log(`✅ Created ${assignments.length} work order assignments:`);
        console.log(`  • Single assignee work orders: ${singleAssignments}`);
        console.log(`  • Multi assignee work orders: ${multiAssignments}`);
        console.log(`  • Employee assignments: ${employeeAssignments}`);
        console.log(`  • Subcontractor assignments: ${subcontractorAssignments}`);
      }
    }

    // 8. Create work order reports
    if (createdWorkOrders && createdWorkOrders.length > 0) {
      console.log('📝 Creating work order reports...');
      const reports = [
        {
          work_order_id: createdWorkOrders[0].id, // Completed plumbing job
          subcontractor_user_id: userProfiles.get('plumber1@trade.com')?.id,
          work_performed: 'Replaced wax ring and toilet bolts. Fixed leak behind toilet in main lobby restroom. Tested all connections and verified proper drainage.',
          materials_used: 'Wax ring, toilet bolts, plumber\'s putty, supply line',
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
          work_order_id: createdWorkOrders[14].id, // Completed electrical job
          subcontractor_user_id: userProfiles.get('electrician@trade.com')?.id,
          work_performed: 'Diagnosed and repaired faulty electrical circuits. Replaced damaged wiring and tested all connections. Updated circuit labeling.',
          materials_used: 'Electrical wire (12 AWG), wire nuts, circuit breakers, electrical tape',
          hours_worked: 5.5,
          invoice_amount: 425.00,
          invoice_number: 'SPE-2024-002',
          status: 'approved' as const,
          submitted_at: getRandomDate(18, 16),
          reviewed_at: getRandomDate(15, 14),
          reviewed_by_user_id: userProfiles.get('admin@workorderpro.com')?.id,
          review_notes: 'Excellent work. All electrical systems functioning properly.'
        },
        {
          work_order_id: createdWorkOrders[1].id, // In-progress electrical panel upgrade
          subcontractor_user_id: userProfiles.get('electrician@trade.com')?.id,
          work_performed: 'Removed old electrical panel and began installation of new 200-amp panel. Phase 1 complete.',
          materials_used: 'New electrical panel, breakers, conduit',
          hours_worked: 6.0,
          invoice_amount: 850.00,
          status: 'submitted' as const,
          submitted_at: getRandomDate(2, 1),
          notes: 'Phase 1 of 2 complete. Will continue with final connections next week.'
        }
      ];

      const { error: reportsError } = await supabase
        .from('work_order_reports')
        .insert(reports);

      if (reportsError) {
        console.warn('Work order reports creation error:', reportsError);
      } else {
        const approvedReports = reports.filter(r => r.status === 'approved').length;
        const submittedReports = reports.filter(r => r.status === 'submitted').length;
        
        console.log(`✅ Created ${reports.length} work order reports:`);
        console.log(`  • Approved reports: ${approvedReports}`);
        console.log(`  • Submitted reports: ${submittedReports}`);
      }
    }

    // 9. Create comprehensive invoices (10 total with various states)
    console.log('🧾 Creating comprehensive invoice examples...');
    
    // Define 10 invoices with all statuses and realistic patterns
    const comprehensiveInvoices = [
      // DRAFT INVOICES (3) - No internal numbers, not submitted yet
      {
        status: 'draft',
        subcontractor_organization_id: orgMap.get('Pipes & More Plumbing'),
        external_invoice_number: 'PMP-INV-2024-142',
        total_amount: 650.00,
        internal_invoice_number: '', // Empty for drafts
        submitted_by: userProfiles.get('plumber1@trade.com')?.id, // For draft tracking
        submitted_at: null,
      },
      {
        status: 'draft',
        subcontractor_organization_id: orgMap.get('Fix-It Maintenance'),
        external_invoice_number: 'FIM-2024-089',
        total_amount: 1200.00,
        internal_invoice_number: '',
        submitted_by: userProfiles.get('maintenance@trade.com')?.id,
        submitted_at: null,
      },
      {
        status: 'draft',
        subcontractor_organization_id: orgMap.get('Cool Air HVAC'),
        external_invoice_number: 'CAH-INV-215',
        total_amount: 2800.00,
        internal_invoice_number: '',
        submitted_by: userProfiles.get('hvac1@trade.com')?.id,
        submitted_at: null,
      },

      // SUBMITTED INVOICES (3) - Pending admin approval
      {
        status: 'submitted',
        subcontractor_organization_id: orgMap.get('Sparks Electric'),
        external_invoice_number: 'SPE-2024-067',
        total_amount: 875.00,
        internal_invoice_number: '', // Will be auto-generated by trigger
        submitted_by: userProfiles.get('electrician@trade.com')?.id,
        submitted_at: new Date('2024-12-10').toISOString(),
      },
      {
        status: 'submitted',
        subcontractor_organization_id: orgMap.get('Pipes & More Plumbing'),
        external_invoice_number: 'PMP-INV-2024-143',
        total_amount: 1450.00,
        internal_invoice_number: '',
        submitted_by: userProfiles.get('plumber1@trade.com')?.id,
        submitted_at: new Date('2024-12-08').toISOString(),
      },
      {
        status: 'submitted',
        subcontractor_organization_id: orgMap.get('Cool Air HVAC'),
        external_invoice_number: 'CAH-INV-216',
        total_amount: 3200.00,
        internal_invoice_number: '',
        submitted_by: userProfiles.get('hvac1@trade.com')?.id,
        submitted_at: new Date('2024-12-09').toISOString(),
      },

      // APPROVED INVOICES (2) - Approved but not yet paid
      {
        status: 'approved',
        subcontractor_organization_id: orgMap.get('Fix-It Maintenance'),
        external_invoice_number: 'FIM-2024-090',
        total_amount: 950.00,
        internal_invoice_number: '',
        submitted_by: userProfiles.get('maintenance@trade.com')?.id,
        submitted_at: new Date('2024-12-05').toISOString(),
        approved_by: userProfiles.get('admin@workorderpro.com')?.id,
        approved_at: new Date('2024-12-07').toISOString(),
        approval_notes: 'Excellent maintenance work, approved for payment'
      },
      {
        status: 'approved',
        subcontractor_organization_id: orgMap.get('Sparks Electric'),
        external_invoice_number: 'SPE-2024-068',
        total_amount: 2100.00,
        internal_invoice_number: '',
        submitted_by: userProfiles.get('electrician@trade.com')?.id,
        submitted_at: new Date('2024-12-03').toISOString(),
        approved_by: userProfiles.get('admin@workorderpro.com')?.id,
        approved_at: new Date('2024-12-06').toISOString(),
        approval_notes: 'Electrical upgrade completed to code, ready for payment'
      },

      // PAID INVOICES (2) - Completed with payment references
      {
        status: 'paid',
        subcontractor_organization_id: orgMap.get('Pipes & More Plumbing'),
        external_invoice_number: 'PMP-INV-2024-141',
        total_amount: 725.00,
        internal_invoice_number: '',
        submitted_by: userProfiles.get('plumber1@trade.com')?.id,
        submitted_at: new Date('2024-11-28').toISOString(),
        approved_by: userProfiles.get('admin@workorderpro.com')?.id,
        approved_at: new Date('2024-11-30').toISOString(),
        paid_at: new Date('2024-12-01').toISOString(),
        payment_reference: 'ACH-20241201-PMP001',
        approval_notes: 'Emergency plumbing repair completed satisfactorily'
      },
      {
        status: 'paid',
        subcontractor_organization_id: orgMap.get('Cool Air HVAC'),
        external_invoice_number: 'CAH-INV-214',
        total_amount: 4200.00,
        internal_invoice_number: '',
        submitted_by: userProfiles.get('hvac1@trade.com')?.id,
        submitted_at: new Date('2024-11-25').toISOString(),
        approved_by: userProfiles.get('admin@workorderpro.com')?.id,
        approved_at: new Date('2024-11-28').toISOString(),
        paid_at: new Date('2024-11-28').toISOString(),
        payment_reference: 'CHECK-20241128-CAH007',
        approval_notes: 'Large HVAC installation project - excellent quality work'
      }
    ];

    const { data: createdInvoices, error: invoicesError } = await supabase
      .from('invoices')
      .insert(comprehensiveInvoices)
      .select();

    if (invoicesError) {
      console.warn('Invoices creation error:', invoicesError);
    } else {
      console.log(`✅ Created ${createdInvoices?.length || 0} comprehensive invoices`);

      // Create detailed invoice work order relationships (line items)
      if (createdInvoices && createdWorkOrders && createdInvoices.length > 0) {
        console.log('🔗 Creating comprehensive invoice work order relationships...');
        
        const comprehensiveInvoiceWorkOrders = [
          // Draft Invoice #1 (Pipes & More) - Single work order
          {
            invoice_id: createdInvoices[0].id,
            work_order_id: createdWorkOrders[0].id,
            amount: 650.00,
            description: 'Emergency toilet leak repair and pipe replacement'
          },
          
          // Draft Invoice #2 (Fix-It) - Multi work order
          {
            invoice_id: createdInvoices[1].id,
            work_order_id: createdWorkOrders[5].id,
            amount: 700.00,
            description: 'General maintenance and safety inspection'
          },
          {
            invoice_id: createdInvoices[1].id,
            work_order_id: createdWorkOrders[6].id,
            amount: 500.00,
            description: 'Facility inspection and reporting'
          },
          
          // Draft Invoice #3 (Cool Air) - Large multi work order
          {
            invoice_id: createdInvoices[2].id,
            work_order_id: createdWorkOrders[1].id,
            amount: 1200.00,
            description: 'HVAC filter replacement and system maintenance'
          },
          {
            invoice_id: createdInvoices[2].id,
            work_order_id: createdWorkOrders[3].id,
            amount: 800.00,
            description: 'Preventive maintenance and tune-up'
          },
          {
            invoice_id: createdInvoices[2].id,
            work_order_id: createdWorkOrders[7].id,
            amount: 800.00,
            description: 'Emergency HVAC response and repairs'
          },
          
          // Submitted Invoice #1 (Sparks) - Single work order
          {
            invoice_id: createdInvoices[3].id,
            work_order_id: createdWorkOrders[2].id,
            amount: 875.00,
            description: 'Electrical panel upgrade and code compliance'
          },
          
          // Submitted Invoice #2 (Pipes & More) - Multi work order
          {
            invoice_id: createdInvoices[4].id,
            work_order_id: createdWorkOrders[9].id,
            amount: 950.00,
            description: 'Major plumbing overhaul - Phase 1'
          },
          {
            invoice_id: createdInvoices[4].id,
            work_order_id: createdWorkOrders[0].id,
            amount: 500.00,
            description: 'Additional plumbing repairs and maintenance'
          },
          
          // Submitted Invoice #3 (Cool Air) - Multi work order
          {
            invoice_id: createdInvoices[5].id,
            work_order_id: createdWorkOrders[1].id,
            amount: 1800.00,
            description: 'HVAC system upgrade and optimization'
          },
          {
            invoice_id: createdInvoices[5].id,
            work_order_id: createdWorkOrders[3].id,
            amount: 1400.00,
            description: 'Preventive maintenance program implementation'
          },
          
          // Approved Invoice #1 (Fix-It) - Single work order
          {
            invoice_id: createdInvoices[6].id,
            work_order_id: createdWorkOrders[5].id,
            amount: 950.00,
            description: 'Complete facility maintenance and safety upgrades'
          },
          
          // Approved Invoice #2 (Sparks) - Multi work order
          {
            invoice_id: createdInvoices[7].id,
            work_order_id: createdWorkOrders[2].id,
            amount: 1200.00,
            description: 'Electrical system upgrade and panel installation'
          },
          {
            invoice_id: createdInvoices[7].id,
            work_order_id: createdWorkOrders[8].id,
            amount: 900.00,
            description: 'Secondary electrical work and testing'
          },
          
          // Paid Invoice #1 (Pipes & More) - Single work order
          {
            invoice_id: createdInvoices[8].id,
            work_order_id: createdWorkOrders[0].id,
            amount: 725.00,
            description: 'Emergency plumbing repair and water damage prevention'
          },
          
          // Paid Invoice #2 (Cool Air) - Large multi work order
          {
            invoice_id: createdInvoices[9].id,
            work_order_id: createdWorkOrders[1].id,
            amount: 1800.00,
            description: 'Complete HVAC system installation - Phase 1'
          },
          {
            invoice_id: createdInvoices[9].id,
            work_order_id: createdWorkOrders[3].id,
            amount: 1200.00,
            description: 'HVAC system installation - Phase 2'
          },
          {
            invoice_id: createdInvoices[9].id,
            work_order_id: createdWorkOrders[7].id,
            amount: 1200.00,
            description: 'HVAC system installation - Final phase and testing'
          }
        ];

        const { error: invoiceWOError } = await supabase
          .from('invoice_work_orders')
          .insert(comprehensiveInvoiceWorkOrders);

        if (invoiceWOError) {
          console.warn('Invoice work orders creation error:', invoiceWOError);
        } else {
          console.log(`✅ Created ${comprehensiveInvoiceWorkOrders.length} invoice work order relationships`);
          
          // Enhanced console logging with detailed breakdown
          const statusBreakdown = createdInvoices.reduce((breakdown, invoice) => {
            breakdown[invoice.status] = (breakdown[invoice.status] || 0) + 1;
            return breakdown;
          }, {});
          
          const totalAmount = createdInvoices.reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0);
          const avgAmount = totalAmount / createdInvoices.length;
          
          const multiWorkOrderInvoices = comprehensiveInvoiceWorkOrders.reduce((count, item) => {
            const invoiceId = item.invoice_id;
            const invoiceLineCount = comprehensiveInvoiceWorkOrders.filter(line => line.invoice_id === invoiceId).length;
            return invoiceLineCount > 1 ? count + 1 : count;
          }, 0) / 2; // Divide by 2 since multi-order invoices are counted multiple times
          
          const paidInvoices = createdInvoices.filter(inv => inv.status === 'paid');
          const paymentReferences = paidInvoices.map(inv => inv.payment_reference).filter(Boolean);
          
          console.log('   📊 Invoice Summary:');
          console.log(`   • Total Invoices: ${createdInvoices.length}`);
          Object.entries(statusBreakdown).forEach(([status, count]) => {
            console.log(`   • ${status.charAt(0).toUpperCase() + status.slice(1)}: ${count}`);
          });
          console.log(`   💰 Total Amount: $${totalAmount.toLocaleString()}`);
          console.log(`   📈 Average Invoice: $${avgAmount.toLocaleString()}`);
          console.log(`   📄 Single Work Order Invoices: ${createdInvoices.length - Math.floor(multiWorkOrderInvoices)}`);
          console.log(`   📋 Multi Work Order Invoices: ${Math.floor(multiWorkOrderInvoices)}`);
          console.log(`   💳 Payment References: ${paymentReferences.join(', ')}`);
          console.log(`   🔗 Total Line Items: ${comprehensiveInvoiceWorkOrders.length}`);
        }
      }
    }

    // 10. Create comprehensive employee receipts with allocations
    console.log('🧾 Creating comprehensive employee receipts...');
    
    // 6 comprehensive receipts: 2 materials, 2 equipment rental, 2 fuel/mileage
    const comprehensiveReceipts = [
      // Materials Receipts (2)
      {
        employee_user_id: userProfiles.get('senior@workorderpro.com')?.id, // David Wilson
        vendor_name: 'Home Depot',
        amount: 125.50,
        receipt_date: getRandomDate(2, 14), // Within past 2 weeks
        description: 'Building materials for plumbing project',
        notes: 'PVC pipes, fittings, and sealants for main line repair'
      },
      {
        employee_user_id: userProfiles.get('midlevel@workorderpro.com')?.id, // Jennifer Brown  
        vendor_name: 'Lowes',
        amount: 89.75,
        receipt_date: getRandomDate(1, 14),
        description: 'Electrical supplies for multiple work orders',
        notes: 'Wire nuts, electrical tape, outlet covers - split across projects'
      },
      
      // Equipment Rental Receipts (2)
      {
        employee_user_id: userProfiles.get('junior@workorderpro.com')?.id, // Alex Johnson
        vendor_name: 'United Rentals',
        amount: 275.00,
        receipt_date: getRandomDate(3, 12),
        description: 'Power tools rental for HVAC project',
        notes: 'Impact wrench and torque tools for ductwork installation'
      },
      {
        employee_user_id: userProfiles.get('admin@workorderpro.com')?.id, // Sarah Johnson (Admin)
        vendor_name: 'Equipment Express',
        amount: 450.00,
        receipt_date: getRandomDate(5, 10),
        description: 'Specialized equipment rental',
        notes: 'Pipe inspection camera and locating equipment - multi-project use'
      },
      
      // Fuel/Mileage Receipts (2)
      {
        employee_user_id: userProfiles.get('employee@workorderpro.com')?.id, // Emily Davis
        vendor_name: 'Shell Gas Station',
        amount: 67.80,
        receipt_date: getRandomDate(1, 7),
        description: 'Fuel for multiple site visits',
        notes: 'Travel between ABC Downtown Office and XYZ Tech Center locations'
      },
      {
        employee_user_id: userProfiles.get('senior@workorderpro.com')?.id, // David Wilson
        vendor_name: 'BP Station',
        amount: 52.25,
        receipt_date: getRandomDate(4, 11),
        description: 'Fuel for emergency job sites',
        notes: 'Emergency response travel to Premium Corporate Tower'
      }
    ];

    const { data: createdReceipts, error: receiptsError } = await supabase
      .from('receipts')
      .insert(comprehensiveReceipts)
      .select();

    if (receiptsError) {
      console.warn('Receipts creation error:', receiptsError);
    } else {
      // Create comprehensive receipt work order allocations
      if (createdReceipts && createdWorkOrders && createdReceipts.length > 0) {
        console.log('🔗 Creating receipt work order allocations...');
        
        const comprehensiveReceiptAllocations = [
          // Single allocations (3)
          {
            receipt_id: createdReceipts[0].id, // Home Depot materials
            work_order_id: createdWorkOrders[0].id, // Plumbing repair
            allocated_amount: 125.50,
            allocation_notes: 'Full amount for plumbing materials - main line repair'
          },
          {
            receipt_id: createdReceipts[2].id, // United Rentals tools
            work_order_id: createdWorkOrders[7].id, // Complex HVAC project
            allocated_amount: 275.00,
            allocation_notes: 'Power tools rental for HVAC ductwork installation'
          },
          {
            receipt_id: createdReceipts[5].id, // BP fuel (single)
            work_order_id: createdWorkOrders[8].id, // Electrical upgrade
            allocated_amount: 52.25,
            allocation_notes: 'Emergency response travel fuel'
          },
          
          // Split allocations (3 receipts with multiple work orders)
          
          // Lowes electrical supplies - split across 2 work orders
          {
            receipt_id: createdReceipts[1].id,
            work_order_id: createdWorkOrders[1].id, // Electrical panel upgrade
            allocated_amount: 55.25,
            allocation_notes: 'Electrical supplies for panel upgrade - wire nuts and outlets'
          },
          {
            receipt_id: createdReceipts[1].id,
            work_order_id: createdWorkOrders[8].id, // Electrical infrastructure
            allocated_amount: 34.50,
            allocation_notes: 'Electrical tape and covers for infrastructure work'
          },
          
          // Equipment Express rental - split across 3 work orders
          {
            receipt_id: createdReceipts[3].id,
            work_order_id: createdWorkOrders[0].id, // Plumbing repair
            allocated_amount: 180.00,
            allocation_notes: 'Pipe inspection camera for main line diagnostics'
          },
          {
            receipt_id: createdReceipts[3].id,
            work_order_id: createdWorkOrders[9].id, // Major plumbing overhaul
            allocated_amount: 200.00,
            allocation_notes: 'Pipe locating equipment for overhaul project'
          },
          {
            receipt_id: createdReceipts[3].id,
            work_order_id: createdWorkOrders[4].id, // Plumbing installation
            allocated_amount: 70.00,
            allocation_notes: 'Equipment rental for new installation verification'
          },
          
          // Shell fuel - split across 2 work orders
          {
            receipt_id: createdReceipts[4].id,
            work_order_id: createdWorkOrders[5].id, // Internal maintenance
            allocated_amount: 35.80,
            allocation_notes: 'Travel fuel for ABC Downtown Office visits'
          },
          {
            receipt_id: createdReceipts[4].id,
            work_order_id: createdWorkOrders[7].id, // Complex HVAC project
            allocated_amount: 32.00,
            allocation_notes: 'Travel fuel for XYZ Tech Center site visits'
          }
        ];

        const { error: allocationsError } = await supabase
          .from('receipt_work_orders')
          .insert(comprehensiveReceiptAllocations);

        if (allocationsError) {
          console.warn('Receipt allocations creation error:', allocationsError);
        } else {
          // Enhanced console logging with detailed breakdown
          const totalReceiptAmount = createdReceipts.reduce((sum, receipt) => sum + receipt.amount, 0);
          const receiptsByCategory = {
            materials: createdReceipts.slice(0, 2),
            equipment: createdReceipts.slice(2, 4), 
            fuel: createdReceipts.slice(4, 6)
          };
          
          const singleAllocations = comprehensiveReceiptAllocations.filter(alloc => 
            comprehensiveReceiptAllocations.filter(a => a.receipt_id === alloc.receipt_id).length === 1
          ).length;
          
          const splitAllocations = new Set(
            comprehensiveReceiptAllocations.filter(alloc => 
              comprehensiveReceiptAllocations.filter(a => a.receipt_id === alloc.receipt_id).length > 1
            ).map(alloc => alloc.receipt_id)
          ).size;
          
          console.log('✅ Comprehensive Receipt Summary:');
          console.log(`   📊 Total Receipts: ${createdReceipts.length}`);
          console.log(`   💰 Total Amount: $${totalReceiptAmount.toLocaleString()}`);
          console.log(`   📈 Average Receipt: $${(totalReceiptAmount / createdReceipts.length).toFixed(2)}`);
          console.log('   📂 By Category:');
          console.log(`   • Materials (Home Depot, Lowes): ${receiptsByCategory.materials.length} receipts, $${receiptsByCategory.materials.reduce((sum, r) => sum + r.amount, 0)}`);
          console.log(`   • Equipment Rental: ${receiptsByCategory.equipment.length} receipts, $${receiptsByCategory.equipment.reduce((sum, r) => sum + r.amount, 0)}`);
          console.log(`   • Fuel/Mileage: ${receiptsByCategory.fuel.length} receipts, $${receiptsByCategory.fuel.reduce((sum, r) => sum + r.amount, 0)}`);
          console.log('   🔗 Allocation Breakdown:');
          console.log(`   • Single Work Order: ${singleAllocations} allocations`);
          console.log(`   • Split Across Multiple: ${splitAllocations} receipts`);
          console.log(`   📋 Total Allocation Entries: ${comprehensiveReceiptAllocations.length}`);
          console.log('   📅 Date Range: Past 2 weeks');
          console.log('   👥 All 5 employees represented');
        }
      }
    }

    // 11. Create employee reports
    console.log('📊 Creating employee reports...');
    const employeeReports = [
      // Senior Employee (David) - 3 reports with overtime
      {
        employee_user_id: userProfiles.get('senior@workorderpro.com')?.id,
        work_order_id: createdWorkOrders?.[5]?.id, // Internal maintenance
        report_date: getRandomDate(2, 14),
        hours_worked: 10.5, // Overtime
        hourly_rate_snapshot: 75.00,
        total_labor_cost: 10.5 * 75.00,
        work_performed: 'Emergency HVAC system repair and diagnostic troubleshooting',
        notes: 'Worked extended hours due to critical system failure. Identified root cause and implemented permanent fix.'
      },
      {
        employee_user_id: userProfiles.get('senior@workorderpro.com')?.id,
        work_order_id: createdWorkOrders?.[7]?.id, // Complex HVAC project
        report_date: getRandomDate(3, 10),
        hours_worked: 6.0,
        hourly_rate_snapshot: 75.00,
        total_labor_cost: 6.0 * 75.00,
        work_performed: 'Project coordination and quality assurance for multi-zone HVAC installation',
        notes: 'Supervised subcontractor work and ensured compliance with building codes.'
      },
      {
        employee_user_id: userProfiles.get('senior@workorderpro.com')?.id,
        work_order_id: createdWorkOrders?.[8]?.id, // Electrical upgrade
        report_date: getRandomDate(5, 12),
        hours_worked: 8.0,
        hourly_rate_snapshot: 75.00,
        total_labor_cost: 8.0 * 75.00,
        work_performed: 'Electrical panel upgrade coordination and safety inspection',
        notes: 'Managed electrical contractor and performed final safety verification tests.'
      },
      
      // Mid-level Employee (Jennifer) - 2 reports
      {
        employee_user_id: userProfiles.get('midlevel@workorderpro.com')?.id,
        work_order_id: createdWorkOrders?.[6]?.id, // Facility inspection
        report_date: getRandomDate(1, 8),
        hours_worked: 4.5,
        hourly_rate_snapshot: 50.00,
        total_labor_cost: 4.5 * 50.00,
        work_performed: 'Comprehensive facility inspection and maintenance planning',
        notes: 'Identified several preventive maintenance opportunities and updated facility records.'
      },
      {
        employee_user_id: userProfiles.get('midlevel@workorderpro.com')?.id,
        work_order_id: createdWorkOrders?.[9]?.id, // Major plumbing overhaul
        report_date: getRandomDate(6, 13),
        hours_worked: 7.0,
        hourly_rate_snapshot: 50.00,
        total_labor_cost: 7.0 * 50.00,
        work_performed: 'Plumbing system assessment and project planning coordination',
        notes: 'Worked with plumbing contractor to develop phased replacement strategy.'
      },
      
      // Junior Employee (Alex) - 2 reports
      {
        employee_user_id: userProfiles.get('junior@workorderpro.com')?.id,
        work_order_id: createdWorkOrders?.[7]?.id, // Emergency response
        report_date: getRandomDate(4, 9),
        hours_worked: 3.0,
        hourly_rate_snapshot: 35.00,
        total_labor_cost: 3.0 * 35.00,
        work_performed: 'Emergency response support and documentation',
        notes: 'Assisted senior employee with emergency protocols and maintained incident log.'
      },
      {
        employee_user_id: userProfiles.get('junior@workorderpro.com')?.id,
        work_order_id: createdWorkOrders?.[1]?.id, // HVAC maintenance
        report_date: getRandomDate(7, 11),
        hours_worked: 5.5,
        hourly_rate_snapshot: 35.00,
        total_labor_cost: 5.5 * 35.00,
        work_performed: 'HVAC filter replacement and system maintenance learning',
        notes: 'Learned proper filter replacement procedures and updated maintenance schedules.'
      },
      
      // Emily Employee - 1 report
      {
        employee_user_id: userProfiles.get('employee@workorderpro.com')?.id,
        work_order_id: createdWorkOrders?.[0]?.id, // Plumbing repair
        report_date: getRandomDate(2, 6),
        hours_worked: 2.5,
        hourly_rate_snapshot: 55.00,
        total_labor_cost: 2.5 * 55.00,
        work_performed: 'Project coordination and client communication',
        notes: 'Coordinated with subcontractor and provided project updates to client.'
      }
    ];

    if (createdWorkOrders && createdWorkOrders.length > 0) {
      const { error: empReportsError } = await supabase
        .from('employee_reports')
        .insert(employeeReports);

      if (empReportsError) {
        console.warn('Employee reports creation error:', empReportsError);
      } else {
        // Calculate totals for logging
        const totalHours = employeeReports.reduce((sum, report) => sum + report.hours_worked, 0);
        const totalCost = employeeReports.reduce((sum, report) => sum + (report.total_labor_cost || 0), 0);
        const overtimeReports = employeeReports.filter(report => report.hours_worked > 8).length;
        
        console.log(`✅ Created ${employeeReports.length} employee reports`);
        console.log(`   💰 Total Hours Tracked: ${totalHours} hours`);
        console.log(`   💵 Total Labor Cost: $${totalCost.toLocaleString()}`);
        console.log(`   ⏰ Overtime Reports: ${overtimeReports}`);
        console.log(`   📅 Date Range: Past 2 weeks`);
        
        // Employee breakdown
        const employeeBreakdown = employeeReports.reduce((breakdown, report) => {
          const email = Object.entries(userProfiles.entries()).find(([_, profile]) => 
            profile?.id === report.employee_user_id
          )?.[0] || 'Unknown';
          
          if (!breakdown[email]) {
            breakdown[email] = { reports: 0, hours: 0, cost: 0, rate: report.hourly_rate_snapshot };
          }
          breakdown[email].reports++;
          breakdown[email].hours += report.hours_worked;
          breakdown[email].cost += report.total_labor_cost || 0;
          return breakdown;
        }, {});
        
        console.log('   👥 Employee Breakdown:');
        Object.entries(employeeBreakdown).forEach(([email, data]: [string, any]) => {
          console.log(`      ${email}: ${data.reports} reports, ${data.hours}h @ $${data.rate}/hr = $${data.cost.toLocaleString()}`);
        });
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